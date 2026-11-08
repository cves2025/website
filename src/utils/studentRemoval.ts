/**
 * Removing a student from the Student List, in one of two ways:
 *
 * - Left / admission cancelled: the enrollment goes to the recycle bin
 *   (`isDeleted: true`) and the student keeps the Enrollment No., as in the
 *   admission register (done in StudentList).
 * - Wrong entry: the record never should have existed (a typo like 5000 for
 *   1156, a student added twice). It is removed for good, so its number is
 *   free and the next suggestion follows the last real number again.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";

/** Why a wrong entry cannot be removed for good ("" = it can). */
export async function wrongEntryBlocker(studentId: string, enrollmentId: string): Promise<string> {
  const [payments, enrollments] = await Promise.all([
    getDocs(query(collection(db, COLLECTION.FEE_PAYMENTS), where("studentId", "==", studentId), limit(1))),
    getDocs(query(collection(db, COLLECTION.ENROLLMENTS), where("studentId", "==", studentId), limit(2))),
  ]);
  if (!payments.empty) {
    return "This student has fee receipts, so it is a real admission. Use \"Student left\" instead.";
  }
  if (enrollments.docs.some((item) => item.id !== enrollmentId)) {
    return "This student is in another session too, so it is a real admission. Use \"Student left\" instead.";
  }
  return "";
}

/**
 * Removes a wrong entry for good: its enrollment and its master record.
 * Throws with the reason when it is a real admission (see wrongEntryBlocker).
 */
export async function removeWrongEntry(studentId: string, enrollmentId: string): Promise<void> {
  const blocker = await wrongEntryBlocker(studentId, enrollmentId);
  if (blocker) throw new Error(blocker);
  await deleteDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId));
  if (studentId && studentId !== enrollmentId) {
    await deleteDoc(doc(db, COLLECTION.STUDENTS, studentId));
  }
}
