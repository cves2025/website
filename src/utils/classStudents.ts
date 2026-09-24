import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { DocumentReference, QueryConstraint } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import type { ClassStudentsDeleteMode, ClassStudentsDeleteResult } from "./type";

/**
 * Firestore is comfortable with a few dozen parallel writes; larger classes are
 * flushed in chunks so the browser never fires hundreds of request at once.
 */
const WRITES_PER_CHUNK = 50;

/** Firestore accepts at most 30 values in a single `in` filter. */
const STUDENT_IDS_PER_IN_QUERY = 30;

/** One enrollment of the class being deleted. */
interface ClassEnrollment {
  id: string;
  /** Id of the master `students` document this enrollment belongs to. */
  studentId: string;
  /** Admission / roll number, present on both collections. */
  enrollment: string;
}

/**
 * Applies a delete action to every student of a class.
 *
 * Both collections that make up a student are covered:
 *
 * - `enrollments` - the record that carries the class and the session.
 * - `students`    - the master profile (name, photos, previous school ...).
 *   It is only touched when the student has no other enrollment left, so the
 *   enrollments of the other sessions can never end up pointing at a document
 *   that no longer exists.
 *
 * - `"recycle"`  -> marks the documents `isDeleted: true`, so the students
 *   disappear from the lists but stay in Firestore (same behaviour as the
 *   delete button on the Student List page).
 * - `"permanent"` -> removes the documents with `deleteDoc()`.
 *
 * When `academicYear` is provided the action is limited to that session, so a
 * mistake on the current session never rewrites the history of earlier ones.
 *
 * @returns how many enrollment documents and how many master profiles were
 *          touched, so the caller can report it to the user.
 */
export async function deleteClassStudents(
  className: string,
  mode: ClassStudentsDeleteMode,
  academicYear = ""
): Promise<ClassStudentsDeleteResult> {
  const enrollments = await fetchClassEnrollments(className, academicYear);
  if (enrollments.length === 0) return { enrollments: 0, students: 0 };

  // Master profiles that are still referenced elsewhere - read before any write
  // happens, so the check can never see the state our own writes produce.
  const stillUsedStudentIds = await fetchStudentIdsUsedElsewhere(
    enrollments.map((enrollment) => enrollment.studentId),
    new Set(enrollments.map((enrollment) => enrollment.id))
  );

  await runInChunks(enrollments, (enrollment) =>
    applyDeleteAction(doc(db, COLLECTION.ENROLLMENTS, enrollment.id), mode)
  );

  // The master documents are looked up in the `students` collection itself, so
  // a missing / stale `studentId` on an enrollment can never leave a profile
  // behind in Firestore.
  const studentIds = (await fetchClassStudentIds(className, academicYear, enrollments))
    .filter((studentId) => !stillUsedStudentIds.has(studentId));

  await runInChunks(studentIds, (studentId) =>
    applyDeleteAction(doc(db, COLLECTION.STUDENTS, studentId), mode)
  );

  return { enrollments: enrollments.length, students: studentIds.length };
}

/** Recycle-bin marker or permanent removal, depending on the chosen mode. */
function applyDeleteAction(
  documentRef: DocumentReference,
  mode: ClassStudentsDeleteMode
): Promise<void> {
  return mode === "permanent"
    ? deleteDoc(documentRef)
    : updateDoc(documentRef, {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      });
}

/** Runs `write` for every item, `WRITES_PER_CHUNK` documents at a time. */
async function runInChunks<T>(
  items: T[],
  write: (item: T) => Promise<void>
): Promise<void> {
  for (let index = 0; index < items.length; index += WRITES_PER_CHUNK) {
    await Promise.all(items.slice(index, index + WRITES_PER_CHUNK).map(write));
  }
}

/**
 * Enrollments of a class for a session, together with the id of the master
 * `students` document each one belongs to.
 *
 * Already recycled documents are included on purpose: marking them again is
 * harmless, and a permanent delete should also wipe what is sitting in the
 * recycle bin.
 */
async function fetchClassEnrollments(
  className: string,
  academicYear: string
): Promise<ClassEnrollment[]> {
  const constraints: QueryConstraint[] = [where("className", "==", className)];
  if (academicYear) {
    constraints.push(where("academicYear", "==", academicYear));
  }

  const snapshot = await getDocs(
    query(collection(db, COLLECTION.ENROLLMENTS), ...constraints)
  );

  return snapshot.docs.map((document) => {
    const { studentId, enrollment } = document.data();
    return {
      id: document.id,
      studentId: typeof studentId === "string" ? studentId : "",
      enrollment: typeof enrollment === "string" ? enrollment.trim() : "",
    };
  });
}

/**
 * Of `studentIds`, the ones that are still referenced by any *other* enrollment
 * (recycled ones included - they keep pointing at the master document).
 *
 * Only the enrollments of those students are read back, and Firestore's `in`
 * filter accepts 30 values, so the ids are queried in batches.
 */
async function fetchStudentIdsUsedElsewhere(
  studentIds: string[],
  ignoredEnrollmentIds: Set<string>
): Promise<Set<string>> {
  const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));
  const stillUsed = new Set<string>();

  for (const batch of chunk(uniqueStudentIds, STUDENT_IDS_PER_IN_QUERY)) {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTION.ENROLLMENTS),
        where("studentId", "in", batch)
      )
    );

    snapshot.docs.forEach((enrollment) => {
      if (ignoredEnrollmentIds.has(enrollment.id)) return;
      const studentId = enrollment.data().studentId;
      if (typeof studentId === "string") stillUsed.add(studentId);
    });
  }

  return stillUsed;
}

/**
 * Ids of the `students` documents that belong to a class.
 *
 * Three sources are merged, because an enrollment may not carry - or may carry
 * a stale - `studentId` for master profiles created by older imports:
 *
 *   1. the `studentId` stored on the enrollments,
 *   2. master profiles whose admission number matches the class' enrollments,
 *   3. master profiles whose `className` + `academicYear` match the class (only
 *      when a session is given, otherwise it could reach other years).
 *
 * Every id is returned once, so a student shared by two enrollments is only
 * deleted once.
 */
async function fetchClassStudentIds(
  className: string,
  academicYear: string,
  enrollments: ClassEnrollment[]
): Promise<string[]> {
  const studentIds = new Set<string>();

  enrollments.forEach((enrollment) => {
    if (enrollment.studentId) studentIds.add(enrollment.studentId);
  });

  const admissionNumbers = Array.from(
    new Set(
      enrollments.map((enrollment) => enrollment.enrollment).filter(Boolean)
    )
  );

  for (const batch of chunk(admissionNumbers, STUDENT_IDS_PER_IN_QUERY)) {
    const snapshot = await getDocs(
      query(collection(db, COLLECTION.STUDENTS), where("enrollment", "in", batch))
    );
    snapshot.docs.forEach((student) => studentIds.add(student.id));
  }

  if (academicYear) {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTION.STUDENTS),
        where("className", "==", className),
        where("academicYear", "==", academicYear)
      )
    );
    snapshot.docs.forEach((student) => studentIds.add(student.id));
  }

  return Array.from(studentIds);
}

/** Splits a list into batches of at most `size` items. */
function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
