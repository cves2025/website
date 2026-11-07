/** The fee target of the dashboard: what a month should bring in. Pure, no reads. */
import type { FeeStructure } from "./type";

export interface FeeTargetInput {
  structure: FeeStructure;
  /** Students of each class in the session. */
  studentsByClass: Record<string, number>;
  /** Monthly transport fee of all accounts together. */
  transportMonthly: number;
}

/**
 * What the school expects to collect in a calendar month (1-12): each
 * class's monthly fee times its students, that month's exam fees, and the
 * transport fees. Built from the fee structure, so special fees and
 * discounts are not taken off.
 */
export function feeTargetOfMonth(input: FeeTargetInput, month: number): number {
  const { structure, studentsByClass, transportMonthly } = input;
  let total = transportMonthly;
  Object.entries(studentsByClass).forEach(([className, students]) => {
    total += (structure.classes[className]?.monthly ?? 0) * students;
    structure.examFees
      .filter((exam) => exam.month === month)
      .forEach((exam) => (total += (exam.amounts[className] ?? 0) * students));
  });
  return total;
}
