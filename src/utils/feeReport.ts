/**
 * Pure logic of the fee reports: dues up to a month and collection totals.
 */
import { PAYMENT_MODES, SESSION_MONTHS } from "../constants";
import { feeTotals, lineDue, previousDuesLineId } from "./feeAccount";
import type {
  CarryForwardItem,
  DuesReportRow,
  FeeAccount,
  FeeHead,
  FeePayment,
  PaymentMode,
} from "./type";

/** The calendar month the session is in today (March for a past session). */
export function currentSessionMonth(session: string): number {
  const start = Number.parseInt(session.slice(0, 4), 10);
  const today = new Date();
  const sessionStart = new Date(start, 3, 1);
  const sessionEnd = new Date(start + 1, 2, 31);
  if (today < sessionStart) return 4;
  if (today > sessionEnd) return 3;
  return today.getMonth() + 1;
}

/**
 * What a student owes up to and including `upToMonth`: lines without a
 * month (admission, previous dues ...) always count. `months` are the
 * months with something due, in session order.
 */
export function duesUpTo(
  account: FeeAccount,
  upToMonth: number
): { due: number; months: number[] } {
  const limit = SESSION_MONTHS.indexOf(upToMonth);
  const months = new Set<number>();
  let due = 0;
  for (const line of account.lines) {
    if (line.month !== null && SESSION_MONTHS.indexOf(line.month) > limit) continue;
    const lineAmount = lineDue(line);
    if (!lineAmount) continue;
    due += lineAmount;
    if (line.month !== null) months.add(line.month);
  }
  return { due, months: SESSION_MONTHS.filter((month) => months.has(month)) };
}

/** Head of a fee line from its id ("monthly-4" -> "monthly"). */
export const headOfLineId = (lineId: string): FeeHead =>
  (lineId === "admission" ? "admission" : lineId.split("-")[0]) as FeeHead;

export interface CollectionSummary {
  total: number;
  receipts: number;
  cancelled: number;
  byMode: Record<PaymentMode, number>;
  byHead: Partial<Record<FeeHead, number>>;
}

/** Totals of the active receipts (cancelled ones are only counted). */
export function summarizeCollection(payments: FeePayment[]): CollectionSummary {
  const summary: CollectionSummary = {
    total: 0,
    receipts: 0,
    cancelled: 0,
    byMode: Object.fromEntries(PAYMENT_MODES.map((mode) => [mode, 0])) as Record<PaymentMode, number>,
    byHead: {},
  };
  for (const payment of payments) {
    if (payment.status === "cancelled") {
      summary.cancelled += 1;
      continue;
    }
    summary.total += payment.amount;
    summary.receipts += 1;
    summary.byMode[payment.mode] += payment.amount;
    for (const item of payment.allocations) {
      const head = headOfLineId(item.lineId);
      summary.byHead[head] = (summary.byHead[head] ?? 0) + item.amount;
    }
  }
  return summary;
}

/**
 * Students of the new session whose dues of the previous session can be
 * carried forward: they were in both sessions, owe money in the old one and
 * have no Previous Dues line from it yet. Biggest dues first.
 */
export function planCarryForward(
  rows: DuesReportRow[],
  previousRows: DuesReportRow[],
  fromSession: string
): CarryForwardItem[] {
  const previous = new Map(previousRows.map((row) => [row.student.studentId, row.account]));
  const lineId = previousDuesLineId(fromSession);
  return rows
    .flatMap((row): CarryForwardItem[] => {
      const fromAccount = previous.get(row.student.studentId);
      if (!fromAccount || row.account.lines.some((line) => line.id === lineId)) return [];
      const amount = feeTotals(fromAccount.lines).due;
      return amount > 0 ? [{ student: row.student, fromAccount, toAccount: row.account, amount }] : [];
    })
    .sort((a, b) => b.amount - a.amount);
}
