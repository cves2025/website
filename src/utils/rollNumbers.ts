
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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

const getSection = (student: EnrollmentRecord) =>
  String(student.section ?? "").trim();

const compareText = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

const sortStudents = (students: EnrollmentWithId[]) =>
  [...students].sort(
    (a, b) =>
      compareText(getStudentName(a.data), getStudentName(b.data)) ||
      a.id.localeCompare(b.id)
  );

/**
 * Roll numbers are section-wise: every section of the class is numbered from 1
 * in alphabetical order of the student names. Entries come back ordered by
 * section, then roll number.
 */
const buildRollNumberEntries = (
  students: EnrollmentWithId[]
): RollNumberEntry[] => {
  const bySection = new Map<string, EnrollmentWithId[]>();
  students.forEach((student) => {
    const section = getSection(student.data);
    const list = bySection.get(section) ?? [];
    list.push(student);
    bySection.set(section, list);
  });

  return [...bySection.keys()]
    .sort(compareText)
    .flatMap((section) =>
      sortStudents(bySection.get(section) ?? []).map(({ id, data }, index) => ({
        studentId: data.studentId?.trim() || id,
        name: getStudentName(data),
        section,
        rollNumber: index + 1,
      }))
    );
};

export const getRollNumberDocumentId = (
  academicYear: string,
  className: string
) => `${academicYear}_${className}`;

/**
 * The generated roll numbers (studentId -> roll) of the given classes - the
 * single source of roll numbers for the whole app. Costs exactly one document
 * read per class; a class without generated roll numbers adds nothing.
 */
export async function loadRollNumbers(
  academicYear: string,
  classNames: readonly string[]
): Promise<Map<string, number>> {
  const rollNumbers = new Map<string, number>();
  if (!academicYear || classNames.length === 0) return rollNumbers;

  const snapshots = await Promise.all(
    [...new Set(classNames)].map((className) =>
      getDoc(
        doc(
          db,
          COLLECTION.ROLL_NUMBER,
          getRollNumberDocumentId(academicYear, className)
        )
      )
    )
  );

  snapshots.forEach((snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data() as Partial<RollNumberDocument>;
    (data.students ?? []).forEach((entry) => {
      if (entry.studentId && typeof entry.rollNumber === "number") {
        rollNumbers.set(entry.studentId, entry.rollNumber);
      }
    });
  });

  return rollNumbers;
}

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