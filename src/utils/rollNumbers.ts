
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { CLASSES, COLLECTION } from "../constants";
import { db } from "../firebase/config";
import type {
    EnrollmentRecord,
  RollNumberDocument,
  RollNumberEntry,
  RollNumberGenerationResult,
} from "./type";

interface EnrollmentWithId {
  id: string;
  data: EnrollmentRecord;
}

const getStudentName = (student: EnrollmentRecord) =>
  String(
    student.studentName?.trim() ||
      [student.firstName, student.lastName].filter(Boolean).join(" ").trim()
  );

const sortStudents = (students: EnrollmentWithId[]) =>
  [...students].sort((a, b) => {
    const nameComparison = getStudentName(a.data).localeCompare(
      getStudentName(b.data),
      undefined,
      { sensitivity: "base", numeric: true }
    );

    return nameComparison || a.id.localeCompare(b.id);
  });

const buildRollNumberEntries = (
  students: EnrollmentWithId[]
): RollNumberEntry[] =>
  sortStudents(students).map(({ id, data }, index) => ({
    studentId: data.studentId?.trim() || id,
    name: getStudentName(data),
    rollNumber: index + 1,
  }));

export const getRollNumberDocumentId = (
  academicYear: string,
  className: string
) => `${academicYear}_${className}`;

const saveClassRollNumbers = (
  batch: ReturnType<typeof writeBatch>,
  academicYear: string,
  className: string,
  students: EnrollmentWithId[]
) => {
  const entries = buildRollNumberEntries(students);

  const payload: RollNumberDocument = {
  academicYear,
  className,
  students: entries,
  updatedAt: serverTimestamp(),
};

  batch.set(doc(db, COLLECTION.ROLL_NUMBER, getRollNumberDocumentId(academicYear, className)), payload);

  return entries.length;
};

export async function generateClassRollNumbers(
  className: string,
  academicYear: string
): Promise<RollNumberGenerationResult> {
  if (!academicYear) {
    throw new Error("Please select an academic year.");
  }

  const enrollmentsRef = collection(db, COLLECTION.ENROLLMENTS);
  const enrollmentsQuery = query(
    enrollmentsRef,
    where("academicYear", "==", academicYear),
    where("className", "==", className)
  );

  const snapshot = await getDocs(enrollmentsQuery);
  const students: EnrollmentWithId[] = snapshot.docs
    .filter((item) => item.data().isDeleted !== true)
    .map((item) => ({
      id: item.id,
      data: item.data() as EnrollmentRecord,
    }));

  const batch = writeBatch(db);
  const studentCount = saveClassRollNumbers(
    batch,
    academicYear,
    className,
    students
  );

  await batch.commit();

  return { classCount: 1, studentCount };
}

export async function generateAllClassRollNumbers(
  academicYear: string
): Promise<RollNumberGenerationResult> {
  if (!academicYear) {
    throw new Error("Please select an academic year.");
  }

  const enrollmentsRef = collection(db, COLLECTION.ENROLLMENTS);
  const enrollmentsQuery = query(
    enrollmentsRef,
    where("academicYear", "==", academicYear)
  );

  const snapshot = await getDocs(enrollmentsQuery);
  const studentsByClass = new Map<string, EnrollmentWithId[]>(
    CLASSES.map((className) => [className, []])
  );

  snapshot.docs.forEach((item) => {
    const data = item.data() as EnrollmentRecord;

    if (data.isDeleted === true || !studentsByClass.has(data.className ?? "")) {
      return;
    }

    studentsByClass.get(data.className!)!.push({
      id: item.id,
      data,
    });
  });

  const batch = writeBatch(db);
  let studentCount = 0;

  CLASSES.forEach((className) => {
    studentCount += saveClassRollNumbers(
      batch,
      academicYear,
      className,
      studentsByClass.get(className) ?? []
    );
  });

  await batch.commit();

  return { classCount: CLASSES.length, studentCount };
}

export async function clearClassRollNumbers(
  className: string,
  academicYear: string
): Promise<void> {
  await deleteDoc(
    doc(db, COLLECTION.ROLL_NUMBER, getRollNumberDocumentId(academicYear, className))
  );
}