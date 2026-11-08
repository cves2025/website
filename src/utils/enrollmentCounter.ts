/**
 * Suggests the next Enrollment No. on the Add Student page.
 *
 *   panelSettings/enrollmentCounter -> { lastEnrollment, updatedAt }
 *
 * `lastEnrollment` is the highest numeric enrollment number in use, so the
 * suggestion is two small reads: the counter, and the student who holds
 * that number. Saving a higher number moves the counter up.
 *
 * The counter heals itself: when no student holds its number any more (a
 * typo that was corrected, a student deleted for good), every student is
 * scanned once and the counter is set back to the highest number really in
 * use. Students in the recycle bin still hold their numbers.
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

/** Who holds the highest number, shown under the suggestion. */
export interface EnrollmentOwner {
  name: string;
  inRecycleBin: boolean;
}

export interface EnrollmentSuggestion {
  /** Number to suggest. */
  next: string;
  /** Highest number in use (0 when there is none). */
  highest: number;
  owner: EnrollmentOwner | null;
}

function ownerFromData(data: Record<string, unknown>): EnrollmentOwner {
  const text = (key: string) => (typeof data[key] === "string" ? (data[key] as string).trim() : "");
  return {
    name:
      text("studentName") ||
      text("fullName") ||
      `${text("firstName")} ${text("lastName")}`.trim() ||
      "a student",
    inRecycleBin: data.isDeleted === true,
  };
}

/** The student holding this number (text or number), or null. One read. */
async function ownerOf(value: number): Promise<EnrollmentOwner | null> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION.STUDENTS),
      where("enrollment", "in", [String(value), value]),
      limit(1)
    )
  );
  return snapshot.empty ? null : ownerFromData(snapshot.docs[0].data());
}

/** Highest numeric enrollment number among all students, and its holder (full scan). */
async function findHighestEnrollment(): Promise<{ highest: number; owner: EnrollmentOwner | null }> {
  const snapshot = await getDocs(collection(db, COLLECTION.STUDENTS));
  let highest = 0;
  let owner: EnrollmentOwner | null = null;
  snapshot.forEach((document) => {
    const value = enrollmentValue(document.data().enrollment);
    if (value !== null && value > highest) {
      highest = value;
      owner = ownerFromData(document.data());
    }
  });
  return { highest, owner };
}

/** The enrollment number to suggest for a new student, and who holds the highest. */
export async function fetchNextEnrollment(): Promise<EnrollmentSuggestion> {
  const snapshot = await getDoc(counterRef());
  const saved = snapshot.exists()
    ? enrollmentValue(snapshot.data().lastEnrollment)
    : null;
  if (saved !== null && saved > 0) {
    const owner = await ownerOf(saved);
    if (owner) return { next: String(saved + 1), highest: saved, owner };
  }

  // No counter yet, or nobody holds its number any more: work it out again.
  const { highest, owner } = await findHighestEnrollment();
  if (highest !== saved) {
    await setDoc(counterRef(), {
      lastEnrollment: highest,
      updatedAt: serverTimestamp(),
    });
  }
  return { next: String(highest + 1), highest, owner };
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
