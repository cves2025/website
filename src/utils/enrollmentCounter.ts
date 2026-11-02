/**
 * Suggests the next Enrollment No. on the Add Student page.
 *
 *   panelSettings/enrollmentCounter -> { lastEnrollment, updatedAt }
 *
 * `lastEnrollment` is the highest numeric enrollment number in use, so the
 * suggestion is one read. The first time (no counter yet) it is worked out
 * once from every student and saved. The counter only moves up: a number
 * typed by hand that is higher moves it along, and numbers of deleted
 * students are never handed out again.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { COLLECTION, PRE_DEFINED_DOC_ID } from "../constants";
import { db } from "../firebase/config";

const counterRef = () =>
  doc(db, COLLECTION.PANEL_SETTINGS, PRE_DEFINED_DOC_ID.ENROLLMENT_COUNTER);

/** Numeric value of an enrollment number, or null for "", "A12", etc. */
function enrollmentValue(enrollment: unknown): number | null {
  const text = String(enrollment ?? "").trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

/** Highest numeric enrollment number among all students (one-time scan). */
async function findHighestEnrollment(): Promise<number> {
  const snapshot = await getDocs(collection(db, COLLECTION.STUDENTS));
  let highest = 0;
  snapshot.forEach((document) => {
    const value = enrollmentValue(document.data().enrollment);
    if (value !== null && value > highest) highest = value;
  });
  return highest;
}

/** The enrollment number to suggest for a new student. */
export async function fetchNextEnrollment(): Promise<string> {
  const snapshot = await getDoc(counterRef());
  const saved = snapshot.exists()
    ? enrollmentValue(snapshot.data().lastEnrollment)
    : null;
  if (saved !== null) return String(saved + 1);

  const highest = await findHighestEnrollment();
  await setDoc(counterRef(), {
    lastEnrollment: highest,
    updatedAt: serverTimestamp(),
  });
  return String(highest + 1);
}

/**
 * Moves the counter up to the highest of the given numbers, after they were
 * saved. Never moves it down; non-numeric numbers are ignored.
 */
export async function recordEnrollments(enrollments: string[]): Promise<void> {
  const highest = Math.max(
    0,
    ...enrollments
      .map(enrollmentValue)
      .filter((value): value is number => value !== null)
  );
  if (highest === 0) return;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(counterRef());
    // Without a counter, the next fetchNextEnrollment() scans every student
    // anyway, which includes these numbers.
    if (!snapshot.exists()) return;
    const saved = enrollmentValue(snapshot.data().lastEnrollment) ?? 0;
    if (highest <= saved) return;
    transaction.update(counterRef(), {
      lastEnrollment: highest,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * True when another student already has this enrollment number (students in
 * the recycle bin included, since they still own it). Numbers saved as text or
 * as a number both count.
 */
export async function isEnrollmentTaken(
  enrollment: string,
  exceptStudentId?: string | null
): Promise<boolean> {
  const text = enrollment.trim();
  if (!text) return false;
  const value = enrollmentValue(text);
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION.STUDENTS),
      where("enrollment", "in", value === null ? [text] : [text, value]),
      limit(2)
    )
  );
  return snapshot.docs.some((document) => document.id !== exceptStudentId);
}
