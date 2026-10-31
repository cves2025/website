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

import { loadRollNumbers } from "../../../utils/rollNumbers";

import { toDateOrNull } from "../../../utils/toDateOrNull";

import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";

import {
  ExamCategory,
  marksSchemeFromDoc,
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
} from "../../../utils/marks";

import {
  ensureExamSheet,
  saveStudentMarks,
  saveExamAttendance,
  type ExamSheetSubjectInput,
  type MarksRowSnapshot,
} from "../../../utils/marksService";

import { ExamDoc, MarksData, MarksDoc } from "../../../utils/type";
import {
  CELL_KEY,
  GRADE_OPTIONS,
  buildStudentDraft,
  buildSubjectColumns,
  normalizeGrade,
  resolveCell,
  toMarkTokenOrRaw,
  type MarksComponentInput,
  type MarksSubjectColumn,
  type StudentDraftPlan,
} from "../../../utils/marksEntry";

import PageHeader from "../../../custom-components/PageHeader";

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
import MarksUploadModal from "./MarksUploadModal";

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

interface AttendanceDraft {
  presentDays: string;
  totalDays: string;
}

interface MarksRowStudent {
  studentUid: string;

  admissionNumber: string;

  studentName: string;

  fatherName: string;

  section: string;
}

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
          (cls): cls is string => typeof cls === "string",
        )
      : [],

    examStartDate: toDateInputValue(data.examStartDate),

    examEndDate: toDateInputValue(data.examEndDate),

    status: toExamStatus(data.status),
  };
}

function toRowStudent(
  snapshot: QueryDocumentSnapshot<DocumentData>,
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
  return a.studentName.localeCompare(b.studentName, undefined, {
    sensitivity: "base",
  });
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

  const [uploadOpen, setUploadOpen] = useState(false);
  const [marksYear, setMarksYear] = useState(academicYears[0]?.value ?? "");

  const [marksExamId, setMarksExamId] = useState("");

  const [marksClass, setMarksClass] = useState("");

  const [section, setSection] = useState("");

  const [rowStudents, setRowStudents] = useState<MarksRowStudent[]>([]);

  const [subjectColumns, setSubjectColumns] = useState<MarksSubjectColumn[]>(
    [],
  );

  const [marksMap, setMarksMap] = useState<Record<string, MarksDoc>>({});

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const [attendanceDrafts, setAttendanceDrafts] = useState<
    Record<string, AttendanceDraft>
  >({});
  const attendanceDraftsRef = useRef<Record<string, AttendanceDraft>>({});
  // Tracks the last persisted value and de-duplicates the two inputs' onBlur saves.
  const attendancePersistedRef = useRef<Record<string, AttendanceDraft>>({});
  const attendanceSavingRef = useRef<
    Record<string, { signature: string; promise: Promise<void> }>
  >({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);

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
    {},
  );

  /** Exam sheet combinations already requested on this page (retry on failure). */

  const examinedSheetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const examsQuery = query(
      collection(db, COLLECTION.EXAMS),

      orderBy("sequence", "asc"),
    );

    const unsubscribe = onSnapshot(
      examsQuery,

      (snapshot) => {
        setExams(snapshot.docs.map(toExamDoc));
      },

      (error) => {
        console.error("Failed to load exams:", error);
      },
    );

    return unsubscribe;
  }, []);

  const yearExams = exams.filter(
    (exam) => exam.status === "active" && exam.academicYear === marksYear,
  );

  const selectedExam =
    yearExams.find((exam) => exam.id === marksExamId) ?? null;

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
    (column) => accessOf(column) !== "none",
  );

  // Totals are shown only when the user can see every subject of the class.

  const showTotals = visibleColumns.length === subjectColumns.length;

  const tableReady = Boolean(
    marksYear &&
    marksExamId &&
    marksClass &&
    selectedExam &&
    section &&
    selectionAllowed,
  );

  const buildStudentDraftFor = (studentUid: string): StudentDraftPlan =>
    buildStudentDraft(
      studentUid,

      draftsRef.current,

      marksMapRef.current[studentUid]?.subjectMarks,

      subjectColumnsRef.current,
    );

  const buildStudentPayload = (
    student: MarksRowStudent,
  ): { payload: MarksData; clearedSubjectKeys: string[] } => {
    const { subjectMarks, clearedSubjectKeys } = buildStudentDraftFor(
      student.studentUid,
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

      // 0 = no roll number generated yet for this student.
      rollNumber: rollNumbersRef.current.get(student.studentUid) ?? 0,

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

      sheet.subjects,
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

      payload.studentUid,
    );

    const existed = knownDocIdsRef.current.has(marksDocId);

    // Leftover legacy keys of hybrid docs are deleted on this save so the

    // document cleans itself; fully legacy docs are left untouched.

    const rawSubjectMarks = rawSubjectMarksRef.current[payload.studentUid];

    const legacySubjectKeysToDelete = rawSubjectMarks
      ? listLegacySubjectKeys(
          rawSubjectMarks,

          subjectColumnsRef.current.map((column) => column.id),
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

        reportCardOrder: column.reportCardOrder,

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
    return () => {
      flushPendingWrites();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      ...studentsFilters,
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

        setLoadingTable(false);
      },

      (error) => {
        console.error("Failed to load students:", error);

        setLoadingTable(false);
      },
    );

    return unsubscribe;
  }, [tableReady, marksYear, marksClass, section]);

  // Generated roll numbers of the class: one document read per year + class,
  // independent of the section / exam selection.
  useEffect(() => {
    rollNumbersRef.current = new Map();
    if (!tableReady) return;
    let cancelled = false;
    loadRollNumbers(marksYear, [marksClass])
      .then((rolls) => {
        if (!cancelled) rollNumbersRef.current = rolls;
      })
      .catch((error) => {
        console.error("Failed to load roll numbers:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [tableReady, marksYear, marksClass]);

  useEffect(() => {
    if (!tableReady) {
      subjectColumnsRef.current = [];

      setSubjectColumns([]);

      return;
    }

    const subjectsQuery = query(
      collection(db, COLLECTION.SUBJECTS),

      where("className", "==", marksClass),
    );

    const unsubscribe = onSnapshot(
      subjectsQuery,

      (snapshot) => {
        const list = buildSubjectColumns(
          snapshot.docs.map((subjectDoc) => ({
            id: subjectDoc.id,
            data: subjectDoc.data(),
          })),
          selectedExam,
          marksClass,
        );

        subjectColumnsRef.current = list;

        setSubjectColumns(list);
      },

      (error) => {
        console.error("Failed to load subjects:", error);

        subjectColumnsRef.current = [];

        setSubjectColumns([]);
      },
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

    const marksQuery = query(collection(db, COLLECTION.MARKS), ...marksFilters);

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

            rulesRef.current,
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
      },
    );

    return unsubscribe;
  }, [tableReady, marksExamId, marksYear, marksClass, section]);

  // Attendance is stored independently from marks, one document per student + exam.
  useEffect(() => {
    if (!tableReady) {
      attendanceDraftsRef.current = {};
      setAttendanceDrafts({});
      setAttendanceLoading(false);
      return;
    }

    setAttendanceLoading(true);
    const filters = [
      where("session", "==", marksYear),
      where("examId", "==", marksExamId),
      where("className", "==", marksClass),
    ];
    if (section !== "all") filters.push(where("section", "==", section));

    const attendanceQuery = query(
      collection(db, COLLECTION.ATTENDANCE),
      ...filters,
    );
    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const next: Record<string, AttendanceDraft> = {};
        snapshot.docs.forEach((attendanceDoc) => {
          const data = attendanceDoc.data();
          const studentUid = String(data.studentUid ?? "");
          if (!studentUid) return;
          if (
            typeof data.presentDays !== "number" ||
            typeof data.totalDays !== "number"
          )
            return;
          next[studentUid] = {
            presentDays: String(data.presentDays),
            totalDays: String(data.totalDays),
          };
        });
        attendancePersistedRef.current = next;
        attendanceDraftsRef.current = next;
        setAttendanceDrafts(next);
        setAttendanceLoading(false);
      },
      (error) => {
        console.error("Failed to load attendance:", error);
        setAttendanceLoading(false);
        toast.error("Failed to load attendance.");
      },
    );
    return unsubscribe;
  }, [tableReady, marksYear, marksExamId, marksClass, section]);

  const handleAttendanceChange = (
    studentUid: string,
    field: keyof AttendanceDraft,
    value: string,
  ) => {
    if (!can(PERMISSIONS.MARKS_ENTER)) return;
    if (value !== "" && (!/^\d+$/.test(value) || Number(value) < 0)) return;
    const current = attendanceDraftsRef.current[studentUid] ?? {
      presentDays: "",
      totalDays: "",
    };
    const next = { ...current, [field]: value };
    const all = { ...attendanceDraftsRef.current, [studentUid]: next };
    attendanceDraftsRef.current = all;
    setAttendanceDrafts(all);
  };

  const saveAttendanceForStudent = async (student: MarksRowStudent) => {
    if (!can(PERMISSIONS.MARKS_ENTER)) return;
    const studentUid = student.studentUid;
    const attendance = attendanceDraftsRef.current[studentUid] ?? {
      presentDays: "",
      totalDays: "",
    };
    const presentText = attendance.presentDays.trim();
    const totalText = attendance.totalDays.trim();
    const signature = `${presentText}/${totalText}`;
    const persisted = attendancePersistedRef.current[studentUid];
    const persistedSignature = persisted
      ? `${persisted.presentDays}/${persisted.totalDays}`
      : "";

    // The second input's blur often fires immediately after the first. Avoid duplicate
    // writes, and don't issue a delete for a student who has no saved attendance.
    if (!presentText && !totalText) {
      if (!persisted) return;
    } else {
      if (!presentText || !totalText) return;
      const presentDays = Number(presentText);
      const totalDays = Number(totalText);
      if (
        !Number.isInteger(presentDays) ||
        !Number.isInteger(totalDays) ||
        presentDays < 0 ||
        totalDays < 0 ||
        presentDays > totalDays
      ) {
        toast.error(
          "Enter valid attendance: present days must not exceed total days.",
        );
        return;
      }
      if (signature === persistedSignature) return;
    }

    const existingSave = attendanceSavingRef.current[studentUid];
    if (existingSave?.signature === signature) {
      await existingSave.promise;
      return;
    }

    const savePromise = (async () => {
      try {
        if (!presentText && !totalText) {
          await saveExamAttendance({
            session: marksYear,
            examId: marksExamId,
            examName: selectedExam?.examName ?? "",
            className: marksClass,
            section: student.section,
            studentUid,
            studentName: student.studentName,
            admissionNumber: student.admissionNumber,
            presentDays: null,
            totalDays: null,
          });
          const nextPersisted = { ...attendancePersistedRef.current };
          delete nextPersisted[studentUid];
          attendancePersistedRef.current = nextPersisted;
          return;
        }

        await saveExamAttendance({
          session: marksYear,
          examId: marksExamId,
          examName: selectedExam?.examName ?? "",
          className: marksClass,
          section: student.section,
          studentUid,
          studentName: student.studentName,
          admissionNumber: student.admissionNumber,
          presentDays: Number(presentText),
          totalDays: Number(totalText),
        });
        attendancePersistedRef.current = {
          ...attendancePersistedRef.current,
          [studentUid]: { presentDays: presentText, totalDays: totalText },
        };
      } catch (error) {
        console.error("Attendance save failed:", error);
        toast.error("Attendance could not be saved. Please try again.");
      } finally {
        if (attendanceSavingRef.current[studentUid]?.signature === signature) {
          delete attendanceSavingRef.current[studentUid];
        }
      }
    })();
    attendanceSavingRef.current[studentUid] = {
      signature,
      promise: savePromise,
    };
    await savePromise;
  };

  /** Live totals: the same calculateMarksSummary call the save uses. */

  const summaryOf = (studentUid: string) =>
    calculateMarksSummary(
      buildStudentDraftFor(studentUid).subjectMarks,

      rulesRef.current,
    );

  const handleCellChange = (
    student: MarksRowStudent,

    column: MarksSubjectColumn,

    input: MarksComponentInput,

    value: string,
  ) => {
    // Defense in depth: read-only / hidden subjects never create a draft.

    if (accessOf(column) !== "edit") return;

    const cellKey = CELL_KEY.component(
      student.studentUid,

      column.id,

      input.component,
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

    value: string,
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

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Marks"
        titleStyle="text-primaryBlue"
        description="Enter student marks for every exam. Marks are saved automatically as you type."
        descriptionStyle="text-gray-500"
        button={
          can(PERMISSIONS.MARKS_ENTER) && (
            <Button
              buttonName="Upload Excel"
              variant="success"
              size="md"
              buttonStyle="rounded-full"
              onClick={() => setUploadOpen(true)}
            />
          )
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

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          Select the academic year, exam and class name to open the marks
          entry sheet.
        </p>

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
          <div className="mt-4 max-h-[65vh] overflow-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead className="sticky top-0 z-40">
                <tr className="bg-gray-800 text-white text-left">
                  <th className="sticky left-0 z-30 px-3 py-2.5" rowSpan={2}>
                    #
                  </th>

                  <th
                    className="sticky left-[48px] z-30 px-3 py-2.5"
                    rowSpan={2}
                  >
                    Student Name
                  </th>

                  <th className="px-3 py-2.5" rowSpan={2}>
                    Father's Name
                  </th>
                  <th className="px-3 py-2.5 text-center" rowSpan={2}>
                    Attendance
                    <span className="block text-[10px] font-normal">
                      Present / Total
                    </span>
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
                    ),
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
                      <td className="sticky left-0 z-20 bg-white px-3 py-2 text-gray-500">
                        {index + 1}
                      </td>

                      <td className="sticky left-[48px] z-20  md:bg-white px-3 py-2 font-normal text-gray-800">
                        {student.studentName}
                      </td>

                      <td className="px-3 py-2 text-gray-600">
                        {student.fatherName}
                      </td>

                      <td className="px-2 py-2 text-center">
                        <div className="flex min-w-[142px] items-center justify-center gap-1">
                          <input
                            aria-label={`${student.studentName} present days`}
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            placeholder="Present"
                            value={
                              attendanceDrafts[student.studentUid]
                                ?.presentDays ?? ""
                            }
                            readOnly={
                              !can(PERMISSIONS.MARKS_ENTER) || attendanceLoading
                            }
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              handleAttendanceChange(
                                student.studentUid,
                                "presentDays",
                                event.target.value,
                              )
                            }
                            onBlur={() =>
                              void saveAttendanceForStudent(student)
                            }
                            className="w-[64px] rounded border border-gray-300 px-1 py-1 text-center text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                          />
                          <span className="text-gray-400">/</span>
                          <input
                            aria-label={`${student.studentName} total days`}
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            placeholder="Total"
                            value={
                              attendanceDrafts[student.studentUid]?.totalDays ??
                              ""
                            }
                            readOnly={
                              !can(PERMISSIONS.MARKS_ENTER) || attendanceLoading
                            }
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              handleAttendanceChange(
                                student.studentUid,
                                "totalDays",
                                event.target.value,
                              )
                            }
                            onBlur={() =>
                              void saveAttendanceForStudent(student)
                            }
                            className="w-[64px] rounded border border-gray-300 px-1 py-1 text-center text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                          />
                        </div>
                      </td>
                      {visibleColumns.map((column) => {
                        const readOnly = accessOf(column) === "view";

                        if (column.isGrade) {
                          const cellKey = CELL_KEY.grade(
                            student.studentUid,

                            column.id,
                          );

                          const savedGrade =
                            marksMap[student.studentUid]?.subjectMarks[
                              column.id
                            ]?.grade ?? "";

                          return (
                            <td
                              key={column.id}
                              className="px-2 py-2 text-center"
                            >
                              <input
                                type="text"
                                list="marksSubjectGrades"
                                maxLength={3}
                                value={drafts[cellKey] ?? savedGrade}
                                readOnly={readOnly}
                                onChange={(
                                  event: ChangeEvent<HTMLInputElement>,
                                ) =>
                                  handleGradeChange(
                                    student,

                                    column,

                                    event.target.value,
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

                        const saved =
                          marksMap[student.studentUid]?.subjectMarks[column.id];

                        return (
                          <Fragment key={column.id}>
                            {column.inputs.map((input) => {
                              const cellKey = CELL_KEY.component(
                                student.studentUid,

                                column.id,

                                input.component,
                              );

                              const draft = drafts[cellKey];

                              let value: string;

                              if (draft !== undefined) {
                                value = draft;
                              } else if (saved) {
                                const componentState = input.component
                                  ? saved.componentStatus?.[input.component]
                                  : undefined;

                                if (
                                  saved.status === "absent" ||
                                  componentState === "absent"
                                )
                                  value = "AB";
                                else if (
                                  saved.status === "exempt" ||
                                  componentState === "exempt"
                                )
                                  value = "EX";
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
                                      event: ChangeEvent<HTMLInputElement>,
                                    ) =>
                                      handleCellChange(
                                        student,

                                        column,

                                        input,

                                        event.target.value,
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
      </div>
      <MarksUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        exams={exams}
      />
    </div>
  );
}

export default ExamMarks;
