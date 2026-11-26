/**
 * Firestore of the UDISE+ module (docs/features/udise.md). It only READS
 * students / enrollments / roll numbers; it writes only settings/udise and
 * udiseStudents/{studentId}. Admin only (firestore.rules).
 */
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
} from "firebase/firestore";

import { COLLECTION, UDISE_SETTINGS_DOC, UDISE_STUDENTS_COLLECTION } from "../constants";
import { db } from "../firebase/config";
import { previousAcademicYear } from "./generateAcademicYears";
import { loadRollNumbers } from "./rollNumbers";
import { cleanUdiseValues, readUdiseSettings, udiseFromRecords } from "./udiseRecord";
import type { UdiseSettings, UdiseStudentRow, UdiseValues } from "./type";

const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value).trim() : "");
const settingsRef = () => doc(db, COLLECTION.SETTINGS, UDISE_SETTINGS_DOC);

/** Firestore `in` takes at most 30 values. */
const IN_LIMIT = 30;
const chunks = <T,>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / IN_LIMIT) }, (_, index) => items.slice(index * IN_LIMIT, (index + 1) * IN_LIMIT));

/** Documents of a collection by id (missing ones are left out). */
async function docsById(collectionName: string, ids: string[]): Promise<Map<string, DocumentData>> {
  const found = new Map<string, DocumentData>();
  const snapshots = await Promise.all(
    chunks(ids).map((part) => getDocs(query(collection(db, collectionName), where(documentId(), "in", part))))
  );
  snapshots.forEach((snapshot) => snapshot.docs.forEach((item) => found.set(item.id, item.data())));
  return found;
}

/* ------------------------------------------------------------ settings -- */

export async function loadUdiseSettings(): Promise<UdiseSettings> {
  const snapshot = await getDoc(settingsRef());
  return readUdiseSettings(snapshot.exists() ? snapshot.data() : {});
}

/** Saves the whole settings document (a cleared default is really gone). */
export async function saveUdiseSettings(settings: UdiseSettings, uid: string): Promise<void> {
  await setDoc(settingsRef(), { ...readUdiseSettings(settings), updatedBy: uid, updatedAt: serverTimestamp() });
}

/* ------------------------------------------------------------ students -- */

/**
 * The students of one section in a session with what our records give for
 * UDISE and what was saved for them, in roll-number order.
 */
export async function loadUdiseSection(
  session: string,
  className: string,
  section: string,
  classCodes: Record<string, string>
): Promise<UdiseStudentRow[]> {
  if (!session || !className || !section) return [];
  const [enrollmentSnap, rollNumbers] = await Promise.all([
    getDocs(
      query(
        collection(db, COLLECTION.ENROLLMENTS),
        where("academicYear", "==", session),
        where("className", "==", className),
        where("section", "==", section)
      )
    ),
    loadRollNumbers(session, [className]),
  ]);
  const enrollments = enrollmentSnap.docs.filter((item) => item.data().isDeleted !== true);
  const studentIds = [...new Set(enrollments.map((item) => text(item.data().studentId) || item.id))];

  const previousSession = previousAcademicYear(session);
  const [students, saved, previousSnaps] = await Promise.all([
    docsById(COLLECTION.STUDENTS, studentIds),
    docsById(UDISE_STUDENTS_COLLECTION, studentIds),
    Promise.all(
      chunks(studentIds).map((part) =>
        getDocs(
          query(
            collection(db, COLLECTION.ENROLLMENTS),
            where("academicYear", "==", previousSession),
            where("studentId", "in", part)
          )
        )
      )
    ),
  ]);
  const previous = new Map<string, DocumentData>();
  previousSnaps.forEach((snapshot) =>
    snapshot.docs.forEach((item) => {
      const data = item.data();
      if (data.isDeleted !== true) previous.set(text(data.studentId), data);
    })
  );

  const rows = enrollments.map((item): UdiseStudentRow => {
    const enrollment = item.data();
    const studentId = text(enrollment.studentId) || item.id;
    const student = students.get(studentId) ?? {};
    const rollNumber = rollNumbers.get(studentId) ?? rollNumbers.get(item.id) ?? 0;
    return {
      studentId,
      enrollmentId: item.id,
      studentName: text(enrollment.studentName) || `${text(enrollment.firstName)} ${text(enrollment.lastName)}`.trim(),
      fatherName: text(enrollment.fatherName || student.fatherName),
      admissionNo: text(enrollment.enrollment),
      pen: text(student.penOfStudent),
      rollNumber,
      records: udiseFromRecords({
        student,
        enrollment,
        previousEnrollment: previous.get(studentId) ?? null,
        rollNumber,
        classCodes,
      }),
      saved: cleanUdiseValues(((saved.get(studentId)?.values ?? {}) as UdiseValues) || {}),
    };
  });
  rows.sort(
    (a, b) => (a.rollNumber || Infinity) - (b.rollNumber || Infinity) || a.studentName.localeCompare(b.studentName)
  );
  return rows;
}

/** Saves the answers typed for one student (replaces the earlier ones). */
export async function saveUdiseStudent(
  studentId: string,
  values: UdiseValues,
  by: { uid: string; name: string }
): Promise<UdiseValues> {
  const clean = cleanUdiseValues(values);
  await setDoc(doc(db, UDISE_STUDENTS_COLLECTION, studentId), {
    values: clean,
    updatedAt: serverTimestamp(),
    updatedBy: by.uid,
    updatedByName: by.name,
  });
  return clean;
}
