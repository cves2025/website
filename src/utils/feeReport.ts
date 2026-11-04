/**
 * Pure logic of the fee reports: dues up to a month and collection totals.
 */
import {
  PAYMENT_MODES,
  SCHOOL_CONTACT,
  SCHOOL_DISPLAY_NAME,
  SESSION_MONTHS,
} from "../constants";
import { formatRupees, monthLabel } from "./feeStructure";
import { toOrdinalLabel } from "./toOrdinalLabel";
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

/**
 * An Indian mobile number in WhatsApp form ("919876543210"), or "" when the
 * phone is not a valid 10-digit mobile (with or without 0 / +91 in front).
 */
export function toWhatsAppNumber(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : "";
}

/** The fee reminder sent to a parent on WhatsApp. */
export function dueReminderMessage(
  row: DuesReportRow,
  due: number,
  months: number[],
  upToMonth: number
): string {
  const { student } = row;
  const monthNames = months.map((month) => monthLabel(month)).join(", ");
  return [
    "Dear Parent,",
    "",
    `This is a gentle reminder that the school fee of ${student.studentName} ` +
      `(Class ${toOrdinalLabel(student.className)}-${student.section}) is pending.`,
    "",
    `Amount due till ${monthLabel(upToMonth)}: ${formatRupees(due)}`,
    ...(monthNames ? [`Pending months: ${monthNames}`] : []),
    "",
    "Kindly pay at the earliest. Please ignore this message if already paid.",
    "",
    `${SCHOOL_DISPLAY_NAME}`,
    `Ph. ${SCHOOL_CONTACT.PHONE}`,
  ].join("\n");
}

/** wa.me link that opens WhatsApp with the reminder for the parent ("" = no valid number). */
export function dueReminderLink(
  row: DuesReportRow,
  due: number,
  months: number[],
  upToMonth: number
): string {
  const number = toWhatsAppNumber(row.phone);
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(dueReminderMessage(row, due, months, upToMonth))}`;
}
