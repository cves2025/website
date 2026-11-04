/**
 * Pure logic of a student's fee account: building the lines of a session
 * from the fee structure, totals, and splitting a payment over the lines.
 * Firestore access is in feeService.ts.
 */
import { FEE_HEAD_LABELS, SESSION_MONTHS } from "../constants";
import { formatRupees, monthLabel } from "./feeStructure";
import type {
  FeeAccount,
  FeeAllocation,
  FeeHead,
  FeeLine,
  FeeSettings,
  FeeStructure,
  FeeTotals,
  FeeTransport,
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
): FeeLine => ({
  id,
  head,
  label,
  month,
  amount,
  discount: 0,
  paid: 0,
  waived: false,
  discountReason: "",
  waiveReason: "",
  carriedTo: "",
});

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

/**
 * True when nothing more is collected on the line: it was waived, or its
 * unpaid part was carried forward to the next session.
 */
export const isLineClosed = (line: FeeLine): boolean => line.waived || Boolean(line.carriedTo);

/** What is still to be paid on a line (0 when waived or carried forward). */
export const lineDue = (line: FeeLine): number =>
  isLineClosed(line) ? 0 : Math.max(0, line.amount - line.discount - line.paid);

/**
 * Totals of the lines. A closed line (waived / carried forward) only counts
 * what was paid on it, so `amount - discount - paid = due` always holds.
 */
export function feeTotals(lines: FeeLine[]): FeeTotals {
  return lines.reduce<FeeTotals>(
    (totals, line) => ({
      amount: totals.amount + (isLineClosed(line) ? line.paid : line.amount),
      discount: totals.discount + (isLineClosed(line) ? 0 : line.discount),
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

/* ------------------------------------------------------------ adjustments -- */

/**
 * The result of an adjustment: the changed account, the text for its change
 * log and how many lines were left alone because money was already paid on
 * them (an amount never drops below what was paid + discounted).
 */
export interface FeeChange {
  account: FeeAccount;
  text: string;
  skipped: number;
}

/** Months of a session from `from` to `to` (inclusive, April -> March). */
export function monthsInRange(from: number, to: number): number[] {
  const start = SESSION_MONTHS.indexOf(from);
  const end = SESSION_MONTHS.indexOf(to);
  return start === -1 || end < start ? [] : SESSION_MONTHS.slice(start, end + 1);
}

/** The most a line can be discounted (what is not paid yet). */
export const maxDiscount = (line: FeeLine): number => Math.max(0, line.amount - line.paid);

interface WantedLine {
  id: string;
  label: string;
  month: number | null;
  amount: number;
}

/**
 * Makes the lines of `head` match `wanted`: changes amounts, adds missing
 * lines and removes lines that are no longer wanted. A line with money paid
 * on it is never removed, and its amount never goes below paid + discount;
 * those lines are counted in `skipped`.
 */
function syncHead(
  lines: FeeLine[],
  head: FeeHead,
  wanted: WantedLine[]
): { lines: FeeLine[]; skipped: number } {
  const wantedById = new Map(wanted.map((item) => [item.id, item]));
  let skipped = 0;
  const next: FeeLine[] = [];
  for (const line of lines) {
    if (line.head !== head) {
      next.push(line);
      continue;
    }
    const target = wantedById.get(line.id);
    wantedById.delete(line.id);
    if (!target) {
      if (line.paid > 0) {
        skipped += 1;
        next.push(line);
      }
      continue;
    }
    if (target.amount === line.amount) {
      next.push({ ...line, label: target.label });
    } else if (target.amount >= line.paid + line.discount) {
      next.push({ ...line, label: target.label, amount: target.amount });
    } else {
      skipped += 1;
      next.push(line);
    }
  }
  for (const item of wantedById.values()) {
    if (item.amount > 0) next.push(newLine(item.id, head, item.label, item.month, item.amount));
  }
  return { lines: sortFeeLines(next), skipped };
}

const monthlyLines = (amount: number): WantedLine[] =>
  amount > 0
    ? SESSION_MONTHS.map((month) => ({
        id: `monthly-${month}`,
        label: FEE_HEAD_LABELS.monthly,
        month,
        amount,
      }))
    : [];

/**
 * Sets the student's own monthly fee for the whole session (e.g. 800 when
 * the class fee is 1000); null goes back to the class fee.
 */
export function applySpecialMonthlyFee(
  account: FeeAccount,
  classMonthly: number,
  special: number | null
): FeeChange {
  const { lines, skipped } = syncHead(account.lines, "monthly", monthlyLines(special ?? classMonthly));
  return {
    account: { ...account, lines, specialMonthlyFee: special },
    text:
      special === null
        ? `Special monthly fee removed (class fee ${formatRupees(classMonthly)})`
        : `Special monthly fee set to ${formatRupees(special)}`,
    skipped,
  };
}

/** Starts, changes or (with null) stops the transport fee. */
export function applyTransport(account: FeeAccount, transport: FeeTransport | null): FeeChange {
  const wanted = transport
    ? monthsInRange(transport.fromMonth, transport.toMonth).map((month) => ({
        id: `transport-${month}`,
        label: FEE_HEAD_LABELS.transport,
        month,
        amount: transport.amount,
      }))
    : [];
  const { lines, skipped } = syncHead(account.lines, "transport", wanted);
  return {
    account: { ...account, lines, transport },
    text: transport
      ? `Transport ${formatRupees(transport.amount)}/month, ${monthLabel(transport.fromMonth)} to ${monthLabel(transport.toMonth)}`
      : "Transport removed",
    skipped,
  };
}

/**
 * Brings the monthly, exam and admission fees in line with the current fee
 * structure (special fee, transport and extra charges stay as they are).
 * The admission fee is only updated, never added.
 */
export function applyFeeStructure(account: FeeAccount, structure: FeeStructure): FeeChange {
  const fee = structure.classes[account.className];
  const monthly = syncHead(account.lines, "monthly", monthlyLines(account.specialMonthlyFee ?? fee?.monthly ?? 0));
  const exams = syncHead(
    monthly.lines,
    "exam",
    structure.examFees.map((exam) => ({
      id: `exam-${exam.id}`,
      label: exam.name,
      month: exam.month,
      amount: exam.amounts[account.className] ?? 0,
    }))
  );
  const hasAdmission = exams.lines.some((line) => line.head === "admission");
  const admission = syncHead(
    exams.lines,
    "admission",
    hasAdmission
      ? [{ id: "admission", label: FEE_HEAD_LABELS.admission, month: null, amount: fee?.admission ?? 0 }]
      : []
  );
  return {
    account: { ...account, lines: admission.lines },
    text: `Refreshed from the ${account.session} fee structure`,
    skipped: monthly.skipped + exams.skipped + admission.skipped,
  };
}

const findLine = (account: FeeAccount, lineId: string): FeeLine => {
  const line = account.lines.find((item) => item.id === lineId);
  if (!line) throw new Error("FEE_LINE_NOT_FOUND");
  return line;
};

/** Sets a fixed discount on one line (0 removes it). */
export function applyDiscount(
  account: FeeAccount,
  lineId: string,
  discount: number,
  reason: string
): FeeChange {
  const line = findLine(account, lineId);
  if (discount > maxDiscount(line)) throw new Error("FEE_DISCOUNT_TOO_HIGH");
  return {
    account: {
      ...account,
      lines: account.lines.map((item) =>
        item.id === lineId
          ? { ...item, discount, discountReason: discount ? reason.trim() : "" }
          : item
      ),
    },
    text: discount
      ? `Discount ${formatRupees(discount)} on ${lineTitle(line, account.session)}${reason.trim() ? ` - ${reason.trim()}` : ""}`
      : `Discount removed from ${lineTitle(line, account.session)}`,
    skipped: 0,
  };
}

/** Waives (fee maafi) or un-waives lines; the reason is kept on each line. */
export function applyWaive(
  account: FeeAccount,
  lineIds: string[],
  waived: boolean,
  reason: string
): FeeChange {
  const titles = account.lines
    .filter((line) => lineIds.includes(line.id))
    .map((line) => lineTitle(line, account.session));
  return {
    account: {
      ...account,
      lines: account.lines.map((line) =>
        lineIds.includes(line.id)
          ? { ...line, waived, waiveReason: waived ? reason.trim() : "" }
          : line
      ),
    },
    text: `${waived ? "Waived" : "Waive undone"}: ${titles.join(", ")}${waived && reason.trim() ? ` - ${reason.trim()}` : ""}`,
    skipped: 0,
  };
}

/** Adds an extra charge (re-admission, annual charge ...). */
export function applyExtraCharge(
  account: FeeAccount,
  label: string,
  amount: number,
  month: number | null
): FeeChange {
  const line = newLine(`extra-${Date.now()}`, "extra", label.trim(), month, amount);
  return {
    account: { ...account, lines: sortFeeLines([...account.lines, line]) },
    text: `Extra charge added: ${lineTitle(line, account.session)} ${formatRupees(amount)}`,
    skipped: 0,
  };
}

/** Removes an extra charge that nothing was paid on. */
export function removeExtraCharge(account: FeeAccount, lineId: string): FeeChange {
  const line = findLine(account, lineId);
  if (line.head !== "extra" || line.paid > 0) throw new Error("FEE_LINE_LOCKED");
  return {
    account: { ...account, lines: account.lines.filter((item) => item.id !== lineId) },
    text: `Extra charge removed: ${lineTitle(line, account.session)}`,
    skipped: 0,
  };
}

/** The lines after a cancelled receipt's allocations are taken off `paid`. */
export function revertAllocations(lines: FeeLine[], allocations: FeeAllocation[]): FeeLine[] {
  const byLine = new Map(allocations.map((item) => [item.lineId, item.amount]));
  return lines.map((line) =>
    byLine.has(line.id)
      ? { ...line, paid: Math.max(0, line.paid - (byLine.get(line.id) ?? 0)) }
      : line
  );
}

/* ---------------------------------------------- late fee & carry forward -- */

/** "yyyy-MM-dd" by which the monthly fee of `month` is due. */
export function dueDateOf(session: string, month: number, dueDay: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${monthYear(session, month)}-${pad(month)}-${pad(dueDay)}`;
}

/**
 * Adds the late fee for every month whose monthly fee is still due after
 * its due date (when the late fee is ON). A month gets it only once; an
 * existing late fee line is never changed or removed.
 *
 * @param today "yyyy-MM-dd"
 */
export function applyLateFees(
  account: FeeAccount,
  settings: FeeSettings,
  today: string
): FeeAccount {
  if (!settings.lateFeeEnabled || settings.lateFeeAmount <= 0) return account;
  const added: FeeLine[] = [];
  for (const line of account.lines) {
    if (line.head !== "monthly" || line.month === null || lineDue(line) === 0) continue;
    const id = `lateFee-${line.month}`;
    if (account.lines.some((item) => item.id === id)) continue;
    if (today <= dueDateOf(account.session, line.month, settings.dueDay)) continue;
    added.push(newLine(id, "lateFee", FEE_HEAD_LABELS.lateFee, line.month, settings.lateFeeAmount));
  }
  return added.length ? { ...account, lines: sortFeeLines([...account.lines, ...added]) } : account;
}

/** Id of the Previous Dues line brought in from `fromSession`. */
export const previousDuesLineId = (fromSession: string) => `previousDues-${fromSession}`;

/**
 * Closes everything still due on the account of the old session, marking it
 * "carried to `toSession`". The amount goes to the new session's account.
 */
export function applyCarryOut(account: FeeAccount, toSession: string): FeeChange & { amount: number } {
  const amount = feeTotals(account.lines).due;
  return {
    account: {
      ...account,
      lines: account.lines.map((line) => (lineDue(line) > 0 ? { ...line, carriedTo: toSession } : line)),
    },
    text: `Dues of ${formatRupees(amount)} carried forward to ${toSession}`,
    skipped: 0,
    amount,
  };
}

/** Adds the Previous Dues line brought in from `fromSession`. */
export function applyCarryIn(account: FeeAccount, fromSession: string, amount: number): FeeChange {
  const line = newLine(
    previousDuesLineId(fromSession),
    "previousDues",
    `${FEE_HEAD_LABELS.previousDues} (${fromSession})`,
    null,
    amount
  );
  return {
    account: { ...account, lines: sortFeeLines([...account.lines, line]) },
    text: `Previous dues of ${formatRupees(amount)} brought in from ${fromSession}`,
    skipped: 0,
  };
}
