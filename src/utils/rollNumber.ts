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
 * Print order of cards: section first (roll numbers restart in every section),
 * then the generated roll number. Students without a roll number (0) fall
 * back to alphabetical order inside their section.
 */
export function compareStudentsByRoll(
  a: CardStudent,
  b: CardStudent,
  getRollNumber: (studentId: string, enrollmentId?: string) => number,
): number {
  const sectionOrder = a.section.localeCompare(b.section, undefined, {
    numeric: true,
  });
  if (sectionOrder !== 0) return sectionOrder;

  const rollA = getRollNumber(a.studentId, a.id);
  const rollB = getRollNumber(b.studentId, b.id);
  if (rollA > 0 && rollB > 0 && rollA !== rollB) return rollA - rollB;
  return compareStudentsByName(a, b);
}
