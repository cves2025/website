import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  DocumentData,
  where,
} from "firebase/firestore";
import { CLASSES, COLLECTION, SECTIONS } from "../../../constants";
import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toDateOrNull } from "../../../utils/toDateOrNull";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { ExamCategory, marksSchemeFromDoc } from "../../../utils/examMarksScheme";
import {
  compareClassNames,
  computeRanks,
  formatMarks,
  isMarksDocComplete,
  type SubjectColumnDefMap,
} from "../../../utils/marks";
import { getExamSheet, loadMarksForExam } from "../../../utils/marksService";
import { deriveRollNumbers } from "../../../utils/rollNumber";
import { useExamRules } from "../../../hooks/useExamRules";
import type {
  ExamDoc,
  ExamSheetDoc,
  ExamSheetSubjectColumn,
  MarksDoc,
  SubjectComponentName,
  SubjectMarksRecord,
} from "../../../utils/type";
import PageHeader from "../../../custom-components/PageHeader";
import Button from "../../../custom-components/Button";

const academicYears = generateAcademicYears();

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

/**
 * Print CSS rendered ONLY by this page: A4 landscape + official-register cell
 * borders and a compact print font. The global portrait @page rule in index.css
 * (used by the Admit Card print) is left untouched - this style tag never
 * exists on the admit card pages, so their print output stays identical.
 */
const CROSS_LIST_PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  .cross-list-register { font-size: 10px; }
  .cross-list-register th,
  .cross-list-register td { padding: 2px 4px; }
}
.cross-list-register th,
.cross-list-register td { border: 1px solid #d1d5db; }
.cross-list-register thead th { border-color: #4b5563; }
`;

/** Draft row of the register: a saved marks doc, or an enrolled student without one. */
interface CrossListRow {
  studentUid: string;
  rollNumber: number | null;
  admissionNumber: string;
  studentName: string;
  fatherName: string;
  doc: MarksDoc | null;
}

/** One printable table block: a class + section with its rows and columns. */
interface ClassSectionBlock {
  className: string;
  section: string;
  rows: CrossListRow[];
  /** Frozen examSheet for the exam + class, or null when known missing/fetching. */
  sheet: ExamSheetDoc | null;
  /** True while the examSheet lookup for this class is still in flight. */
  sheetLoading: boolean;
  /** Current SubjectDoc fallback columns when no examSheet exists. */
  fallbackSubjects: ExamSheetSubjectColumn[];
}

/** Active enrollment snapshot of the selected session (rolls + missing rows). */
interface LoadedEnrollment {
  studentUid: string;
  admissionNumber: string;
  studentName: string;
  fatherName: string;
  className: string;
  section: string;
}

/**
 * The layout rule of the cross list subject columns - the ONE place to change
 * how columns are presented:
 *  - Unit Test / PG-UKG            : one "total" column per subject,
 *  - Main Exam without practical   : one "total" column per subject,
 *  - Main Exam practical paper     : one "practical" column (the theory part
 *                                    lives on the parent subject's column),
 *  - Scholastic (grade) subjects   : one grade column, after the numeric ones.
 */
interface CrossListColumnGroup {
  subjectId: string;
  name: string;
  /** Subject type (e.g. "Theory", "Written", "Practical") shown under the name. */
  type: string;
  isGrade: boolean;
  split: boolean;
}

function buildCrossListGroups(
  examCategory: ExamCategory | null,
  sheetSubjects: readonly ExamSheetSubjectColumn[]
): CrossListColumnGroup[] {
  const numeric: CrossListColumnGroup[] = [];
  const grades: CrossListColumnGroup[] = [];
  sheetSubjects.forEach((subject) => {
    if (subject.isGrade) {
      grades.push({
        subjectId: subject.id,
        name: subject.name,
        type: subject.type,
        isGrade: true,
        split: false,
      });
      return;
    }
    numeric.push({
      subjectId: subject.id,
      name: subject.name,
      type: subject.type,
      isGrade: false,
      split:
        examCategory === "MAIN_EXAM" &&
        typeof subject.componentMax?.practical === "number",
    });
  });
  return [...numeric, ...grades];
}

/** Completeness column definitions, derived from the snapshot's componentMax. */
function buildColumnDefs(
  sheetSubjects: readonly ExamSheetSubjectColumn[]
): SubjectColumnDefMap {
  const defs: SubjectColumnDefMap = {};
  sheetSubjects.forEach((subject) => {
    defs[subject.id] = {
      components: subject.componentMax
        ? (Object.keys(subject.componentMax) as SubjectComponentName[])
        : [],
      isGrade: subject.isGrade,
    };
  });
  return defs;
}

/** Text of one register cell of a subject (or "-" when no marks). */
function toDateInputValue(value: unknown): string {
  const date = toDateOrNull(value);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function toExamCategory(value: unknown): ExamCategory {
  return value === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
}

function toExamDoc(snapshot: QueryDocumentSnapshot<DocumentData>): ExamDoc {
  const data = snapshot.data();
  const maxMarks = typeof data.maxMarks === "number" ? data.maxMarks : 0;
  return {
    id: snapshot.id,
    examName: typeof data.examName === "string" ? data.examName : "",
    examCategory: toExamCategory(data.examCategory),
    academicYear:
      typeof data.academicYear === "string" ? data.academicYear : "",
    maxMarks,
    marksScheme: marksSchemeFromDoc(data, maxMarks || undefined),
    applicableClasses: Array.isArray(data.applicableClasses)
      ? data.applicableClasses.filter(
          (cls): cls is string => typeof cls === "string"
        )
      : [],
    examStartDate: toDateInputValue(data.examStartDate),
    examEndDate: toDateInputValue(data.examEndDate),
    status: toExamStatus(data.status),
  };
}

function toExamStatus(value: unknown): "active" | "archived" {
  return value === "archived" ? "archived" : "active";
}

/**
 * Position of a class in the CLASSES constant (PG, Nursery, ..., 8). Classes
 * missing from that list fall back to a natural, numeric-aware comparison so
 * e.g. "10" still sorts after "9".
 */
function classOrderIndex(className: string): number {
  const index = CLASSES.indexOf(className.trim());
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function compareClassSections(
  a: { className: string; section: string },
  b: { className: string; section: string }
): number {
  return (
    classOrderIndex(a.className) - classOrderIndex(b.className) ||
    a.section.localeCompare(b.section) ||
    compareClassNames(a.className, b.className)
  );
}

/** Rows of a block: displayed roll ascending, then student name. */
function sortDocumentRows(rows: CrossListRow[]): CrossListRow[] {
  return [...rows].sort((a, b) => {
    const rollA = a.rollNumber ?? Number.MAX_SAFE_INTEGER;
    const rollB = b.rollNumber ?? Number.MAX_SAFE_INTEGER;
    return (
      rollA - rollB ||
      a.studentName.localeCompare(b.studentName) ||
      a.studentUid.localeCompare(b.studentUid)
    );
  });
}

const SUBJECTS_PER_CLASS_QUERY = (className: string) =>
  query(collection(db, COLLECTION.SUBJECTS), where("className", "==", className));

/** Current non-hidden subjects of a class, shaped like examSheet columns. */
async function fetchFallbackSubjects(className: string): Promise<ExamSheetSubjectColumn[]> {
  const snapshot = await getDocs(SUBJECTS_PER_CLASS_QUERY(className));
  return snapshot.docs
    .map((documentSnapshot) => {
      const data = documentSnapshot.data();
      if (data.displayInMarksEntry === false) return null;
      const name = typeof data.name === "string" ? data.name : "";
      if (!name) return null;
      return {
        id: documentSnapshot.id,
        name,
        type: typeof data.type === "string" ? data.type : "",
        order: typeof data.order === "number" ? data.order : 1,
        maxMarks: 0,
        isGrade: data.type === "Scholastic",
      };
    })
    .filter((column): column is ExamSheetSubjectColumn => column !== null)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** Text of one register cell of a subject (or "-" when no marks). */
function subjectCellText(
  record: SubjectMarksRecord | undefined,
  part: "total" | "theory" | "practical" | "grade"
): string {
  if (!record) return "-";
  const grade = typeof record.grade === "string" ? record.grade.trim() : "";
  if (grade !== "") return grade;
  if (record.status === "absent") return "AB";
  if (record.status === "exempt") return "EX";
  if (part === "grade") return "-";
  if (part === "theory" || part === "practical") {
    const value = record.components?.[part];
    return value === null || value === undefined ? "-" : formatMarks(value);
  }
  return record.obtained === null ? "-" : formatMarks(record.obtained);
}

function CrossList() {
  const { rules, loading: rulesLoading, error: rulesError, reload: reloadRules } =
    useExamRules();
  /** Rules change (from the Settings page) -> marks are re-fetched under them. */
  const rulesKey = `${rules.rankScope}|${rules.passMode}|${rules.totalPassPercentage}|${rules.subjectPassPercentage}`;

  // Newest academic year first (e.g. 2026-27), so the current session is
  // pre-selected by default.
  const [session, setSession] = useState(academicYears[0]?.value ?? "");
  const [examId, setExamId] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");

  const [allExams, setAllExams] = useState<ExamDoc[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  /** Marks cached per `${session}|${examId}` so filter changes never refetch. */
  const [marksByExam, setMarksByExam] = useState<Record<string, MarksDoc[]>>({});
  const [currentMarks, setCurrentMarks] = useState<MarksDoc[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  /** Exam sheets cached per class (null = known to not exist yet). */
  const [sheetsByClass, setSheetsByClass] = useState<
    Record<string, ExamSheetDoc | null>
  >({});
  /** Fallback subject columns cached per class (no examSheet for that class). */
  const [fallbackByClass, setFallbackByClass] = useState<
    Record<string, ExamSheetSubjectColumn[]>
  >({});
  /** Session enrollments cached per `${session}`; the Refresh button clears it. */
  const [enrollmentsBySession, setEnrollmentsBySession] = useState<
    Record<string, LoadedEnrollment[]>
  >({});
  /** Enrollments of the currently selected session (active students only). */
  const [currentEnrollments, setCurrentEnrollments] = useState<
    LoadedEnrollment[]
  >([]);

  // Exams load once (whole collection, ordered by sequence like the other
  // exam pages - no composite index needed) and are filtered client-side.
  useEffect(() => {
    const examsQuery = query(
      collection(db, COLLECTION.EXAMS),
      orderBy("sequence", "asc")
    );
    let cancelled = false;
    getDocs(examsQuery)
      .then((snapshot) => {
        if (cancelled) return;
        setAllExams(snapshot.docs.map(toExamDoc));
        setLoadingExams(false);
      })
      .catch((error) => {
        console.error("Failed to load exams:", error);
        setLoadingExams(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionExams = useMemo(
    () => allExams.filter((exam) => exam.academicYear === session),
    [allExams, session]
  );
  const selectedExam = sessionExams.find((exam) => exam.id === examId) ?? null;

  const readyToLoad = Boolean(session && examId);

  // Marks load once per ${session}|${examId}|${rules} and stay cached; the
  // Refresh button drops the cache entry and bumps the nonce to force a
  // refetch. A rules change also changes the cache key, so results are always
  // re-normalized under the rules that are currently active.
  useEffect(() => {
    if (!readyToLoad) {
      setCurrentMarks([]);
      setLoadingMarks(false);
      return;
    }
    const key = `${session}|${examId}|${rulesKey}`;
    if (marksByExam[key]) {
      setCurrentMarks(marksByExam[key]);
      setLoadingMarks(false);
      setLoadError("");
      return;
    }
    let cancelled = false;
    setCurrentMarks([]);
    setLoadingMarks(true);
    setLoadError("");
    loadMarksForExam(session, examId, undefined, undefined, rules)
      .then((docs) => {
        if (cancelled) return;
        setMarksByExam((prev) => ({ ...prev, [key]: docs }));
        setCurrentMarks(docs);
        setLoadingMarks(false);
      })
      .catch((error) => {
        console.error("Failed to load marks:", error);
        if (cancelled) return;
        setLoadError("Could not load the marks. Please try again.");
        setLoadingMarks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [readyToLoad, session, examId, rulesKey, rules, marksByExam, refreshNonce]);

  const handleRefresh = () => {
    if (!readyToLoad) return;
    const key = `${session}|${examId}|${rulesKey}`;
    setMarksByExam((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    // Rolls come from the session roster, so refresh it too.
    setEnrollmentsBySession((prev) => {
      const next = { ...prev };
      delete next[session];
      return next;
    });
    setRefreshNonce((value) => value + 1);
  };

  // Client-side class / section filtering - never triggers a refetch.
  const filteredMarks = useMemo(
    () =>
      currentMarks.filter(
        (marks) =>
          (selectedClass === "all" || marks.className === selectedClass) &&
          (selectedSection === "all" || marks.section === selectedSection)
      ),
    [currentMarks, selectedClass, selectedSection]
  );

  const blockClasses = useMemo(() => {
    const classes = new Set<string>();
    filteredMarks.forEach((marks) => classes.add(marks.className));
    if (selectedClass !== "all") classes.add(selectedClass);
    return Array.from(classes);
  }, [filteredMarks, selectedClass]);

  // Load one examSheet snapshot per class of the current view (cached).
  useEffect(() => {
    if (!readyToLoad) return;
    let cancelled = false;
    blockClasses.forEach((className) => {
      if (className in sheetsByClass) return;
      void getExamSheet(session, examId, className)
        .then((sheet) => {
          if (cancelled) return;
          setSheetsByClass((prev) => {
            if (className in prev) return prev;
            return { ...prev, [className]: sheet };
          });
        })
        .catch((error) => {
          console.error("Failed to load exam sheet:", error);
          if (cancelled) return;
          setSheetsByClass((prev) => {
            if (className in prev) return prev;
            return { ...prev, [className]: null };
          });
        });
    });
    return () => {
      cancelled = true;
    };
  }, [readyToLoad, session, examId, blockClasses, sheetsByClass]);

  // Fallback: the current Subjects of a class when no examSheet exists yet.
  useEffect(() => {
    if (!readyToLoad) return;
    blockClasses.forEach((className) => {
      if (!(className in sheetsByClass)) return; // sheet lookup still pending
      if (sheetsByClass[className] !== null) return; // frozen sheet exists
      if (className in fallbackByClass) return;
      void fetchFallbackSubjects(className)
        .then((columns) => {
          setFallbackByClass((prev) =>
            className in prev ? prev : { ...prev, [className]: columns }
          );
        })
        .catch((error) => {
          console.error("Failed to load fallback subjects:", error);
          setFallbackByClass((prev) =>
            className in prev ? prev : { ...prev, [className]: [] }
          );
        });
    });
  }, [readyToLoad, blockClasses, sheetsByClass, fallbackByClass]);

  // Enrollments of the selected session load ONCE (equality filter on
  // academicYear only) and are cached per session together with the exam data.
  // They drive the live roll numbers of every row and the "Marks not entered"
  // rows; the class/section filters are applied client-side below, so picking
  // a class never triggers another enrollment query. Refresh clears the cache.
  useEffect(() => {
    if (!readyToLoad) {
      setCurrentEnrollments([]);
      return;
    }
    if (enrollmentsBySession[session]) {
      setCurrentEnrollments(enrollmentsBySession[session]);
      return;
    }
    let cancelled = false;
    getDocs(
      query(
        collection(db, COLLECTION.ENROLLMENTS),
        where("academicYear", "==", session)
      )
    )
      .then((snapshot) => {
        if (cancelled) return;
        const rows = snapshot.docs
          .map((documentSnapshot) => {
            const data = documentSnapshot.data();
            if (data.isDeleted === true) return null;
            const studentUid =
              typeof data.studentId === "string" ? data.studentId : "";
            if (!studentUid) return null;
            return {
              studentUid,
              admissionNumber: String(data.enrollment ?? "").trim(),
              studentName:
                typeof data.studentName === "string" ? data.studentName : "",
              fatherName:
                typeof data.fatherName === "string" ? data.fatherName : "",
              className:
                typeof data.className === "string" ? data.className : "",
              section: typeof data.section === "string" ? data.section : "",
            };
          })
          .filter((row): row is LoadedEnrollment => row !== null);
        setEnrollmentsBySession((prev) => ({ ...prev, [session]: rows }));
        setCurrentEnrollments(rows);
      })
      .catch((error) => {
        console.error("Failed to load enrollments:", error);
        if (!cancelled) setCurrentEnrollments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [readyToLoad, session, enrollmentsBySession, refreshNonce]);

  // Live roll numbers derived from the session roster exactly like the marks
  // entry screen (per class: section, then admission number).
  const rollsByStudent = useMemo(
    () => deriveRollNumbers(currentEnrollments),
    [currentEnrollments]
  );

  // Build the class-section blocks of the current view. Class order follows
  // the CLASSES constant, sections are alphabetical, rows sort by roll number
  // then student name; students without a marks doc are appended (only when a
  // specific class is selected, still from the already loaded enrollment list).
  const blocks = useMemo<ClassSectionBlock[]>(() => {
    const byKey = new Map<
      string,
      { className: string; section: string; rows: CrossListRow[] }
    >();
    filteredMarks.forEach((marks) => {
      const key = `${marks.className}::${marks.section}`;
      const entry = byKey.get(key) ?? {
        className: marks.className,
        section: marks.section,
        rows: [],
      };
      entry.rows.push({
        studentUid: marks.studentUid,
        // Live roll from the roster; the stored rollNumber is only a fallback
        // for students who left the class (deleted / no longer enrolled).
        rollNumber: rollsByStudent.get(marks.studentUid) ?? marks.rollNumber,
        admissionNumber: marks.admissionNumber,
        studentName: marks.studentName,
        fatherName: marks.fatherName,
        doc: marks,
      });
      byKey.set(key, entry);
    });

    if (selectedClass !== "all") {
      currentEnrollments
        .filter(
          (student) =>
            student.className === selectedClass &&
            (selectedSection === "all" || student.section === selectedSection)
        )
        .forEach((student) => {
          const key = `${selectedClass}::${student.section}`;
          const entry = byKey.get(key) ?? {
            className: selectedClass,
            section: student.section,
            rows: [],
          };
          const exists = entry.rows.some(
            (row) => row.studentUid === student.studentUid
          );
          if (!exists) {
            entry.rows.push({
              studentUid: student.studentUid,
              rollNumber: rollsByStudent.get(student.studentUid) ?? null,
              admissionNumber: student.admissionNumber,
              studentName: student.studentName,
              fatherName: student.fatherName,
              doc: null,
            });
          }
          byKey.set(key, entry);
        });
    }

    return Array.from(byKey.values())
      .sort(compareClassSections)
      .map((entry) => ({
        className: entry.className,
        section: entry.section,
        rows: sortDocumentRows(entry.rows),
        sheet: sheetsByClass[entry.className] ?? null,
        sheetLoading: !(entry.className in sheetsByClass),
        fallbackSubjects: fallbackByClass[entry.className] ?? [],
      }))
      .filter((block) => block.rows.length > 0);
  }, [
    filteredMarks,
    currentEnrollments,
    rollsByStudent,
    selectedClass,
    selectedSection,
    sheetsByClass,
    fallbackByClass,
  ]);

  // Class-wide ranks, used when rankScope is "class". They are computed over
  // ALL complete rows of the same class from the FULL loaded exam data (before
  // the class/section filters), so filtering never changes anyone's rank.
  const classWideRanks = useMemo<Record<string, number>>(() => {
    const ranks: Record<string, number> = {};
    const byClass = new Map<string, MarksDoc[]>();
    currentMarks.forEach((marks) => {
      const list = byClass.get(marks.className) ?? [];
      list.push(marks);
      byClass.set(marks.className, list);
    });
    byClass.forEach((docs, className) => {
      const sheetSubjects =
        sheetsByClass[className]?.subjects ?? fallbackByClass[className] ?? [];
      const columnDefs = buildColumnDefs(sheetSubjects);
      const completeRows = docs.filter((doc) =>
        isMarksDocComplete(doc, columnDefs)
      );
      Object.assign(
        ranks,
        computeRanks(
          completeRows.map((doc) => ({
            studentUid: doc.studentUid,
            totalMarks: doc.totalMarks,
          }))
        )
      );
    });
    return ranks;
  }, [currentMarks, sheetsByClass, fallbackByClass]);

  // Per-student ranks shared across every block of this view. Only COMPLETE
  // rows take part: incomplete rows (isMarksDocComplete false or a missing
  // marks doc) never receive a rank and always show "-" in the Rank column.
  // Failed students keep their computed rank but the column still shows "-".
  const ranksByStudent = useMemo(() => {
    if (rules.rankScope === "class") return classWideRanks;
    const ranks: Record<string, number> = {};
    blocks.forEach((block) => {
      const sheetSubjects = block.sheet
        ? block.sheet.subjects
        : block.fallbackSubjects;
      const columnDefs = buildColumnDefs(sheetSubjects);
      const completeRows = block.rows.filter(
        (row): row is CrossListRow & { doc: MarksDoc } =>
          row.doc !== null && isMarksDocComplete(row.doc, columnDefs)
      );
      Object.assign(
        ranks,
        computeRanks(
          completeRows.map((row) => ({
            studentUid: row.studentUid,
            totalMarks: row.doc.totalMarks,
          }))
        )
      );
    });
    return ranks;
  }, [blocks, rules.rankScope, classWideRanks]);

  // Rank column header and the small rules line shown under every block
  // heading (visible on screen and in print).
  const rankLabel =
    rules.rankScope === "class" ? "Rank (Class)" : "Rank (Section)";
  const rankRuleText =
    rules.rankScope === "class" ? "Rank: Class-wise" : "Rank: Section-wise";
  const passRuleText =
    rules.passMode === "subject"
      ? `Pass: each subject >= ${formatMarks(rules.subjectPassPercentage)}%`
      : `Pass: Total >= ${formatMarks(rules.totalPassPercentage)}%`;
  const rulesSummary = `${rankRuleText} | ${passRuleText}`;

  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <style>{CROSS_LIST_PRINT_CSS}</style>

      <div className="print:hidden">
        <PageHeader
          title="Cross List"
          titleStyle="text-primaryBlue"
          description="Class result register grouped by class and section for the selected exam."
          descriptionStyle="text-gray-500"
          button={
            <div className="flex items-center gap-2">
              <Button
                buttonName="Refresh"
                variant="outline"
                size="sm"
                disabled={!readyToLoad}
                onClick={handleRefresh}
              />
              <Button
                buttonName="Print"
                variant="primary"
                size="sm"
                disabled={
                  !readyToLoad ||
                  blocks.length === 0 ||
                  rulesLoading ||
                  Boolean(rulesError)
                }
                onClick={() => window.print()}
              />
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 border border-gray-200 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <div>
          <label
            htmlFor="crossListSession"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Session
          </label>
          <select
            id="crossListSession"
            value={session}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              setSession(event.target.value);
              setExamId("");
            }}
            className={inputClass}
          >
            <option value="">Select Session</option>
            {academicYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="crossListExam"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Exam
          </label>
          <select
            id="crossListExam"
            value={examId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setExamId(event.target.value)
            }
            disabled={!session || loadingExams}
            className={inputClass}
          >
            <option value="">Select Exam</option>
            {sessionExams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.examName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="crossListClass"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Class
          </label>
          <select
            id="crossListClass"
            value={selectedClass}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setSelectedClass(event.target.value)
            }
            className={inputClass}
          >
            <option value="all">All Classes</option>
            {CLASSES.map((className) => (
              <option key={className} value={className}>
                {toOrdinalLabel(className)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="crossListSection"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Section
          </label>
          <select
            id="crossListSection"
            value={selectedSection}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setSelectedSection(event.target.value)
            }
            className={inputClass}
          >
            <option value="all">All Sections</option>
            {SECTIONS.map((section) => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rulesError && (
        <div
          className="flex items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 print:hidden"
          role="alert"
        >
          <span>{rulesError}</span>
          <Button
            buttonName="Retry"
            variant="outline"
            size="sm"
            onClick={reloadRules}
          />
        </div>
      )}

      {!readyToLoad ? (
        <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          Select a session and an exam to load the cross list.
        </div>
      ) : rulesLoading ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Loading exam settings...
        </div>
      ) : loadingMarks && currentMarks.length === 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Loading marks...
        </div>
      ) : loadError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <Button
            buttonName="Retry"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          />
        </div>
      ) : blocks.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No marks found for this exam
        </div>
      ) : (
        <div className="flex flex-col gap-4 print:gap-0">
          {blocks.map((block) => (
            <CrossListBlock
              key={`${block.className}::${block.section}`}
              block={block}
              examName={selectedExam?.examName ?? ""}
              session={session}
              examCategory={selectedExam?.examCategory ?? null}
              ranks={ranksByStudent}
              rankLabel={rankLabel}
              rulesSummary={rulesSummary}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** One class-section register block: heading, warnings and the marks table. */
function CrossListBlock({
  block,
  examName,
  session,
  examCategory,
  ranks,
  rankLabel,
  rulesSummary,
}: {
  block: ClassSectionBlock;
  examName: string;
  session: string;
  examCategory: ExamCategory | null;
  ranks: Record<string, number>;
  rankLabel: string;
  rulesSummary: string;
}) {
  const sheetSubjects = block.sheet ? block.sheet.subjects : block.fallbackSubjects;
  const groups = buildCrossListGroups(examCategory, sheetSubjects);
  const columnDefs = buildColumnDefs(sheetSubjects);

  const incompleteCount = block.rows.filter(
    (row) => row.doc === null || !isMarksDocComplete(row.doc, columnDefs)
  ).length;
  const showFallbackWarning = block.sheet === null && !block.sheetLoading;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white print:break-after-page print:last:break-after-auto">
      {/* Print-only register header: school name + exam/session/class/section. */}
      <div className="hidden print:block mb-2 text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide text-gray-900">
          Children's Valley English School
        </h1>
        <p className="text-xs text-gray-800">
          {examName} • Session {session} • Class{" "}
          {toOrdinalLabel(block.className)}
          {block.section ? ` - Section ${block.section}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-200 px-4 py-2">
        <h3 className="font-bold text-gray-800">
          Class {toOrdinalLabel(block.className)}
          {block.section ? ` • Section ${block.section}` : ""}
        </h3>
        <span className="text-xs text-gray-500">
          {examName} • {session}
        </span>
        <span className="ml-auto text-xs text-gray-500">
          {block.rows.length} student(s)
        </span>
      </div>
      <p className="border-b border-gray-100 px-4 pb-2 text-[10px] text-gray-400">
        {rulesSummary}
      </p>

      {incompleteCount > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-800">
          {incompleteCount} incomplete
        </div>
      )}
      {showFallbackWarning && (
        <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-1.5 text-xs font-semibold text-yellow-800">
          Subject columns are not frozen yet (no exam sheet exists for this exam
          and class).
        </div>
      )}

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-sm min-w-[900px] cross-list-register print:min-w-0">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="sticky left-0 z-20 w-16 px-2 py-2 text-center print:static print:left-auto print:z-auto">
                Roll No
              </th>
              <th className="w-24 px-2 py-2 text-center whitespace-nowrap">
                Adm. No
              </th>
              <th className="sticky left-16 z-20 w-44 px-2 py-2 text-left print:static print:left-auto print:z-auto">
                Student Name
              </th>
              <th className="min-w-[9rem] px-2 py-2 text-left">Father Name</th>
              {groups.map((group) => (
                <th
                  key={group.subjectId}
                  className="px-2 py-2 text-center whitespace-nowrap"
                >
                  {group.name}
                  {group.type && (
                    <span className="block text-[10px] text-blue-200 whitespace-nowrap">
                      {group.type}
                    </span>
                  )}
                </th>
              ))}
              <th className="px-2 py-2 text-center">Total</th>
              <th className="px-2 py-2 text-center">Max</th>
              <th className="px-2 py-2 text-center">Percentage</th>
              <th className="px-2 py-2 text-center">Result</th>
              <th className="px-2 py-2 text-center">{rankLabel}</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, index) => {
              const rowBg = index % 2 ? "bg-gray-50" : "bg-white";
              const incomplete =
                row.doc === null || !isMarksDocComplete(row.doc, columnDefs);
              const stickyBg = incomplete ? "bg-amber-50" : rowBg;
              const failed = row.doc?.result === "fail";
              const rank = row.doc ? ranks[row.studentUid] : undefined;
              return (
                <tr
                  key={row.studentUid}
                  className={incomplete ? "bg-amber-50" : rowBg}
                >
                  <td
                    className={`sticky left-0 z-10 px-2 py-1.5 text-center whitespace-nowrap print:static print:left-auto print:z-auto ${stickyBg}`}
                  >
                    {row.rollNumber && row.rollNumber > 0 ? row.rollNumber : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    {row.admissionNumber || "-"}
                  </td>
                  <td
                    className={`sticky left-16 z-10 px-2 py-1.5 whitespace-nowrap print:static print:left-auto print:z-auto ${stickyBg}`}
                  >
                    <span>{row.studentName}</span>
                    {incomplete && (
                      <span className="ml-1.5 rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold uppercase text-red-700">
                        Incomplete
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {row.fatherName}
                  </td>
                  {groups.map((group) => {
                    const record = row.doc?.subjectMarks[group.subjectId];
                    // Practical-type subjects (classes 1-8 Main Exams) keep ONE
                    // column showing only the practical marks; the theory part
                    // lives on the parent subject's own column.
                    const part: "total" | "practical" | "grade" =
                      group.isGrade
                        ? "grade"
                        : group.split
                          ? "practical"
                          : "total";
                    return (
                      <td
                        key={group.subjectId}
                        className="px-2 py-1.5 text-center"
                      >
                        {subjectCellText(record, part)}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center">
                    {row.doc ? formatMarks(row.doc.totalMarks) : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {row.doc ? formatMarks(row.doc.totalMaxMarks) : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    {row.doc ? (
                      `${formatMarks(row.doc.percentage)}%`
                    ) : (
                      <span className="font-semibold text-amber-700">
                        Marks not entered
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {row.doc && !incomplete ? (
                      failed ? (
                        <span className="font-semibold text-red-600">
                          Fail
                        </span>
                      ) : (
                        <span className="font-semibold text-green-600">
                          Pass
                        </span>
                      )
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {row.doc ? (failed ? "-" : String(rank ?? "-")) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Print-only signature line. */}
      <div className="hidden print:flex mt-8 items-end justify-between px-10 text-xs">
        <p className="w-44 border-t border-gray-800 pt-1 text-center">
          Class Teacher
        </p>
        <p className="w-44 border-t border-gray-800 pt-1 text-center">
          Principal
        </p>
      </div>
    </div>
  );
}

export default CrossList;