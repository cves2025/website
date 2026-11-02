import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import type {
  DocumentData,
  DocumentReference,
  QueryConstraint,
} from "firebase/firestore";

import { CLASSES, COLLECTION } from "../constants";
import { db } from "../firebase/config";
import type { ExamRules } from "./examRules";
import { normalizeLegacyMarksDoc } from "./marks";
import {
  getExamSheet,
  loadLiveSubjects,
  syncSheetWithLiveSubjects,
  type LiveSubject,
} from "./marksService";
import { buildResultTable } from "./resultCardModel";
import { fetchStudentDailyAttendanceRefs } from "./attendanceService";
import { generateClassRollNumbers } from "./rollNumbers";
import type { ExamDoc, ExamSheetDoc, MarksDoc } from "./type";

/**
 * Student promotion.
 *
 * A promotion never rewrites the enrollment of the finished session: that
 * record keeps feeding the result cards, cross list, roll numbers ... of its
 * own session. Instead a NEW enrollment is created for the next session
 * (same `studentId`, same enrollment number, the other fields copied) and the
 * old one is only marked:
 *
 *   status: "promoted" | "passedOut"
 *   promotion: { toAcademicYear, toClassName, toSection, toEnrollmentId,
 *                batchId, mode, promotedAt, promotedBy, promotedByName,
 *                result }
 *
 * Retaining a student (studying the same class again) is a promotion whose
 * target class equals the current class. "Passed Out / TC" is only offered
 * for the last class and creates no new enrollment.
 *
 * Undo deletes the new enrollment together with every marks / attendance
 * document of the student in the new session, takes the student out of the
 * new session's daily attendance, then marks the old enrollment "active" again.
 */

/** Target-class value meaning "Passed Out / TC" (no new enrollment). */
export const PASSED_OUT = "PASSED_OUT";

export type PromotionStatus = "active" | "promoted" | "passedOut";
export type PromotionMode = "single" | "bulk";

/** Grand total of all exams of the session, as on the result card. */
export interface PromotionResult {
  grandTotal: number;
  grandMax: number;
  percentage: number;
  result: "pass" | "fail" | null;
}

export interface PromotionInfo {
  toAcademicYear: string;
  /** "" for Passed Out / TC. */
  toClassName: string;
  toSection: string;
  /** "" for Passed Out / TC. */
  toEnrollmentId: string;
  batchId: string;
  mode: PromotionMode;
  promotedAt: unknown;
  promotedBy: string;
  promotedByName: string;
  result: PromotionResult | null;
}

/** One enrollment of the class being promoted. */
export interface PromotionCandidate {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  enrollment: string;
  fatherName: string;
  className: string;
  section: string;
  status: PromotionStatus;
  promotion: PromotionInfo | null;
}

/** What to do with one student. */
export interface PromotionItem {
  enrollmentId: string;
  /** A class from CLASSES, or PASSED_OUT. */
  targetClass: string;
  /** Required unless targetClass is PASSED_OUT. */
  targetSection: string;
  result: PromotionResult | null;
}

export interface SkippedStudent {
  enrollmentId: string;
  studentName: string;
  reason: string;
}

export interface PromoteOutcome {
  promoted: number;
  passedOut: number;
  skipped: SkippedStudent[];
  rollNumbersUpdated: boolean;
}

export interface UndoOutcome {
  undone: number;
  /** Marks + attendance documents removed from the new session. */
  examDocsDeleted: number;
  skipped: SkippedStudent[];
  rollNumbersUpdated: boolean;
}

/** Firestore accepts at most 30 values in a single `in` filter. */
const IDS_PER_IN_QUERY = 30;

/** Stay safely below the 500-operation limit of a write batch. */
const OPERATIONS_PER_BATCH = 450;

const LAST_CLASS = CLASSES[CLASSES.length - 1];

export const isLastClass = (className: string) => className === LAST_CLASS;

/** The class after `className` (PASSED_OUT after the last one). */
export function nextClassOf(className: string): string {
  const index = CLASSES.indexOf(className);
  if (index === -1) return "";
  return index === CLASSES.length - 1 ? PASSED_OUT : CLASSES[index + 1];
}

/**
 * Suggested target of a single-student promotion: fail -> same class,
 * everything else (pass or no result yet) -> next class.
 */
export function suggestTargetClass(
  className: string,
  result: PromotionResult | null,
): string {
  return result?.result === "fail" ? className : nextClassOf(className);
}

function toStatus(value: unknown): PromotionStatus {
  return value === "promoted" || value === "passedOut" ? value : "active";
}

function toPromotionInfo(value: unknown): PromotionInfo | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const text = (field: unknown) => (typeof field === "string" ? field : "");
  return {
    toAcademicYear: text(data.toAcademicYear),
    toClassName: text(data.toClassName),
    toSection: text(data.toSection),
    toEnrollmentId: text(data.toEnrollmentId),
    batchId: text(data.batchId),
    mode: data.mode === "bulk" ? "bulk" : "single",
    promotedAt: data.promotedAt ?? null,
    promotedBy: text(data.promotedBy),
    promotedByName: text(data.promotedByName),
    result:
      data.result && typeof data.result === "object"
        ? (data.result as PromotionResult)
        : null,
  };
}

function studentNameOf(data: DocumentData): string {
  return String(
    data.studentName?.trim() ||
      [data.firstName, data.lastName].filter(Boolean).join(" ").trim(),
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/** A write batch that commits itself before it reaches the operation limit. */
function createBatchWriter() {
  let batch = writeBatch(db);
  let operations = 0;
  const commits: Promise<void>[] = [];

  const reserve = (count: number) => {
    if (operations + count > OPERATIONS_PER_BATCH && operations > 0) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      operations = 0;
    }
    operations += count;
  };

  return {
    set(reference: DocumentReference, data: DocumentData) {
      reserve(1);
      batch.set(reference, data);
    },
    update(reference: DocumentReference, data: DocumentData) {
      reserve(1);
      batch.update(reference, data);
    },
    delete(reference: DocumentReference) {
      reserve(1);
      batch.delete(reference);
    },
    async flush() {
      if (operations > 0) commits.push(batch.commit());
      await Promise.all(commits);
    },
  };
}

/** Regenerates the roll numbers of the given classes; false when one fails. */
async function refreshRollNumbers(
  academicYear: string,
  classNames: Iterable<string>,
): Promise<boolean> {
  try {
    await Promise.all(
      [...new Set(classNames)].map((className) =>
        generateClassRollNumbers(className, academicYear),
      ),
    );
    return true;
  } catch (error) {
    console.error("Failed to refresh roll numbers:", error);
    return false;
  }
}

/**
 * Enrollments of a class for a session (recycle-bin records left out), sorted
 * by section and name. `sections` empty = every section.
 */
export async function fetchPromotionCandidates(
  academicYear: string,
  className: string,
  sections: readonly string[] = [],
): Promise<PromotionCandidate[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION.ENROLLMENTS),
      where("academicYear", "==", academicYear),
      where("className", "==", className),
    ),
  );

  return snapshot.docs
    .filter((document) => document.data().isDeleted !== true)
    .map((document): PromotionCandidate => {
      const data = document.data();
      return {
        enrollmentId: document.id,
        studentId: typeof data.studentId === "string" ? data.studentId : "",
        studentName: studentNameOf(data),
        enrollment: String(data.enrollment ?? "").trim(),
        fatherName: String(data.fatherName ?? "").trim(),
        className: String(data.className ?? "").trim(),
        section: String(data.section ?? "").trim(),
        status: toStatus(data.status),
        promotion: toPromotionInfo(data.promotion),
      };
    })
    .filter(
      (candidate) =>
        sections.length === 0 || sections.includes(candidate.section),
    )
    .sort(
      (a, b) =>
        a.section.localeCompare(b.section) ||
        a.studentName.localeCompare(b.studentName, undefined, {
          sensitivity: "base",
        }),
    );
}

/**
 * Grand total, percentage and Pass / Fail of every student of a class, over
 * ALL exams of the session that have marks - built with `buildResultTable`,
 * so the numbers are exactly those of the result card.
 *
 * One marks query for the whole class (or just one student when `studentUid`
 * is given), plus one exam-sheet read per exam. Students without any marks
 * are missing from the returned map ("No result").
 */
export async function loadPromotionResults(params: {
  academicYear: string;
  className: string;
  exams: readonly ExamDoc[];
  rules: ExamRules;
  studentUid?: string;
}): Promise<Map<string, PromotionResult>> {
  const { academicYear, className, exams, rules, studentUid } = params;
  const results = new Map<string, PromotionResult>();
  if (!academicYear || !className) return results;

  const constraints: QueryConstraint[] = [
    where("session", "==", academicYear),
    where("className", "==", className),
  ];
  if (studentUid) constraints.push(where("studentUid", "==", studentUid));

  const snapshot = await getDocs(
    query(collection(db, COLLECTION.MARKS), ...constraints),
  );

  // Marks are read without exam rules, like the result card: the totals are
  // recomputed from `subjectMarks` by buildResultTable.
  const marksByExam = new Map<string, Map<string, MarksDoc>>();
  snapshot.docs.forEach((document) => {
    const marks = normalizeLegacyMarksDoc(document.id, document.data());
    if (!marks.studentUid || !marks.examId) return;
    const byStudent = marksByExam.get(marks.examId) ?? new Map();
    byStudent.set(marks.studentUid, marks);
    marksByExam.set(marks.examId, byStudent);
  });

  const examsWithMarks = exams.filter((exam) => marksByExam.has(exam.id));
  if (examsWithMarks.length === 0) return results;

  const [sheets, liveSubjects] = await Promise.all([
    Promise.all(
      examsWithMarks.map((exam) =>
        getExamSheet(academicYear, exam.id, className),
      ),
    ),
    // Failure is not fatal: the frozen sheets are used as they are.
    loadLiveSubjects(className).catch((): LiveSubject[] => []),
  ]);

  const syncedSheets = new Map<string, ExamSheetDoc | null>();
  examsWithMarks.forEach((exam, index) => {
    const sheet = sheets[index];
    if (!sheet) {
      syncedSheets.set(exam.id, null);
      return;
    }
    const subjectIdsWithMarks = new Set<string>();
    marksByExam.get(exam.id)?.forEach((marks) => {
      Object.keys(marks.subjectMarks ?? {}).forEach((id) =>
        subjectIdsWithMarks.add(id),
      );
    });
    syncedSheets.set(
      exam.id,
      syncSheetWithLiveSubjects({
        sheet,
        exam,
        className,
        liveSubjects,
        subjectIdsWithMarks,
      }),
    );
  });

  const studentUids = new Set<string>();
  marksByExam.forEach((byStudent) =>
    byStudent.forEach((_, uid) => studentUids.add(uid)),
  );

  studentUids.forEach((uid) => {
    const model = buildResultTable({
      className,
      inputs: examsWithMarks.map((exam) => ({
        exam,
        sheet: syncedSheets.get(exam.id) ?? null,
        marks: marksByExam.get(exam.id)?.get(uid) ?? null,
      })),
      rules,
    });
    if (!model.grandTotals.hasMarks) return;
    results.set(uid, {
      grandTotal: model.grandTotals.obtained,
      grandMax: model.grandTotals.max,
      percentage: model.grandTotals.percentage,
      result: model.result,
    });
  });

  return results;
}

/** studentIds that already own a (non-deleted) enrollment in `academicYear`. */
async function findEnrolledStudentIds(
  academicYear: string,
  studentIds: string[],
): Promise<Set<string>> {
  const enrolled = new Set<string>();
  await Promise.all(
    chunk([...new Set(studentIds)], IDS_PER_IN_QUERY).map(async (ids) => {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTION.ENROLLMENTS),
          where("academicYear", "==", academicYear),
          where("studentId", "in", ids),
        ),
      );
      snapshot.docs.forEach((document) => {
        const data = document.data();
        if (data.isDeleted !== true && typeof data.studentId === "string") {
          enrolled.add(data.studentId);
        }
      });
    }),
  );
  return enrolled;
}

function newBatchId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Promotes (or retains / passes out) the given students from `fromAcademicYear`
 * into `toAcademicYear`. Every source enrollment is re-read first, so a stale
 * page can never promote a student twice; invalid students are skipped and
 * reported instead of failing the whole run.
 */
export async function promoteStudents(params: {
  fromAcademicYear: string;
  toAcademicYear: string;
  mode: PromotionMode;
  items: PromotionItem[];
  promotedBy: { uid: string; name: string };
}): Promise<PromoteOutcome> {
  const { fromAcademicYear, toAcademicYear, mode, items, promotedBy } = params;
  const skipped: SkippedStudent[] = [];

  const snapshots = await Promise.all(
    items.map((item) =>
      getDoc(doc(db, COLLECTION.ENROLLMENTS, item.enrollmentId)),
    ),
  );

  const valid: { item: PromotionItem; data: DocumentData }[] = [];
  items.forEach((item, index) => {
    const snapshot = snapshots[index];
    const data = snapshot.exists() ? snapshot.data() : null;
    const skip = (reason: string) =>
      skipped.push({
        enrollmentId: item.enrollmentId,
        studentName: data ? studentNameOf(data) : item.enrollmentId,
        reason,
      });

    if (!data || data.isDeleted === true) return skip("Enrollment not found.");
    if (data.academicYear !== fromAcademicYear) {
      return skip(`Enrollment is not in session ${fromAcademicYear}.`);
    }
    if (toStatus(data.status) !== "active") {
      return skip("Already promoted.");
    }
    if (typeof data.studentId !== "string" || !data.studentId) {
      return skip("Enrollment is not linked to a student profile.");
    }
    if (item.targetClass === PASSED_OUT) {
      if (!isLastClass(String(data.className ?? ""))) {
        return skip(`Passed Out is only allowed for class ${LAST_CLASS}.`);
      }
    } else {
      if (!CLASSES.includes(item.targetClass)) {
        return skip("Please choose the new class.");
      }
      if (!item.targetSection.trim()) {
        return skip("Please choose the new section.");
      }
    }
    valid.push({ item, data });
  });

  const alreadyEnrolled = await findEnrolledStudentIds(
    toAcademicYear,
    valid
      .filter(({ item }) => item.targetClass !== PASSED_OUT)
      .map(({ data }) => data.studentId as string),
  );

  const batchId = newBatchId();
  const writer = createBatchWriter();
  const targetClasses = new Set<string>();
  let promoted = 0;
  let passedOut = 0;

  valid.forEach(({ item, data }) => {
    const sourceRef = doc(db, COLLECTION.ENROLLMENTS, item.enrollmentId);
    const isPassedOut = item.targetClass === PASSED_OUT;

    if (!isPassedOut && alreadyEnrolled.has(data.studentId)) {
      skipped.push({
        enrollmentId: item.enrollmentId,
        studentName: studentNameOf(data),
        reason: `Already enrolled in ${toAcademicYear}.`,
      });
      return;
    }

    let toEnrollmentId = "";
    if (!isPassedOut) {
      const targetRef = doc(collection(db, COLLECTION.ENROLLMENTS));
      toEnrollmentId = targetRef.id;
      // Everything else (name, enrollment number, father, phone ...) is
      // carried over unchanged from the previous session.
      const {
        promotion: _promotion,
        promotedFrom: _promotedFrom,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...carried
      } = data;
      writer.set(targetRef, {
        ...carried,
        academicYear: toAcademicYear,
        className: item.targetClass,
        section: item.targetSection.trim(),
        status: "active",
        isDeleted: false,
        promotedFrom: {
          enrollmentId: item.enrollmentId,
          academicYear: fromAcademicYear,
          className: String(data.className ?? ""),
          section: String(data.section ?? ""),
        },
        promotionBatchId: batchId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      targetClasses.add(item.targetClass);
      promoted += 1;
    } else {
      passedOut += 1;
    }

    writer.update(sourceRef, {
      status: isPassedOut ? "passedOut" : "promoted",
      promotion: {
        toAcademicYear,
        toClassName: isPassedOut ? "" : item.targetClass,
        toSection: isPassedOut ? "" : item.targetSection.trim(),
        toEnrollmentId,
        batchId,
        mode,
        promotedAt: serverTimestamp(),
        promotedBy: promotedBy.uid,
        promotedByName: promotedBy.name,
        result: item.result,
      },
      updatedAt: serverTimestamp(),
    });
  });

  await writer.flush();

  const rollNumbersUpdated =
    targetClasses.size === 0 ||
    (await refreshRollNumbers(toAcademicYear, targetClasses));

  return { promoted, passedOut, skipped, rollNumbersUpdated };
}

/** Marks + attendance documents of a student in one session. */
async function fetchExamDocRefs(
  academicYear: string,
  studentUid: string,
): Promise<DocumentReference[]> {
  const snapshots = await Promise.all(
    [COLLECTION.MARKS, COLLECTION.ATTENDANCE].map((name) =>
      getDocs(
        query(
          collection(db, name),
          where("session", "==", academicYear),
          where("studentUid", "==", studentUid),
        ),
      ),
    ),
  );
  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((document) => document.ref),
  );
}

/**
 * Reverts the promotion of the given (old-session) enrollments: the new
 * enrollment and the student's marks / attendance of the new session are
 * deleted permanently, the old enrollment becomes "active" again.
 *
 * A student who has already been promoted again from the new session is
 * skipped - that later promotion has to be undone first.
 */
export async function undoPromotions(
  enrollmentIds: string[],
): Promise<UndoOutcome> {
  const skipped: SkippedStudent[] = [];

  const sources = await Promise.all(
    enrollmentIds.map(async (enrollmentId) => {
      const snapshot = await getDoc(
        doc(db, COLLECTION.ENROLLMENTS, enrollmentId),
      );
      return { enrollmentId, snapshot };
    }),
  );

  const writer = createBatchWriter();
  const targetClasses = new Map<string, Set<string>>();
  let undone = 0;
  let examDocsDeleted = 0;

  for (const { enrollmentId, snapshot } of sources) {
    const data = snapshot.exists() ? snapshot.data() : null;
    const promotion = data ? toPromotionInfo(data.promotion) : null;
    const studentName = data ? studentNameOf(data) : enrollmentId;
    const skip = (reason: string) =>
      skipped.push({ enrollmentId, studentName, reason });

    if (!data || !promotion || toStatus(data.status) === "active") {
      skip("This student is not promoted.");
      continue;
    }

    if (promotion.toEnrollmentId) {
      const targetRef = doc(
        db,
        COLLECTION.ENROLLMENTS,
        promotion.toEnrollmentId,
      );
      const target = await getDoc(targetRef);
      if (target.exists() && toStatus(target.data().status) !== "active") {
        skip(
          `Already promoted again from ${promotion.toAcademicYear}. Undo that promotion first.`,
        );
        continue;
      }

      const examDocs =
        typeof data.studentId === "string" && data.studentId
          ? await fetchExamDocRefs(promotion.toAcademicYear, data.studentId)
          : [];
      examDocs.forEach((reference) => writer.delete(reference));
      examDocsDeleted += examDocs.length;

      // Daily attendance keeps a whole section in one document, so only the
      // student's entry is removed from the new session's days.
      if (target.exists() && typeof data.studentId === "string" && data.studentId) {
        const dailyDocs = await fetchStudentDailyAttendanceRefs(
          promotion.toAcademicYear,
          String(target.data().className ?? ""),
          String(target.data().section ?? ""),
          data.studentId,
        );
        dailyDocs.forEach((reference) =>
          writer.update(reference, {
            [`records.${data.studentId}`]: deleteField(),
          }),
        );
      }

      if (target.exists()) writer.delete(targetRef);

      // The new enrollment may have been edited since; its own class wins.
      const classes =
        targetClasses.get(promotion.toAcademicYear) ?? new Set<string>();
      classes.add(
        String(
          (target.exists() && target.data().className) ||
            promotion.toClassName,
        ),
      );
      targetClasses.set(promotion.toAcademicYear, classes);
    }

    writer.update(snapshot.ref, {
      status: "active",
      promotion: deleteField(),
      updatedAt: serverTimestamp(),
    });
    undone += 1;
  }

  await writer.flush();

  const refreshed = await Promise.all(
    [...targetClasses].map(([academicYear, classes]) =>
      refreshRollNumbers(academicYear, classes),
    ),
  );

  return {
    undone,
    examDocsDeleted,
    skipped,
    rollNumbersUpdated: refreshed.every(Boolean),
  };
}

/** Reverts every promotion that was made in one bulk run. */
export async function undoPromotionBatch(
  batchId: string,
): Promise<UndoOutcome> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION.ENROLLMENTS),
      where("promotion.batchId", "==", batchId),
    ),
  );
  return undoPromotions(snapshot.docs.map((document) => document.id));
}
