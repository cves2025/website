/**
 * Pure logic of a student's fee account: building the lines of a session
 * from the fee structure, totals, and splitting a payment over the lines.
 * Firestore access is in feeService.ts.
 */
import { FEE_HEAD_LABELS, SESSION_MONTHS } from "../constants";
import { monthLabel } from "./feeStructure";
import type {
  FeeAccount,
  FeeAllocation,
  FeeHead,
  FeeLine,
  FeeStructure,
  FeeTotals,
} from "./type";

/** Order of the heads inside one month. */
const HEAD_ORDER: FeeHead[] = [
  "previousDues",
  "admission",
  "monthly",
  "transport",
  "exam",
  "extra",
  "lateFee",
];

export const feeAccountId = (session: string, studentId: string) =>
  `${session}_${studentId}`;

/** "CVES", "2026-27", 1 -> "CVES/2026-27/0001". */
export const formatReceiptNo = (prefix: string, session: string, serial: number) =>
  `${prefix}/${session}/${String(serial).padStart(4, "0")}`;

/** Calendar year of a month inside a session ("2026-27", 1 -> 2027). */
export function monthYear(session: string, month: number): number {
  const start = Number.parseInt(session.slice(0, 4), 10);
  return month >= 4 ? start : start + 1;
}

/** "April 2026"; "" for a line that is not month-bound. */
export const lineMonthLabel = (line: FeeLine, session: string): string =>
  line.month === null ? "" : `${monthLabel(line.month)} ${monthYear(session, line.month)}`;

/** "Monthly Fee (April 2026)" - the name of a line on the receipt. */
export function lineTitle(line: FeeLine, session: string): string {
  const month = lineMonthLabel(line, session);
  return month ? `${line.label} (${month})` : line.label;
}

/** Lines without a month first, then April -> March, heads in HEAD_ORDER. */
export function sortFeeLines(lines: FeeLine[]): FeeLine[] {
  const monthRank = (line: FeeLine) =>
    line.month === null ? -1 : SESSION_MONTHS.indexOf(line.month);
  return [...lines].sort(
    (a, b) =>
      monthRank(a) - monthRank(b) || HEAD_ORDER.indexOf(a.head) - HEAD_ORDER.indexOf(b.head)
  );
}

const newLine = (
  id: string,
  head: FeeHead,
  label: string,
  month: number | null,
  amount: number
): FeeLine => ({ id, head, label, month, amount, discount: 0, paid: 0, waived: false });

/**
 * The lines of a new account: admission fee (new admissions only), the
 * monthly fee of all 12 months and the exam fees of the class. Heads with
 * no amount for the class are left out.
 */
export function buildFeeLines(
  structure: FeeStructure,
  className: string,
  chargeAdmission: boolean
): FeeLine[] {
  const fee = structure.classes[className];
  const lines: FeeLine[] = [];
  if (chargeAdmission && fee?.admission) {
    lines.push(newLine("admission", "admission", FEE_HEAD_LABELS.admission, null, fee.admission));
  }
  if (fee?.monthly) {
    for (const month of SESSION_MONTHS) {
      lines.push(newLine(`monthly-${month}`, "monthly", FEE_HEAD_LABELS.monthly, month, fee.monthly));
    }
  }
  for (const exam of structure.examFees) {
    const amount = exam.amounts[className] ?? 0;
    if (amount) lines.push(newLine(`exam-${exam.id}`, "exam", exam.name, exam.month, amount));
  }
  return sortFeeLines(lines);
}

/** What is still to be paid on a line (0 when waived). */
export const lineDue = (line: FeeLine): number =>
  line.waived ? 0 : Math.max(0, line.amount - line.discount - line.paid);

export function feeTotals(lines: FeeLine[]): FeeTotals {
  return lines.reduce<FeeTotals>(
    (totals, line) => ({
      amount: totals.amount + (line.waived ? 0 : line.amount),
      discount: totals.discount + (line.waived ? 0 : line.discount),
      paid: totals.paid + line.paid,
      due: totals.due + lineDue(line),
    }),
    { amount: 0, discount: 0, paid: 0, due: 0 }
  );
}

/**
 * Splits `amount` over the due lines, in account order (oldest first).
 * Only the lines in `lineIds` are used when it is given. The allocations
 * add up to less than `amount` when the lines owe less.
 */
export function allocatePayment(
  account: FeeAccount,
  amount: number,
  lineIds: string[] | null
): FeeAllocation[] {
  const allocations: FeeAllocation[] = [];
  let left = amount;
  for (const line of account.lines) {
    if (left <= 0) break;
    if (lineIds && !lineIds.includes(line.id)) continue;
    const share = Math.min(lineDue(line), left);
    if (share <= 0) continue;
    allocations.push({ lineId: line.id, label: lineTitle(line, account.session), amount: share });
    left -= share;
  }
  return allocations;
}

/** The lines after a payment's allocations are added to `paid`. */
export function applyAllocations(lines: FeeLine[], allocations: FeeAllocation[]): FeeLine[] {
  const byLine = new Map(allocations.map((item) => [item.lineId, item.amount]));
  return lines.map((line) =>
    byLine.has(line.id) ? { ...line, paid: line.paid + (byLine.get(line.id) ?? 0) } : line
  );
}
