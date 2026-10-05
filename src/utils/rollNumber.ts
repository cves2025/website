import type { CardStudent } from "./type";

/** Lower-cased name used to order students alphabetically on admit cards. */
function studentSortName(student: CardStudent): string {
  return (
    student.studentName ||
    `${student.firstName} ${student.lastName}`.trim()
  ).toLowerCase();
}

/**
 * Orders two students alphabetically by name for admit-card printing. Equal
 * names are broken by enrollment number and finally by document id, so the
 * order is always stable.
 */
export function compareStudentsByName(
  a: CardStudent,
  b: CardStudent,
): number {
  const nameOrder = studentSortName(a).localeCompare(studentSortName(b));
  if (nameOrder !== 0) return nameOrder;

  const enrollmentOrder = a.enrollment.localeCompare(b.enrollment, undefined, {
    numeric: true,
  });
  if (enrollmentOrder !== 0) return enrollmentOrder;

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Frontend-only roll number (1-based) of one student on an admit card.
 *
 * The roll number is derived from the student's position once the given
 * students are sorted alphabetically by name, so cards printed in that order
 * read 1, 2, 3, ... It is computed on the fly for display only and is never
 * stored in the database.
 */
export function generateRollNumber(
  students: CardStudent[],
  studentId: string,
): number {
  const target = students.find((student) => student.id === studentId);
  if (!target) return 0;

  let rank = 1;
  for (const student of students) {
    if (student.id === studentId) continue;
    if (compareStudentsByName(student, target) < 0) rank += 1;
  }
  return rank;
}

/** Minimal student fields needed to order students for roll derivation. */
export interface RollSortableStudent {
  studentUid: string;
  admissionNumber: string;
  section: string;
}

/** Enrollment snapshot fields needed by deriveRollNumbers. */
export interface RollNumberEnrollment extends RollSortableStudent {
  className: string;
  isDeleted?: boolean;
}

/**
 * Orders two students exactly like the marks entry screen: section first, then
 * admission number (numeric-aware). The document id is the final tiebreaker so
 * the order is always stable.
 */
export function compareRollStudents(
  a: RollSortableStudent,
  b: RollSortableStudent,
): number {
  return (
    a.section.localeCompare(b.section) ||
    a.admissionNumber.localeCompare(b.admissionNumber, undefined, {
      numeric: true,
    }) ||
    a.studentUid.localeCompare(b.studentUid)
  );
}

/**
 * Frontend roll numbers derived exactly like the marks entry screen: per class,
 * active enrollments are sorted by section then admission number and receive
 * their 1-based position in that sort. Deleted enrollments (`isDeleted`) and
 * rows without a student id are ignored. Returns studentUid -> roll.
 */
export function deriveRollNumbers(
  enrollments: readonly RollNumberEnrollment[],
): Map<string, number> {
  const byClass = new Map<string, RollNumberEnrollment[]>();
  enrollments.forEach((student) => {
    if (student.isDeleted === true) return;
    if (!student.studentUid) return;
    const list = byClass.get(student.className) ?? [];
    list.push(student);
    byClass.set(student.className, list);
  });

  const rolls = new Map<string, number>();
  byClass.forEach((classStudents) => {
    const sorted = [...classStudents].sort(compareRollStudents);
    sorted.forEach((student, index) => {
      rolls.set(student.studentUid, index + 1);
    });
  });
  return rolls;
}
