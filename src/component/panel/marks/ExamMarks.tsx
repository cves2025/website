import {
  ChangeEvent,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  collection,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { CLASSES, COLLECTION, SECTIONS } from "../../../constants";
import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { compareRollStudents, deriveRollNumbers } from "../../../utils/rollNumber";
import { toDateOrNull } from "../../../utils/toDateOrNull";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import {
  ExamCategory,
  isSchemeClass,
  marksSchemeFromDoc,
  subjectMarksBreakdown,
} from "../../../utils/examMarksScheme";
import { useExamRules } from "../../../hooks/useExamRules";
import type { ExamRules } from "../../../utils/examRules";
import {
  buildExamSheetId,
  buildMarksDocId,
  calculateMarksSummary,
  formatMarks,
  listLegacySubjectKeys,
  normalizeLegacyMarksDoc,
  round2,
} from "../../../utils/marks";
import {
  ensureExamSheet,
  saveStudentMarks,
  type ExamSheetSubjectInput,
  type MarksRowSnapshot,
} from "../../../utils/marksService";
import {
  ExamDoc,
  MarksData,
  MarksDoc,
  SubjectComponentName,
  SubjectMarksRecord,
} from "../../../utils/type";
import PageHeader from "../../../custom-components/PageHeader";
import Modal from "../../../custom-components/Modal";
import Button from "../../../custom-components/Button";
import { myContext } from "../../context/MyContextProvider";
import {
  NO_SCOPE,
  PERMISSIONS,
  scopedClasses,
  scopedSections,
  subjectAccess,
  type SubjectAccess,
} from "../../../permissions";

const academicYears = generateAcademicYears();

const AUTO_SAVE_DELAY = 600;

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

const marksInputClass =
  "w-20 rounded-md border border-gray-300 bg-white px-1.5 py-1.5 text-center text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

/** Read-only cells (subjects of other teachers, or no marks.enter permission). */
const readOnlyInputClass = "!bg-gray-100 !text-gray-500 cursor-not-allowed";

/** Extra classes applied to a cell whose draft does not parse to a valid value. */
const invalidInputClass =
  "border-red-500 focus:ring-red-500/40 focus:border-red-500";

const GRADE_OPTIONS = ["A+", "A", "B+", "B", "C+", "C", "D", "E", "F"];

/** Draft keys: one per component input (or grade) of every subject cell. */
const CELL_KEY = {
  component: (
    studentUid: string,
    subjectId: string,
    component: SubjectComponentName | null
  ): string => `${studentUid}::${subjectId}::${component ?? "marks"}`,
  grade: (studentUid: string, subjectId: string): string =>
    `${studentUid}::${subjectId}::grade`,
};

interface MarksRowStudent {
  studentUid: string;
  admissionNumber: string;
  studentName: string;
  fatherName: string;
  section: string;
}

/** One input of a subject column: a single component, or the whole total. */
interface MarksComponentInput {
  /** Component name for scheme subjects; null for the single total input. */
  component: SubjectComponentName | null;
  /** Maximum marks of this component / total. */
  max: number;
  /** Header label shown above the input (e.g. "Notebook (5)"). */
  label: string;
}

interface MarksSubjectColumn {
  /** SubjectDoc id - the key used inside subjectMarks. */
  id: string;
  name: string;
  type: string;
  order: number;
  /** Scholastic subjects keep one grade cell and no component inputs. */
  isGrade: boolean;
  inputs: MarksComponentInput[];
}

/** A subject as loaded from Firestore, before the scheme-based layout. */
interface SubjectColumnBase {
  id: string;
  name: string;
  type: string;
  order: number;
}

/** What one subject of one student will be written as (or not written). */
type ResolvedSubject =
  | { kind: "clear" }
  | { kind: "invalid" }
  | { kind: "status"; status: "absent" | "exempt" }
  | {
      kind: "present";
      obtained: number;
      maxMarks: number;
      components: Partial<Record<SubjectComponentName, number | null>>;
      componentMax: Partial<Record<SubjectComponentName, number>>;
    };

/** Parsed state of one cell's draft. */
type ResolvedCell =
  | { kind: "empty" }
  | { kind: "status"; status: "absent" | "exempt" }
  | { kind: "number"; value: number }
  | { kind: "invalid" };

function toExamCategory(value: unknown): ExamCategory {
  return value === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
}

function toExamStatus(value: unknown): "active" | "archived" {
  return value === "archived" ? "archived" : "active";
}

function toDateInputValue(value: unknown): string {
  const date = toDateOrNull(value);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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

function toRowStudent(
  snapshot: QueryDocumentSnapshot<DocumentData>
): MarksRowStudent | null {
  const data = snapshot.data();
  if (data.isDeleted === true) return null;
  const studentUid = typeof data.studentId === "string" ? data.studentId : "";
  if (!studentUid) return null;
  return {
    studentUid,
    admissionNumber: String(data.enrollment ?? "").trim(),
    studentName: typeof data.studentName === "string" ? data.studentName : "",
    fatherName: typeof data.fatherName === "string" ? data.fatherName : "",
    section: typeof data.section === "string" ? data.section : "",
  };
}

function sortRowStudents(a: MarksRowStudent, b: MarksRowStudent): number {
  return compareRollStudents(a, b);
}

function toSubjectColumn(
  snapshot: QueryDocumentSnapshot<DocumentData>
): SubjectColumnBase | null {
  const data = snapshot.data();
  if (data.displayInMarksEntry !== true) return null;
  return {
    id: snapshot.id,
    name: typeof data.name === "string" ? data.name : "",
    type: typeof data.type === "string" ? data.type : "",
    order: typeof data.order === "number" ? data.order : 1,
  };
}

function sortSubjectColumns(
  a: SubjectColumnBase,
  b: SubjectColumnBase
): number {
  return a.order - b.order || a.name.localeCompare(b.name);
}

/**
 * Turns a loaded subject into the input layout of its marks cell. The exam
 * scheme decides the split (Unit Test = notebook + test; Main Exam = theory,
 * + practical for Science/Computer on classes 1-8). Scholastic subjects keep
 * a single grade cell. Other classes get one "Marks" total input.
 */
function enrichSubjectColumn(
  column: SubjectColumnBase,
  exam: ExamDoc | null,
  className: string
): MarksSubjectColumn {
  if (column.type === "Scholastic") {
    return { ...column, isGrade: true, inputs: [] };
  }
  const inputs: MarksComponentInput[] = [];
  if (exam && isSchemeClass(className)) {
    const breakdown = subjectMarksBreakdown(
      column.name,
      exam.examCategory,
      exam.marksScheme
    );
    if (exam.examCategory === "UNIT_TEST") {
      inputs.push(
        { component: "notebook", max: breakdown.notebook, label: "Notebook" },
        { component: "test", max: breakdown.theory, label: "Test" }
      );
    } else if (breakdown.hasPractical) {
      inputs.push(
        { component: "theory", max: breakdown.theory, label: "Theory" },
        { component: "practical", max: breakdown.practical, label: "Practical" }
      );
    } else {
      inputs.push({
        component: "theory",
        max: breakdown.theory,
        label: "Theory",
      });
    }
  } else {
    inputs.push({ component: null, max: exam?.maxMarks ?? 0, label: "Marks" });
  }
  return { ...column, isGrade: false, inputs };
}

function normalizeGrade(value: string): string {
  return value.toUpperCase().replace(/[^A-F0-9+\-]/g, "").slice(0, 3);
}

/** "AB"/"EX" (any case) are shown back in the cell as uppercase tokens. */
function toMarkTokenOrRaw(value: string): string {
  const upper = value.trim().toUpperCase();
  return upper === "AB" || upper === "EX" ? upper : value;
}

/**
 * Parses what the teacher typed in one cell: empty, the "AB"/"EX" token, a
 * valid non-negative number (at most 2 decimal places, "." or "," accepted as
 * the decimal separator) within [0, max], or invalid (letters other than
 * AB/EX, negative values, over-max values).
 */
function resolveCell(value: string, max: number): ResolvedCell {
  const trimmed = value.trim().replace(",", ".").toUpperCase();
  if (trimmed === "") return { kind: "empty" };
  if (trimmed === "AB") return { kind: "status", status: "absent" };
  if (trimmed === "EX") return { kind: "status", status: "exempt" };
  if (/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= max) {
      return { kind: "number", value: round2(numeric) };
    }
  }
  return { kind: "invalid" };
}

/** "AB"/"EX" typed in any cell of a subject applies to the whole subject. */
function subjectStatusToken(
  drafts: Record<string, string>,
  studentUid: string,
  column: MarksSubjectColumn
): "AB" | "EX" | null {
  for (const input of column.inputs) {
    const draft =
      drafts[CELL_KEY.component(studentUid, column.id, input.component)];
    if (!draft) continue;
    const upper = draft.trim().toUpperCase();
    if (upper === "AB" || upper === "EX") return upper;
  }
  return null;
}

/**
 * The effective state of one subject from its cell drafts: absent/exempt when
 * any cell holds "AB"/"EX", invalid when any cell holds something unusable,
 * "clear" when every cell is empty, present otherwise. For present subjects,
 * obtained is the sum of the entered components (empty components store null).
 */
function resolveSubject(
  drafts: Record<string, string>,
  studentUid: string,
  column: MarksSubjectColumn
): ResolvedSubject {
  if (column.inputs.length === 0) return { kind: "clear" };

  const cells = column.inputs.map((input) =>
    resolveCell(
      drafts[CELL_KEY.component(studentUid, column.id, input.component)] ?? "",
      input.max
    )
  );

  const statusCell = cells.find((cell) => cell.kind === "status");
  if (statusCell && statusCell.kind === "status") {
    return { kind: "status", status: statusCell.status };
  }
  if (cells.some((cell) => cell.kind === "invalid")) {
    return { kind: "invalid" };
  }
  if (cells.every((cell) => cell.kind === "empty")) {
    return { kind: "clear" };
  }

  const components: Partial<Record<SubjectComponentName, number | null>> = {};
  const componentMax: Partial<Record<SubjectComponentName, number>> = {};
  let obtained = 0;
  let maxMarks = 0;
  cells.forEach((cell, index) => {
    const input = column.inputs[index];
    maxMarks += input.max;
    if (!input.component) {
      // Single total input (classes outside the 1-8 scheme).
      if (cell.kind === "number") obtained = cell.value;
      return;
    }
    componentMax[input.component] = input.max;
    if (cell.kind === "number") {
      components[input.component] = cell.value;
      obtained += cell.value;
    } else {
      components[input.component] = null;
    }
  });

  return {
    kind: "present",
    obtained: round2(obtained),
    maxMarks,
    components,
    componentMax,
  };
}

interface StudentDraftPlan {
  subjectMarks: Record<string, SubjectMarksRecord>;
  clearedSubjectKeys: string[];
}

/**
 * Builds the document-level plan of one student: the fresh subjectMarks map
 * plus the keys that must be deleted. Invalid cells keep the last valid saved
 * record untouched (neither rewritten nor deleted).
 */
function buildStudentDraft(
  studentUid: string,
  drafts: Record<string, string>,
  savedBySubject: Record<string, SubjectMarksRecord> | undefined,
  columns: MarksSubjectColumn[]
): StudentDraftPlan {
  const subjectMarks: Record<string, SubjectMarksRecord> = {};
  const clearedSubjectKeys: string[] = [];

  columns.forEach((column) => {
    if (column.isGrade) {
      const gradeKey = CELL_KEY.grade(studentUid, column.id);
      if (drafts[gradeKey] === undefined) {
        // Grade not being edited: keep the saved record (or nothing).
        if (savedBySubject?.[column.id]) {
          subjectMarks[column.id] = savedBySubject[column.id];
        }
        return;
      }
      const grade = normalizeGrade(drafts[gradeKey]);
      if (grade === "") {
        if (savedBySubject?.[column.id]) clearedSubjectKeys.push(column.id);
      } else {
        subjectMarks[column.id] = {
          status: "present",
          obtained: null,
          maxMarks: 0,
          grade,
        };
      }
      return;
    }

    // A subject whose cells have no draft at all is not being edited: keep the
    // last saved record untouched instead of treating it as "cleared".
    const hasCellDraft = column.inputs.some(
      (input) =>
        drafts[CELL_KEY.component(studentUid, column.id, input.component)] !==
        undefined
    );
    if (!hasCellDraft) {
      if (savedBySubject?.[column.id]) {
        subjectMarks[column.id] = savedBySubject[column.id];
      }
      return;
    }

    const resolved = resolveSubject(drafts, studentUid, column);
    switch (resolved.kind) {
      case "clear":
        if (savedBySubject?.[column.id]) clearedSubjectKeys.push(column.id);
        return;
      case "invalid":
        // Keep the last valid saved value: leave the existing key untouched.
        if (savedBySubject?.[column.id]) {
          subjectMarks[column.id] = savedBySubject[column.id];
        }
        return;
      case "status":
        subjectMarks[column.id] = {
          status: resolved.status,
          obtained: null,
          maxMarks: column.inputs.reduce((sum, input) => sum + input.max, 0),
        };
        return;
      case "present":
        subjectMarks[column.id] = {
          status: "present",
          obtained: resolved.obtained,
          maxMarks: resolved.maxMarks,
          ...(Object.keys(resolved.components).length > 0
            ? {
                components: resolved.components,
                componentMax: resolved.componentMax,
              }
            : {}),
        };
        return;
    }
  });

  return { subjectMarks, clearedSubjectKeys };
}

/** A queued per-student autosave, with the full context needed to commit. */
interface PendingMarkSave {
  timer: ReturnType<typeof setTimeout>;
  payload: MarksData;
  clearedSubjectKeys: string[];
  sheet: {
    session: string;
    exam: ExamDoc | null;
    className: string;
    subjects: ExamSheetSubjectInput[];
  };
}

function ExamMarks() {
  // Who is logged in, what they may do (permissions) and which classes,
  // sections and subjects belong to them (scope).
  const { user, can } = useContext(myContext);
  const scope = user?.scope ?? NO_SCOPE;
  const isAdmin = scope.kind === "all";

  const {
    rules,
    loading: rulesLoading,
    error: rulesError,
    reload: reloadRules,
  } = useExamRules();
  /**
   * Latest rules + "are saves allowed?" flags, kept in refs so the debounced
   * autosave (setTimeout callback) always reads the CURRENT values and never a
   * stale render closure.
   */
  const rulesRef = useRef<ExamRules>(rules);
  rulesRef.current = rules;
  const rulesBlocked = rulesLoading || Boolean(rulesError);
  const rulesBlockedRef = useRef(rulesBlocked);
  rulesBlockedRef.current = rulesBlocked;

  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [marksYear, setMarksYear] = useState(academicYears[0]?.value ?? "");
  const [marksExamId, setMarksExamId] = useState("");
  const [marksClass, setMarksClass] = useState("");
  const [section, setSection] = useState("");

  const [rowStudents, setRowStudents] = useState<MarksRowStudent[]>([]);
  const [subjectColumns, setSubjectColumns] = useState<MarksSubjectColumn[]>(
    []
  );
  const [marksMap, setMarksMap] = useState<Record<string, MarksDoc>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadingTable, setLoadingTable] = useState(false);

  const draftsRef = useRef<Record<string, string>>({});
  const marksMapRef = useRef<Record<string, MarksDoc>>({});
  const rowStudentsRef = useRef<MarksRowStudent[]>([]);
  /** Derived frontend rolls (studentUid -> roll) for the current class roster. */
  const rollNumbersRef = useRef<Map<string, number>>(new Map());
  const subjectColumnsRef = useRef<MarksSubjectColumn[]>([]);
  const knownDocIdsRef = useRef<Set<string>>(new Set());
  const pendingWritesRef = useRef<Record<string, PendingMarkSave>>({});
  /** Raw subjectMarks of the loaded docs, so legacy keys can be cleaned up. */
  const rawSubjectMarksRef = useRef<Record<string, Record<string, unknown>>>(
    {}
  );
  /** Exam sheet combinations already requested on this page (retry on failure). */
  const examinedSheetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const examsQuery = query(
      collection(db, COLLECTION.EXAMS),
      orderBy("sequence", "asc")
    );
    const unsubscribe = onSnapshot(
      examsQuery,
      (snapshot) => {
        setExams(snapshot.docs.map(toExamDoc));
      },
      (error) => {
        console.error("Failed to load exams:", error);
      }
    );
    return unsubscribe;
  }, []);

  const yearExams = exams.filter(
    (exam) => exam.status === "active" && exam.academicYear === marksYear
  );
  const selectedExam = yearExams.find((exam) => exam.id === marksExamId) ?? null;

  // ---- Teacher scope (RBAC) -------------------------------------------------
  // Only what is SHOWN and EDITABLE is filtered. `subjectColumns` (the full
  // list) keeps feeding the autosave and the totals, so a subject teacher's
  // save never overwrites the student's overall result.
  const allowedClasses = scopedClasses(scope, CLASSES);
  const allowedSections = marksClass
    ? scopedSections(scope, marksClass, SECTIONS)
    : [];
  const selectionAllowed =
    allowedClasses.includes(marksClass) &&
    (section === "all" ? isAdmin : allowedSections.includes(section));

  /** edit = own subject, view = read-only, none = hidden. */
  const accessOf = (column: MarksSubjectColumn): SubjectAccess => {
    const access = subjectAccess(scope, marksClass, section, column.name);
    // Scope allows editing, but without the marks.enter permission: view only.
    return access === "edit" && !can(PERMISSIONS.MARKS_ENTER) ? "view" : access;
  };
  const visibleColumns = subjectColumns.filter(
    (column) => accessOf(column) !== "none"
  );
  // Totals are shown only when the user can see every subject of the class.
  const showTotals = visibleColumns.length === subjectColumns.length;

  const tableReady = Boolean(
    modalOpen &&
      marksYear &&
      marksExamId &&
      marksClass &&
      selectedExam &&
      section &&
      selectionAllowed
  );

  const buildStudentDraftFor = (studentUid: string): StudentDraftPlan =>
    buildStudentDraft(
      studentUid,
      draftsRef.current,
      marksMapRef.current[studentUid]?.subjectMarks,
      subjectColumnsRef.current
    );

  const buildStudentPayload = (
    student: MarksRowStudent
  ): { payload: MarksData; clearedSubjectKeys: string[] } => {
    const { subjectMarks, clearedSubjectKeys } = buildStudentDraftFor(
      student.studentUid
    );
    const summary = calculateMarksSummary(subjectMarks, rulesRef.current);
    const payload: MarksData = {
      studentUid: student.studentUid,
      admissionNumber: student.admissionNumber,
      studentName: student.studentName,
      fatherName: student.fatherName,
      session: marksYear,
      className: marksClass,
      section: student.section,
      rollNumber:
        rollNumbersRef.current.get(student.studentUid) ??
        Math.max(rowStudentsRef.current.indexOf(student) + 1, 1),
      examId: marksExamId,
      examType: selectedExam ? selectedExam.examCategory : "UNIT_TEST",
      examName: selectedExam ? selectedExam.examName : "",
      subjectMarks,
      ...summary,
    };
    return { payload, clearedSubjectKeys };
  };

  /** Creates the frozen exam sheet once per (session, examId, class) combo. */
  const maybeEnsureExamSheet = (sheet: {
    session: string;
    exam: ExamDoc | null;
    className: string;
    subjects: ExamSheetSubjectInput[];
  }) => {
    if (!sheet.exam) return;
    const key = buildExamSheetId(sheet.session, sheet.exam.id, sheet.className);
    if (examinedSheetsRef.current.has(key)) return;
    examinedSheetsRef.current.add(key);
    void ensureExamSheet(
      sheet.session,
      sheet.exam,
      sheet.className,
      sheet.subjects
    ).then((ok) => {
      // On failure allow the next successful save to retry.
      if (!ok) examinedSheetsRef.current.delete(key);
    });
  };

  const commitMarksWrite = async (studentUid: string) => {
    // Never store a result under rules that are still loading or failed to
    // load; the pending write stays queued so it can commit after a reload.
    if (rulesBlockedRef.current) return;
    const pending = pendingWritesRef.current[studentUid];
    if (!pending) return;
    delete pendingWritesRef.current[studentUid];

    const { payload, clearedSubjectKeys, sheet } = pending;
    const snapshot: MarksRowSnapshot = {
      studentUid: payload.studentUid,
      admissionNumber: payload.admissionNumber,
      studentName: payload.studentName,
      fatherName: payload.fatherName,
      className: payload.className,
      section: payload.section,
      rollNumber: payload.rollNumber,
    };
    const marksDocId = buildMarksDocId(
      payload.session,
      payload.examId,
      payload.studentUid
    );
    const existed = knownDocIdsRef.current.has(marksDocId);
    // Leftover legacy keys of hybrid docs are deleted on this save so the
    // document cleans itself; fully legacy docs are left untouched.
    const rawSubjectMarks = rawSubjectMarksRef.current[payload.studentUid];
    const legacySubjectKeysToDelete = rawSubjectMarks
      ? listLegacySubjectKeys(
          rawSubjectMarks,
          subjectColumnsRef.current.map((column) => column.id)
        )
      : [];

    try {
      await saveStudentMarks({
        session: payload.session,
        examId: payload.examId,
        examName: payload.examName,
        examType: payload.examType,
        student: snapshot,
        subjectMarks: payload.subjectMarks,
        clearedSubjectKeys,
        legacySubjectKeysToDelete,
        existed,
        rules: rulesRef.current,
      });
      knownDocIdsRef.current.add(marksDocId);
      maybeEnsureExamSheet(sheet);
    } catch (error) {
      console.error("Failed to save marks:", error);
      toast.error("Failed to save marks. Please try again.");
    }
  };

  const scheduleStudentWrite = (student: MarksRowStudent) => {
    const pending = pendingWritesRef.current[student.studentUid];
    if (pending) clearTimeout(pending.timer);
    const { payload, clearedSubjectKeys } = buildStudentPayload(student);
    const sheet = {
      session: marksYear,
      exam: selectedExam,
      className: marksClass,
      subjects: subjectColumnsRef.current.map((column) => ({
        id: column.id,
        name: column.name,
        type: column.type,
        order: column.order,
        displayInMarksEntry: true,
      })),
    };
    const timer = setTimeout(() => {
      void commitMarksWrite(student.studentUid);
    }, AUTO_SAVE_DELAY);
    pendingWritesRef.current[student.studentUid] = {
      timer,
      payload,
      clearedSubjectKeys,
      sheet,
    };
  };

  const flushStudentWrite = (studentUid: string) => {
    const pending = pendingWritesRef.current[studentUid];
    if (!pending) return;
    clearTimeout(pending.timer);
    void commitMarksWrite(studentUid);
  };

  // Flush writes that were queued while the rules were still loading/failed as
  // soon as the rules become available, so typed marks are never lost - and the
  // commit recomputes the totals/result against the now-active rules.
  useEffect(() => {
    if (rulesBlocked) return;
    Object.keys(pendingWritesRef.current).forEach((studentUid) => {
      void commitMarksWrite(studentUid);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesBlocked]);

  const flushPendingWrites = () => {
    Object.keys(pendingWritesRef.current).forEach((studentUid) => {
      flushStudentWrite(studentUid);
    });
  };

  useEffect(() => {
    flushPendingWrites();
    draftsRef.current = {};
    setDrafts({});
  }, [marksYear, marksExamId, marksClass, section]);

  useEffect(() => {
    if (!tableReady) {
      setRowStudents([]);
      setLoadingTable(false);
      return;
    }
    setLoadingTable(true);
    const studentsFilters = [
      where("className", "==", marksClass),
      where("academicYear", "==", marksYear),
    ];
    // Section-wise query: "all" loads every section, otherwise that section.
    if (section !== "all") {
      studentsFilters.push(where("section", "==", section));
    }
    const studentsQuery = query(
      collection(db, COLLECTION.ENROLLMENTS),
      ...studentsFilters
    );
    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map(toRowStudent)
          .filter((student): student is MarksRowStudent => student !== null)
          .sort(sortRowStudents);
        rowStudentsRef.current = list;
        setRowStudents(list);
        // Same pure derivation used by the Cross List, so both screens show
        // identical roll numbers for the same roster.
        rollNumbersRef.current = deriveRollNumbers(
          list.map((student) => ({ ...student, className: marksClass }))
        );
        setLoadingTable(false);
      },
      (error) => {
        console.error("Failed to load students:", error);
        setLoadingTable(false);
      }
    );
    return unsubscribe;
  }, [tableReady, marksYear, marksClass, section]);

  useEffect(() => {
    if (!tableReady) {
      subjectColumnsRef.current = [];
      setSubjectColumns([]);
      return;
    }
    const subjectsQuery = query(
      collection(db, COLLECTION.SUBJECTS),
      where("className", "==", marksClass)
    );
    const unsubscribe = onSnapshot(
      subjectsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map(toSubjectColumn)
          .filter(
            (column): column is SubjectColumnBase =>
              column !== null && Boolean(column.name)
          )
          .sort(sortSubjectColumns)
          .map((column) =>
            enrichSubjectColumn(column, selectedExam, marksClass)
          );
        subjectColumnsRef.current = list;
        setSubjectColumns(list);
      },
      (error) => {
        console.error("Failed to load subjects:", error);
        subjectColumnsRef.current = [];
        setSubjectColumns([]);
      }
    );
    return unsubscribe;
  }, [tableReady, marksClass, selectedExam]);

  useEffect(() => {
    if (!tableReady) {
      marksMapRef.current = {};
      knownDocIdsRef.current = new Set();
      rawSubjectMarksRef.current = {};
      setMarksMap({});
      return;
    }
    const marksFilters = [
      where("examId", "==", marksExamId),
      where("session", "==", marksYear),
    ];
    // Section-wise query: "all" loads every section, otherwise that section.
    if (section !== "all") {
      marksFilters.push(where("section", "==", section));
    }
    const marksQuery = query(
      collection(db, COLLECTION.MARKS),
      ...marksFilters
    );
    const unsubscribe = onSnapshot(
      marksQuery,
      (snapshot) => {
        const map: Record<string, MarksDoc> = {};
        const knownIds = new Set<string>();
        const rawByStudent: Record<string, Record<string, unknown>> = {};
        snapshot.docs.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();
          const marks = normalizeLegacyMarksDoc(
            documentSnapshot.id,
            data,
            rulesRef.current
          );
          if (marks.session !== marksYear || marks.className !== marksClass) {
            return;
          }
          map[marks.studentUid] = marks;
          knownIds.add(marks.id);
          const raw = data.subjectMarks;
          if (raw && typeof raw === "object") {
            rawByStudent[marks.studentUid] = raw as Record<string, unknown>;
          }
        });
        knownDocIdsRef.current = knownIds;
        marksMapRef.current = map;
        rawSubjectMarksRef.current = rawByStudent;
        setMarksMap(map);
      },
      (error) => {
        console.error("Failed to load marks:", error);
        marksMapRef.current = {};
        rawSubjectMarksRef.current = {};
        setMarksMap({});
      }
    );
    return unsubscribe;
  }, [tableReady, marksExamId, marksYear, marksClass, section]);

  /** Live totals: the same calculateMarksSummary call the save uses. */
  const summaryOf = (studentUid: string) =>
    calculateMarksSummary(
      buildStudentDraftFor(studentUid).subjectMarks,
      rulesRef.current
    );

  const handleCellChange = (
    student: MarksRowStudent,
    column: MarksSubjectColumn,
    input: MarksComponentInput,
    value: string
  ) => {
    // Defense in depth: read-only / hidden subjects never create a draft.
    if (accessOf(column) !== "edit") return;
    const cellKey = CELL_KEY.component(
      student.studentUid,
      column.id,
      input.component
    );
    const nextDrafts = {
      ...draftsRef.current,
      [cellKey]: toMarkTokenOrRaw(value),
    };
    draftsRef.current = nextDrafts;
    setDrafts(nextDrafts);
    scheduleStudentWrite(student);
  };

  const handleGradeChange = (
    student: MarksRowStudent,
    column: MarksSubjectColumn,
    value: string
  ) => {
    if (accessOf(column) !== "edit") return;
    const cellKey = CELL_KEY.grade(student.studentUid, column.id);
    const nextDrafts = {
      ...draftsRef.current,
      [cellKey]: normalizeGrade(value),
    };
    draftsRef.current = nextDrafts;
    setDrafts(nextDrafts);
    scheduleStudentWrite(student);
  };

  const openModal = () => {
    setMarksYear(academicYears[0]?.value ?? "");
    setMarksExamId("");
    setMarksClass("");
    setSection("");
    setModalOpen(true);
  };

  const closeModal = () => {
    flushPendingWrites();
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Marks"
        titleStyle="text-primaryBlue"
        description="Enter student marks for every exam. Marks are saved automatically as you type."
        descriptionStyle="text-gray-500"
        button={
          <Button
            buttonName="Add Marks"
            variant="primary"
            size="md"
            buttonStyle="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={openModal}
          />
        }
      />

      {rulesError && (
        <div
          className="flex items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>{rulesError} Saves are disabled until the settings load.</span>
          <Button
            buttonName="Retry"
            variant="outline"
            size="sm"
            onClick={reloadRules}
          />
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Add Exam Marks"
        description="Select the academic year, exam and class name to open the marks entry sheet."
        cancelText="Cancel"
        hideSubmit
        onSubmit={() => undefined}
        modalClassName="max-w-6xl"
      >
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="marksYear"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Academic Year
            </label>
            <select
              id="marksYear"
              value={marksYear}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setMarksYear(event.target.value)
              }
              className={inputClass}
            >
              {academicYears.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="marksExam"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Exam
            </label>
            <select
              id="marksExam"
              value={marksExamId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setMarksExamId(event.target.value)
              }
              className={inputClass}
            >
              <option value="">Select Exam</option>
              {yearExams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.examName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="marksClass"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Class Name
            </label>
            <select
              id="marksClass"
              value={marksClass}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setMarksClass(event.target.value);
                // Sections differ per class for a teacher, so start over.
                setSection("");
              }}
              className={inputClass}
            >
              <option value="">Select Class</option>
              {allowedClasses.map((className) => (
                <option key={className} value={className}>
                  {toOrdinalLabel(className)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="marksSection"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Section
            </label>
            <select
              id="marksSection"
              value={section}
              disabled={!marksClass}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setSection(event.target.value)
              }
              className={inputClass}
            >
              <option value="">Select Section</option>
              {isAdmin && <option value="all">All Sections</option>}
              {allowedSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!tableReady ? (
          <p className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Select the academic year, exam and class name to load the marks
            entry sheet.
          </p>
        ) : loadingTable ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
            Loading students...
          </div>
        ) : rulesLoading ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
            Loading exam settings...
          </div>
        ) : rowStudents.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            {section === "all"
              ? "No students found for the selected class and academic year."
              : `No students found in Section ${section} for the selected class and academic year.`}
          </div>
        ) : subjectColumns.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No subject is enabled for marks entry in this class. Enable
            &quot;Show in Marks Entry&quot; on the Subjects page.
          </div>
        ) : visibleColumns.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No subject is assigned to you for this class and section.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="bg-gray-800 text-white text-left">
                  <th className="px-3 py-2.5" rowSpan={2}>
                    #
                  </th>
                  <th className="px-3 py-2.5" rowSpan={2}>
                    Student Name
                  </th>
                  <th className="px-3 py-2.5" rowSpan={2}>
                    Father's Name
                  </th>
                  {visibleColumns.map((column) => (
                    <th
                      key={column.id}
                      colSpan={Math.max(column.inputs.length, 1)}
                      className="px-2 py-2.5 text-center"
                    >
                      <span className="whitespace-nowrap">{column.name}</span>
                      {column.type && (
                        <span className="block text-[10px] text-blue-200 whitespace-nowrap">
                          {column.type}
                        </span>
                      )}
                    </th>
                  ))}
                  {showTotals && (
                    <>
                      <th className="px-3 py-2.5 text-center" rowSpan={2}>
                        Total Marks
                      </th>
                      <th className="px-3 py-2.5 text-center" rowSpan={2}>
                        Marks Obtained
                      </th>
                      <th className="px-3 py-2.5 text-center" rowSpan={2}>
                        Percentage
                      </th>
                    </>
                  )}
                </tr>
                <tr className="bg-gray-700 text-white">
                  {visibleColumns.map((column) =>
                    column.isGrade ? (
                      <th
                        key={`${column.id}-grade`}
                        className="px-2 py-1.5 text-center text-[10px] font-semibold whitespace-nowrap"
                      >
                        Grade
                      </th>
                    ) : (
                      column.inputs.map((input) => (
                        <th
                          key={`${column.id}-${input.component ?? "marks"}`}
                          className="px-2 py-1.5 text-center text-[10px] font-semibold whitespace-nowrap"
                        >
                          {input.label} ({input.max})
                        </th>
                      ))
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rowStudents.map((student, index) => {
                  const summary = summaryOf(student.studentUid);
                  return (
                    <tr
                      key={student.studentUid}
                      className={index % 2 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {student.studentName}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {student.fatherName}
                      </td>
                      {visibleColumns.map((column) => {
                        const readOnly = accessOf(column) === "view";
                        if (column.isGrade) {
                          const cellKey = CELL_KEY.grade(
                            student.studentUid,
                            column.id
                          );
                          const savedGrade =
                            marksMap[student.studentUid]?.subjectMarks[
                              column.id
                            ]?.grade ?? "";
                          return (
                            <td key={column.id} className="px-2 py-2 text-center">
                              <input
                                type="text"
                                list="marksSubjectGrades"
                                maxLength={3}
                                value={drafts[cellKey] ?? savedGrade}
                                readOnly={readOnly}
                                onChange={(
                                  event: ChangeEvent<HTMLInputElement>
                                ) =>
                                  handleGradeChange(
                                    student,
                                    column,
                                    event.target.value
                                  )
                                }
                                onBlur={() =>
                                  flushStudentWrite(student.studentUid)
                                }
                                className={`${marksInputClass}${
                                  readOnly ? ` ${readOnlyInputClass}` : ""
                                }`}
                              />
                            </td>
                          );
                        }
                        const token = subjectStatusToken(
                          drafts,
                          student.studentUid,
                          column
                        );
                        const saved = marksMap[student.studentUid]?.subjectMarks[
                          column.id
                        ];
                        return (
                          <Fragment key={column.id}>
                            {column.inputs.map((input) => {
                              const cellKey = CELL_KEY.component(
                                student.studentUid,
                                column.id,
                                input.component
                              );
                              const draft = drafts[cellKey];
                              let value: string;
                              if (draft !== undefined) {
                                value = draft;
                              } else if (token) {
                                value = token;
                              } else if (saved) {
                                if (saved.status === "absent") value = "AB";
                                else if (saved.status === "exempt") value = "EX";
                                else if (input.component) {
                                  const componentValue =
                                    saved.components?.[input.component];
                                  value =
                                    componentValue === null ||
                                    componentValue === undefined
                                      ? ""
                                      : formatMarks(componentValue);
                                } else {
                                  value =
                                    saved.obtained === null
                                      ? ""
                                      : formatMarks(saved.obtained);
                                }
                              } else {
                                value = "";
                              }
                              const invalid =
                                draft !== undefined &&
                                resolveCell(value, input.max).kind ===
                                  "invalid";
                              return (
                                <td
                                  key={`${column.id}-${
                                    input.component ?? "marks"
                                  }`}
                                  className="px-2 py-2 text-center"
                                >
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    maxLength={6}
                                    title={input.label}
                                    value={value}
                                    readOnly={readOnly}
                                    onChange={(
                                      event: ChangeEvent<HTMLInputElement>
                                    ) =>
                                      handleCellChange(
                                        student,
                                        column,
                                        input,
                                        event.target.value
                                      )
                                    }
                                    onBlur={() =>
                                      flushStudentWrite(student.studentUid)
                                    }
                                    className={`${marksInputClass}${
                                      invalid ? ` ${invalidInputClass}` : ""
                                    }${readOnly ? ` ${readOnlyInputClass}` : ""}`}
                                  />
                                </td>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                      {showTotals && (
                        <>
                          <td className="px-3 py-2 text-gray-700 text-center">
                            {formatMarks(summary.totalMaxMarks)}
                          </td>
                          <td className="px-3 py-2 font-semibold text-gray-800 text-center">
                            {formatMarks(summary.totalMarks)}
                          </td>
                          <td className="px-3 py-2 font-semibold text-gray-800 text-center">
                            {formatMarks(summary.percentage)}%
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">
              Marks are saved automatically as you type. You can type AB
              (absent) or EX (exempt) in any subject cell.
            </p>
            {visibleColumns.some((column) => accessOf(column) === "view") && (
              <p className="mt-1 text-xs text-gray-500">
                Grey columns are read-only for you.
              </p>
            )}
            <datalist id="marksSubjectGrades">
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </datalist>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ExamMarks;
