/**
 * Firestore service layer for the marks storage and the exam-wise Cross List.
 *
 * - `marks`     : one document per student per exam, id `${session}_${examId}_${studentUid}`,
 *                 saved with setDoc({ merge: true }) so cleared subjects can be removed
 *                 with deleteField() without clobbering the rest of the document.
 * - `examSheets`: a frozen snapshot of the subject columns of one exam + class, created
 *                 once (in a transaction) and never overwritten afterwards, so old cross
 *                 lists stay identical even when subjects are renamed/reordered later.
 *
 * Queries use equality filters only and sort on the client, so no Firestore
 * composite indexes are required.
 */
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  type QueryConstraint,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import { DEFAULT_EXAM_RULES, type ExamRules } from "./examRules";
import {
  isSchemeClass,
  subjectMarksBreakdown,
  type ExamCategory,
  type SubjectMarksBreakdown,
} from "./examMarksScheme";
import {
  buildExamSheetId,
  buildMarksDocId,
  calculateMarksSummary,
  compareByClassSectionRoll,
  normalizeLegacyMarksDoc,
} from "./marks";
import type {
  ExamDoc,
  ExamSheetDoc,
  ExamSheetSubjectColumn,
  MarksDoc,
  SubjectComponentName,
  SubjectMarksRecord,
} from "./type";

/** Canonical subject component names accepted inside an examSheet snapshot. */
const COMPONENT_NAMES: SubjectComponentName[] = [
  "notebook",
  "test",
  "theory",
  "practical",
  "written",
  "oral",
];

function isComponentName(value: string): value is SubjectComponentName {
  return (COMPONENT_NAMES as string[]).includes(value);
}

/** Student snapshot copied into every marks document at save time. */
export interface MarksRowSnapshot {
  studentUid: string;
  admissionNumber: string;
  studentName: string;
  fatherName: string;
  className: string;
  section: string;
  rollNumber: number;
}

export interface SaveStudentMarksParams {
  /** Academic session (enrollment.academicYear), e.g. "2025-26". */
  session: string;
  /** Exam document id - the value snapshotted into `examId`. */
  examId: string;
  /** Exam display name snapshotted into `examName`. */
  examName: string;
  /** Exam category snapshotted into `examType`. */
  examType: ExamCategory;
  /** Student snapshot taken from the enrollment document. */
  student: MarksRowSnapshot;
  /** Final subject marks map (already normalized; cleared keys removed). */
  subjectMarks: Record<string, SubjectMarksRecord>;
  /**
   * Keys that existed before this save but are cleared now. They are written
   * with deleteField() because setDoc merge only deep-merges nested maps and
   * would otherwise leave the stale key behind.
   */
  clearedSubjectKeys: readonly string[];
  /**
   * Leftover legacy keys of a hybrid doc (entries without a `status` whose key
   * is not a current SubjectDoc id). Sent with deleteField() so the document
   * cleans itself on the next save. Empty for fully legacy documents.
   */
  legacySubjectKeysToDelete?: readonly string[];
  /**
   * True when the document already existed in the data loaded on the page;
   * controls whether createdAt is sent (it is only written for new documents).
   */
  existed: boolean;
  /**
   * The exam rules active at save time. The stored `result` is calculated with
   * these rules, so a document saved under the "subject" pass mode keeps that
   * result even when the settings change later.
   */
  rules: ExamRules;
}

/**
 * Saves one student's marks for an exam. All snapshot fields
 * (studentUid, admissionNumber, studentName, fatherName, session, className,
 * section, rollNumber, examId, examName, examType) are filled from the
 * student + exam data passed in. Totals come only from calculateMarksSummary,
 * which is re-run on the remaining map after cleared keys are removed.
 */
export async function saveStudentMarks(
  params: SaveStudentMarksParams,
): Promise<void> {
  const {
    session,
    examId,
    examName,
    examType,
    student,
    subjectMarks,
    clearedSubjectKeys,
    legacySubjectKeysToDelete,
    existed,
    rules,
  } = params;
  const marksDocId = buildMarksDocId(session, examId, student.studentUid);
  const summary = calculateMarksSummary(subjectMarks, rules);

  // deleteField() removes the cleared keys inside the nested subjectMarks map
  // (setDoc({ merge: true }) merges nested maps, so an explicit delete is the
  // only way to really drop a key). Leftover legacy keys of hybrid docs are
  // deleted the same way, so the document cleans itself on the next save.
  const mergedSubjectMarks: Record<string, unknown> = {};
  Object.entries(subjectMarks).forEach(([key, record]) => {
    // A merge-write never removes nested keys, so component fields that this
    // record no longer carries (e.g. subject became absent as a whole) are
    // deleted explicitly instead of lingering from an older save.
    mergedSubjectMarks[key] = {
      ...record,
      ...(record.components ? {} : { components: deleteField() }),
      ...(record.componentMax ? {} : { componentMax: deleteField() }),
      ...(record.componentStatus ? {} : { componentStatus: deleteField() }),
    };
  });
  clearedSubjectKeys.forEach((key) => {
    mergedSubjectMarks[key] = deleteField();
  });
  legacySubjectKeysToDelete?.forEach((key) => {
    mergedSubjectMarks[key] = deleteField();
  });

  await setDoc(
    doc(db, COLLECTION.MARKS, marksDocId),
    {
      studentUid: student.studentUid,
      admissionNumber: student.admissionNumber,
      studentName: student.studentName,
      fatherName: student.fatherName,
      session,
      className: student.className,
      section: student.section,
      rollNumber: student.rollNumber,
      examId,
      examType,
      examName,
      subjectMarks: mergedSubjectMarks,
      totalMarks: summary.totalMarks,
      totalMaxMarks: summary.totalMaxMarks,
      percentage: summary.percentage,
      result: summary.result,
      updatedAt: serverTimestamp(),
      ...(existed ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}
/** Attendance record id is deterministic: one record per student and exam. */
export function buildAttendanceDocId(
  session: string,
  examId: string,
  studentUid: string,
): string {
  return `attendance_${encodeURIComponent(session)}_${encodeURIComponent(examId)}_${encodeURIComponent(studentUid)}`;
}

export interface SaveExamAttendanceParams {
  session: string;
  examId: string;
  examName: string;
  className: string;
  section: string;
  studentUid: string;
  studentName: string;
  admissionNumber: string;
  presentDays: number | null;
  totalDays: number | null;
}

/** Attendance is independent of marks and never changes a marks/result document. */
export async function saveExamAttendance(
  params: SaveExamAttendanceParams,
): Promise<void> {
  const id = buildAttendanceDocId(
    params.session,
    params.examId,
    params.studentUid,
  );
  const reference = doc(db, COLLECTION.ATTENDANCE, id);
  if (params.presentDays === null && params.totalDays === null) {
    await deleteDoc(reference);
    return;
  }
  if (params.presentDays === null || params.totalDays === null) {
    throw new Error("Both attendance values are required.");
  }
  if (
    !Number.isInteger(params.presentDays) ||
    !Number.isInteger(params.totalDays) ||
    params.presentDays < 0 ||
    params.totalDays < 0 ||
    params.presentDays > params.totalDays
  ) {
    throw new Error("Invalid attendance values.");
  }
  await setDoc(
    reference,
    {
      session: params.session,
      examId: params.examId,
      examName: params.examName,
      className: params.className,
      section: params.section,
      studentUid: params.studentUid,
      studentName: params.studentName,
      admissionNumber: params.admissionNumber,
      presentDays: params.presentDays,
      totalDays: params.totalDays,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Subject list used to build the frozen examSheets columns. */
export interface ExamSheetSubjectInput {
  id: string;
  name: string;
  type: string;
  order: number;
  /** Optional report card order (undefined = shown after the ordered subjects). */
  reportCardOrder?: number;
  displayInMarksEntry?: boolean;
}

/** Maximum component marks of one subject for the exam category + scheme. */
function buildComponentMax(
  breakdown: SubjectMarksBreakdown,
  category: ExamCategory,
): Partial<Record<SubjectComponentName, number>> | undefined {
  if (category === "UNIT_TEST") {
    // Unit Test = notebook + written test (stored as the "theory" slot).
    return { notebook: breakdown.notebook, test: breakdown.theory };
  }
  const result: Partial<Record<SubjectComponentName, number>> = {
    theory: breakdown.theory,
  };
  if (breakdown.hasPractical) {
    result.practical = breakdown.practical;
  }
  return result;
}

/** Builds one frozen subject column of an examSheets document. */
function toSheetColumn(
  subject: ExamSheetSubjectInput,
  exam: ExamDoc,
  className: string,
): ExamSheetSubjectColumn {
  const scheme = isSchemeClass(className)
    ? subjectMarksBreakdown(
        exam.examCategory,
        exam.marksScheme,
        subject.type === "Practical",
      )
    : null;
  const componentMax = scheme
    ? buildComponentMax(scheme, exam.examCategory)
    : undefined;
  return {
    id: subject.id,
    name: subject.name,
    type: subject.type,
    order: subject.order,
    ...(subject.reportCardOrder
      ? { reportCardOrder: subject.reportCardOrder }
      : {}),
    maxMarks: scheme ? scheme.total : exam.maxMarks,
    ...(componentMax ? { componentMax } : {}),
    isGrade: subject.type === "Scholastic",
  };
}

/**
 * Exam sheet ids already ensured during this page session, so the transaction
 * below runs at most once per (session, examId, className) per page load.
 */
const ensuredExamSheets = new Set<string>();

/**
 * Creates the `examSheets` snapshot for one exam + class the first time marks
 * are saved for it. The read-then-write happens inside a runTransaction so the
 * document is never overwritten, and the whole call is skipped when this page
 * session already ensured the same sheet.
 *
 * Resolves to true when the sheet now exists (either it was just created or it
 * already existed). On failure it logs and resolves to false WITHOUT
 * remembering the id, so the next save can retry - a failed snapshot can never
 * throw into the marks autosave flow.
 */
export async function ensureExamSheet(
  session: string,
  exam: ExamDoc,
  className: string,
  subjects: readonly ExamSheetSubjectInput[],
): Promise<boolean> {
  const sheetId = buildExamSheetId(session, exam.id, className);
  if (ensuredExamSheets.has(sheetId)) return true;

  const sheetRef = doc(db, COLLECTION.EXAM_SHEETS, sheetId);
  try {
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(sheetRef);
      if (snapshot.exists()) return;
      const sheetsSubjects = subjects
        .filter((subject) => subject.displayInMarksEntry !== false)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
        .map((subject) => toSheetColumn(subject, exam, className));
      transaction.set(sheetRef, {
        session,
        examId: exam.id,
        examName: exam.examName,
        className,
        createdAt: serverTimestamp(),
        subjects: sheetsSubjects,
      });
    });
    // Transaction committed (or the sheet already existed): remember it, so
    // repeated autosaves never fire the transaction again.
    ensuredExamSheets.add(sheetId);
    return true;
  } catch (error) {
    // Do NOT remember the id: the next save retries the snapshot.
    console.error("Failed to create exam sheet:", error);
    return false;
  }
}
/** Defensive read of one stored subject column (legacy sheets included). */
function toStoredSheetColumn(value: unknown): ExamSheetSubjectColumn | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = typeof source.id === "string" ? source.id : "";
  const name = typeof source.name === "string" ? source.name : "";
  if (!id || !name) return null;

  const componentMax: Partial<Record<SubjectComponentName, number>> = {};
  const rawComponentMax = source.componentMax;
  if (rawComponentMax && typeof rawComponentMax === "object") {
    Object.entries(rawComponentMax as Record<string, unknown>).forEach(
      ([key, componentValue]) => {
        if (!isComponentName(key)) return;
        if (
          typeof componentValue === "number" &&
          Number.isFinite(componentValue)
        ) {
          componentMax[key] = Math.max(componentValue, 0);
        }
      },
    );
  }

  return {
    id,
    name,
    type: typeof source.type === "string" ? source.type : "",
    order: typeof source.order === "number" ? source.order : 0,
    ...(typeof source.reportCardOrder === "number" && source.reportCardOrder > 0
      ? { reportCardOrder: Math.floor(source.reportCardOrder) }
      : {}),
    maxMarks: typeof source.maxMarks === "number" ? source.maxMarks : 0,
    ...(Object.keys(componentMax).length > 0 ? { componentMax } : {}),
    isGrade: source.isGrade === true || source.type === "Scholastic",
  };
}

/**
 * Reads the frozen subject-column snapshot of one exam + class, if any.
 * Returns null when no snapshot was created yet (no saved marks for it).
 */
export async function getExamSheet(
  session: string,
  examId: string,
  className: string,
): Promise<ExamSheetDoc | null> {
  const snapshot = await getDoc(
    doc(
      db,
      COLLECTION.EXAM_SHEETS,
      buildExamSheetId(session, examId, className),
    ),
  );
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const subjects = Array.isArray(data.subjects)
    ? data.subjects
        .map(toStoredSheetColumn)
        .filter((column): column is ExamSheetSubjectColumn => column !== null)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    : [];
  return {
    id: snapshot.id,
    session: typeof data.session === "string" ? data.session : session,
    examId: typeof data.examId === "string" ? data.examId : examId,
    examName: typeof data.examName === "string" ? data.examName : "",
    className: typeof data.className === "string" ? data.className : className,
    createdAt: data.createdAt,
    subjects,
  };
}

/**
 * Current report card orders (subjectId -> order) of a class, read from the
 * LIVE subjects collection. Result cards overlay these on the frozen exam sheet
 * columns, so updating a subject's report card order is reflected immediately,
 * even when the exam sheet snapshot was created earlier. A subject whose order
 * is missing/cleared maps to undefined, which places it below the ordered ones.
 */
export async function loadSubjectReportCardOrders(
  className: string,
): Promise<Record<string, number | undefined>> {
  if (!className) return {};
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION.SUBJECTS),
      where("className", "==", className),
    ),
  );
  const result: Record<string, number | undefined> = {};
  snapshot.docs.forEach((documentSnapshot) => {
    const raw = documentSnapshot.data()?.reportCardOrder;
    result[documentSnapshot.id] =
      typeof raw === "number" && raw > 0 ? Math.floor(raw) : undefined;
  });
  return result;
}

/** Live subject fields needed to keep a frozen exam sheet in sync with the Subjects page. */
export interface LiveSubject {
  id: string;
  name: string;
  type: string;
  order: number;
  reportCardOrder?: number;
  displayInMarksEntry: boolean;
  /** Only an explicit "Show in Report Card = No" hides a subject. A missing field means shown. */
  hideInReportCard: boolean;
}

/** Reads the current subjects of a class from the LIVE subjects collection. */
export async function loadLiveSubjects(
  className: string,
): Promise<LiveSubject[]> {
  if (!className) return [];
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION.SUBJECTS),
      where("className", "==", className),
    ),
  );
  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const rawOrder = data.reportCardOrder;
    return {
      id: documentSnapshot.id,
      name: typeof data.name === "string" ? data.name : "",
      type: typeof data.type === "string" ? data.type : "",
      order: typeof data.order === "number" ? data.order : 1,
      reportCardOrder:
        typeof rawOrder === "number" && rawOrder > 0
          ? Math.floor(rawOrder)
          : undefined,
      displayInMarksEntry: data.displayInMarksEntry === true,
      hideInReportCard: data.displayInReportCard === false,
    };
  });
}

/**
 * Returns a copy of a frozen exam sheet that matches the live Subjects page:
 * - subjects with "Show in Report Card" = No are removed,
 * - the live report card order is applied,
 * - subjects created after the sheet was frozen are added when they are Scholastic
 *   (grades never change totals) or when marks were already saved for them.
 * Numeric subjects without any saved marks are NOT added, so totals of old
 * results never change because a new subject was created later.
 * The sheet stored in Firestore is never modified.
 */
export function syncSheetWithLiveSubjects(params: {
  sheet: ExamSheetDoc;
  exam: ExamDoc;
  className: string;
  liveSubjects: readonly LiveSubject[];
  /** Subject ids that have a saved record in the marks of this exam. */
  subjectIdsWithMarks: ReadonlySet<string>;
}): ExamSheetDoc {
  const { sheet, exam, className, liveSubjects, subjectIdsWithMarks } = params;
  const liveById = new Map(
    liveSubjects.map((subject) => [subject.id, subject]),
  );

  const columns: ExamSheetSubjectColumn[] = sheet.subjects
    .filter((column) => !liveById.get(column.id)?.hideInReportCard)
    .map((column) => {
      const live = liveById.get(column.id);
      return live
        ? { ...column, reportCardOrder: live.reportCardOrder }
        : column;
    });

  const inSheet = new Set(sheet.subjects.map((column) => column.id));
  liveSubjects.forEach((live) => {
    if (
      inSheet.has(live.id) ||
      live.hideInReportCard ||
      !live.displayInMarksEntry
    )
      return;
    if (!live.name) return;
    const isGrade = live.type === "Scholastic";
    if (!isGrade && !subjectIdsWithMarks.has(live.id)) return;
    columns.push(toSheetColumn(live, exam, className));
  });

  columns.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return { ...sheet, subjects: columns };
}

/**
 * Loads the marks of one exam (all classes, or restricted to a class / section).
 * Equality filters only, no orderBy; the result is passed through
 * normalizeLegacyMarksDoc and sorted client-side (class -> section -> roll).
 */
export async function loadMarksForExam(
  session: string,
  examId: string,
  className?: string,
  section?: string,
  rules: ExamRules = DEFAULT_EXAM_RULES,
): Promise<MarksDoc[]> {
  const constraints: QueryConstraint[] = [
    where("session", "==", session),
    where("examId", "==", examId),
  ];
  if (className) constraints.push(where("className", "==", className));
  if (section) constraints.push(where("section", "==", section));

  const snapshot = await getDocs(
    query(collection(db, COLLECTION.MARKS), ...constraints),
  );

  return snapshot.docs
    .map((documentSnapshot) =>
      normalizeLegacyMarksDoc(
        documentSnapshot.id,
        documentSnapshot.data(),
        rules,
      ),
    )
    .sort(compareByClassSectionRoll);
}

/** Loads the marks of one specific class + section for an exam. */
export async function loadMarksForSectionExam(
  session: string,
  examId: string,
  className: string,
  section: string,
  rules: ExamRules = DEFAULT_EXAM_RULES,
): Promise<MarksDoc[]> {
  return loadMarksForExam(session, examId, className, section, rules);
}
