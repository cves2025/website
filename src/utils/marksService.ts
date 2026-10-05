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
  params: SaveStudentMarksParams
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
  const mergedSubjectMarks: Record<string, unknown> = { ...subjectMarks };
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
    { merge: true }
  );
}
/** Subject list used to build the frozen examSheets columns. */
export interface ExamSheetSubjectInput {
  id: string;
  name: string;
  type: string;
  order: number;
  displayInMarksEntry?: boolean;
}

/** Maximum component marks of one subject for the exam category + scheme. */
function buildComponentMax(
  breakdown: SubjectMarksBreakdown,
  category: ExamCategory
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
  className: string
): ExamSheetSubjectColumn {
  const scheme = isSchemeClass(className)
    ? subjectMarksBreakdown(subject.name, exam.examCategory, exam.marksScheme)
    : null;
  const componentMax = scheme
    ? buildComponentMax(scheme, exam.examCategory)
    : undefined;
  return {
    id: subject.id,
    name: subject.name,
    type: subject.type,
    order: subject.order,
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
  subjects: readonly ExamSheetSubjectInput[]
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
        if (typeof componentValue === "number" && Number.isFinite(componentValue)) {
          componentMax[key] = Math.max(componentValue, 0);
        }
      }
    );
  }

  return {
    id,
    name,
    type: typeof source.type === "string" ? source.type : "",
    order: typeof source.order === "number" ? source.order : 0,
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
  className: string
): Promise<ExamSheetDoc | null> {
  const snapshot = await getDoc(
    doc(db, COLLECTION.EXAM_SHEETS, buildExamSheetId(session, examId, className))
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
 * Loads the marks of one exam (all classes, or restricted to a class / section).
 * Equality filters only, no orderBy; the result is passed through
 * normalizeLegacyMarksDoc and sorted client-side (class -> section -> roll).
 */
export async function loadMarksForExam(
  session: string,
  examId: string,
  className?: string,
  section?: string,
  rules: ExamRules = DEFAULT_EXAM_RULES
): Promise<MarksDoc[]> {
  const constraints: QueryConstraint[] = [
    where("session", "==", session),
    where("examId", "==", examId),
  ];
  if (className) constraints.push(where("className", "==", className));
  if (section) constraints.push(where("section", "==", section));

  const snapshot = await getDocs(
    query(collection(db, COLLECTION.MARKS), ...constraints)
  );

  return snapshot.docs
    .map((documentSnapshot) =>
      normalizeLegacyMarksDoc(
        documentSnapshot.id,
        documentSnapshot.data(),
        rules
      )
    )
    .sort(compareByClassSectionRoll);
}

/** Loads the marks of one specific class + section for an exam. */
export async function loadMarksForSectionExam(
  session: string,
  examId: string,
  className: string,
  section: string,
  rules: ExamRules = DEFAULT_EXAM_RULES
): Promise<MarksDoc[]> {
  return loadMarksForExam(session, examId, className, section, rules);
}