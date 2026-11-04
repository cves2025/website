/**
 * Firestore access of the fee module.
 *
 * - `feeStructures/{session}` - class-wise admission / monthly fee and the
 *   exam fee plan of a session.
 * - `feeSettings/general` - due day, late fee and receipt prefix.
 * - `feeAccounts/{session}_{studentId}` - a student's fee lines of a session.
 * - `feePayments/{session}_{serial}` - one document per receipt.
 * - `feeCounters/{session}` - the last receipt serial of the session.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";

import {
  CLASSES,
  COLLECTION,
  DEFAULT_FEE_SETTINGS,
  FEE_SETTINGS_DOC,
  PAYMENT_MODES,
  SESSION_MONTHS,
} from "../constants";
import { db } from "../firebase/config";
import {
  allocatePayment,
  applyAllocations,
  applyCarryIn,
  applyCarryOut,
  applyLateFees,
  buildFeeLines,
  feeAccountId,
  feeTotals,
  formatReceiptNo,
  previousDuesLineId,
  revertAllocations,
  sortFeeLines,
} from "./feeAccount";
import { planCarryForward } from "./feeReport";
import { previousAcademicYear } from "./generateAcademicYears";
import { todayKey } from "./holidayCalendar";
import type { FeeChange } from "./feeAccount";
import { emptyFeeStructure, formatRupees, toAmount } from "./feeStructure";
import { loadRollNumbers } from "./rollNumbers";
import type {
  CarryForwardItem,
  ClassFee,
  DuesReportRow,
  ExamFeeItem,
  FeeAccount,
  FeeHead,
  FeeLine,
  FeeLogEntry,
  FeePayment,
  FeePaymentInput,
  FeeSettings,
  FeeStructure,
  FeeStudent,
  FeeTransport,
} from "./type";

const toAmountMap = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, amount]) => [
      key,
      toAmount(amount),
    ])
  );
};

const toClassFees = (value: unknown): Record<string, ClassFee> => {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, Record<string, unknown>>).map(
      ([className, fee]) => [
        className,
        { admission: toAmount(fee?.admission), monthly: toAmount(fee?.monthly) },
      ]
    )
  );
};

function toExamFee(value: unknown): ExamFeeItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const month = Number(item.month);
  if (typeof item.id !== "string" || !SESSION_MONTHS.includes(month)) return null;
  return {
    id: item.id,
    name: typeof item.name === "string" ? item.name : "",
    month,
    amounts: toAmountMap(item.amounts),
  };
}

/** The fee structure of a session; `saved: false` (and empty) when never saved. */
export async function fetchFeeStructure(
  session: string
): Promise<{ structure: FeeStructure; saved: boolean }> {
  const snapshot = await getDoc(doc(db, COLLECTION.FEE_STRUCTURES, session));
  if (!snapshot.exists()) return { structure: emptyFeeStructure(session), saved: false };
  const data = snapshot.data();
  return {
    structure: {
      session,
      classes: toClassFees(data.classes),
      examFees: Array.isArray(data.examFees)
        ? data.examFees.map(toExamFee).filter((item): item is ExamFeeItem => item !== null)
        : [],
    },
    saved: true,
  };
}

export async function saveFeeStructure(
  structure: FeeStructure,
  updatedBy: string
): Promise<void> {
  await setDoc(doc(db, COLLECTION.FEE_STRUCTURES, structure.session), {
    session: structure.session,
    classes: structure.classes,
    examFees: structure.examFees,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

export async function loadFeeSettings(): Promise<FeeSettings> {
  const snapshot = await getDoc(doc(db, COLLECTION.FEE_SETTINGS, FEE_SETTINGS_DOC));
  if (!snapshot.exists()) return { ...DEFAULT_FEE_SETTINGS };
  const data = snapshot.data();
  const dueDay = Number(data.dueDay);
  return {
    dueDay:
      Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 28
        ? dueDay
        : DEFAULT_FEE_SETTINGS.dueDay,
    lateFeeEnabled: data.lateFeeEnabled === true,
    lateFeeAmount: toAmount(data.lateFeeAmount),
    receiptPrefix:
      typeof data.receiptPrefix === "string" && data.receiptPrefix.trim()
        ? data.receiptPrefix.trim()
        : DEFAULT_FEE_SETTINGS.receiptPrefix,
  };
}

export async function saveFeeSettings(
  settings: FeeSettings,
  updatedBy: string
): Promise<void> {
  await setDoc(doc(db, COLLECTION.FEE_SETTINGS, FEE_SETTINGS_DOC), {
    ...settings,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

/* --------------------------------------------------- accounts & payments -- */

const toText = (value: unknown) => (typeof value === "string" ? value : "");

const FEE_HEADS = new Set<string>([
  "previousDues",
  "admission",
  "monthly",
  "transport",
  "exam",
  "extra",
  "lateFee",
]);

const pickStudent = (source: FeeStudent): FeeStudent => ({
  studentId: source.studentId,
  studentName: source.studentName,
  className: source.className,
  section: source.section,
  admissionNo: source.admissionNo,
  fatherName: source.fatherName,
});

function toFeeLine(value: unknown): FeeLine | null {
  if (!value || typeof value !== "object") return null;
  const line = value as Record<string, unknown>;
  if (typeof line.id !== "string" || !FEE_HEADS.has(String(line.head))) return null;
  const month = Number(line.month);
  return {
    id: line.id,
    head: line.head as FeeHead,
    label: toText(line.label),
    month: SESSION_MONTHS.includes(month) ? month : null,
    amount: toAmount(line.amount),
    discount: toAmount(line.discount),
    paid: toAmount(line.paid),
    waived: line.waived === true,
    discountReason: toText(line.discountReason),
    waiveReason: toText(line.waiveReason),
    carriedTo: toText(line.carriedTo),
  };
}

function toTransport(value: unknown): FeeTransport | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const fromMonth = Number(data.fromMonth);
  const toMonth = Number(data.toMonth);
  const amount = toAmount(data.amount);
  if (!amount || !SESSION_MONTHS.includes(fromMonth) || !SESSION_MONTHS.includes(toMonth)) {
    return null;
  }
  return { amount, fromMonth, toMonth };
}

const toLog = (value: unknown): FeeLogEntry[] =>
  Array.isArray(value)
    ? value.map((item: Record<string, unknown>) => ({
        at: toText(item?.at),
        byName: toText(item?.byName),
        text: toText(item?.text),
      }))
    : [];

function toFeeAccount(id: string, data: DocumentData): FeeAccount {
  return {
    id,
    session: toText(data.session),
    studentId: toText(data.studentId),
    studentName: toText(data.studentName),
    className: toText(data.className),
    section: toText(data.section),
    admissionNo: toText(data.admissionNo),
    fatherName: toText(data.fatherName),
    lines: Array.isArray(data.lines)
      ? sortFeeLines(data.lines.map(toFeeLine).filter((line): line is FeeLine => line !== null))
      : [],
    specialMonthlyFee:
      typeof data.specialMonthlyFee === "number" ? toAmount(data.specialMonthlyFee) : null,
    transport: toTransport(data.transport),
    log: toLog(data.log),
  };
}

function toFeePayment(id: string, data: DocumentData): FeePayment {
  return {
    id,
    receiptNo: toText(data.receiptNo),
    serial: toAmount(data.serial),
    session: toText(data.session),
    accountId: toText(data.accountId),
    studentId: toText(data.studentId),
    studentName: toText(data.studentName),
    className: toText(data.className),
    section: toText(data.section),
    admissionNo: toText(data.admissionNo),
    fatherName: toText(data.fatherName),
    date: toText(data.date),
    mode: PAYMENT_MODES.includes(data.mode) ? data.mode : "Cash",
    reference: toText(data.reference),
    note: toText(data.note),
    amount: toAmount(data.amount),
    allocations: Array.isArray(data.allocations)
      ? data.allocations.map((item: Record<string, unknown>) => ({
          lineId: toText(item?.lineId),
          label: toText(item?.label),
          amount: toAmount(item?.amount),
        }))
      : [],
    status: data.status === "cancelled" ? "cancelled" : "active",
    collectedByName: toText(data.collectedByName),
    cancelReason: toText(data.cancelReason),
    cancelledByName: toText(data.cancelledByName),
  };
}

/** Firestore accepts at most 30 values in a single `in` filter. */
const IDS_PER_IN_QUERY = 30;

/**
 * The students (of `studentIds`) with an enrollment in a session before
 * `session` - i.e. not admitted in `session`, so no admission fee.
 */
async function studentsEnrolledBefore(
  studentIds: string[],
  session: string
): Promise<Set<string>> {
  const chunks: string[][] = [];
  for (let index = 0; index < studentIds.length; index += IDS_PER_IN_QUERY) {
    chunks.push(studentIds.slice(index, index + IDS_PER_IN_QUERY));
  }
  const snapshots = await Promise.all(
    chunks.map((ids) =>
      getDocs(query(collection(db, COLLECTION.ENROLLMENTS), where("studentId", "in", ids)))
    )
  );
  const earlier = new Set<string>();
  snapshots.forEach((snapshot) =>
    snapshot.docs.forEach((item) => {
      const data = item.data();
      if (data.isDeleted !== true && toText(data.academicYear) < session) {
        earlier.add(toText(data.studentId));
      }
    })
  );
  return earlier;
}

/** True when the student was admitted in `session` (owes the admission fee). */
async function isNewAdmission(studentId: string, session: string): Promise<boolean> {
  return !(await studentsEnrolledBefore([studentId], session)).has(studentId);
}

/**
 * The student's fee account of a session. An account is only written on its
 * first payment or change; until then it is built from the fee structure
 * (`saved: false`), so later structure changes still reach it.
 */
export async function loadFeeAccount(
  session: string,
  student: FeeStudent
): Promise<{ account: FeeAccount; saved: boolean }> {
  const id = feeAccountId(session, student.studentId);
  const [snapshot, settings] = await Promise.all([
    getDoc(doc(db, COLLECTION.FEE_ACCOUNTS, id)),
    loadFeeSettings(),
  ]);
  if (snapshot.exists()) {
    // Name / class may have been edited since; show the current details.
    const account = { ...toFeeAccount(id, snapshot.data()), ...pickStudent(student), session };
    return { account: applyLateFees(account, settings, todayKey()), saved: true };
  }
  const [{ structure }, chargeAdmission] = await Promise.all([
    fetchFeeStructure(session),
    isNewAdmission(student.studentId, session),
  ]);
  return {
    account: applyLateFees(
      unsavedAccount(session, student, structure, chargeAdmission),
      settings,
      todayKey()
    ),
    saved: false,
  };
}

/** An account that only exists on screen (no payment or change saved yet). */
const unsavedAccount = (
  session: string,
  student: FeeStudent,
  structure: FeeStructure,
  chargeAdmission: boolean
): FeeAccount => ({
  id: feeAccountId(session, student.studentId),
  session,
  ...pickStudent(student),
  lines: buildFeeLines(structure, student.className, chargeAdmission),
  specialMonthlyFee: null,
  transport: null,
  log: [],
});

/**
 * Every student of a session (optionally one class / section) with the fee
 * account: the saved one, or one built from the fee structure for students
 * who have not paid anything yet - so they are on the dues report too.
 * Students are in class order, then by roll number and name.
 */
export async function loadDuesReport(
  session: string,
  className: string,
  section: string
): Promise<DuesReportRow[]> {
  const filters = [where("academicYear", "==", session)];
  if (className) filters.push(where("className", "==", className));
  if (section) filters.push(where("section", "==", section));

  const [enrollmentSnap, accountSnap, { structure }, settings] = await Promise.all([
    getDocs(query(collection(db, COLLECTION.ENROLLMENTS), ...filters)),
    getDocs(query(collection(db, COLLECTION.FEE_ACCOUNTS), where("session", "==", session))),
    fetchFeeStructure(session),
    loadFeeSettings(),
  ]);
  const today = todayKey();

  const students: FeeStudent[] = enrollmentSnap.docs
    .filter((item) => item.data().isDeleted !== true)
    .map((item) => {
      const data = item.data();
      return {
        studentId: toText(data.studentId).trim() || item.id,
        studentName: String(
          data.studentName || `${data.firstName ?? ""} ${data.lastName ?? ""}`
        ).trim(),
        className: toText(data.className),
        section: toText(data.section),
        admissionNo: String(data.enrollment ?? ""),
        fatherName: toText(data.fatherName),
      };
    });

  const saved = new Map(
    accountSnap.docs.map((item) => {
      const account = toFeeAccount(item.id, item.data());
      return [account.studentId, account] as const;
    })
  );
  const unsavedIds = students
    .filter((student) => !saved.has(student.studentId))
    .map((student) => student.studentId);
  const [enrolledBefore, rollNumbers] = await Promise.all([
    studentsEnrolledBefore(unsavedIds, session),
    loadRollNumbers(session, [...new Set(students.map((student) => student.className))]),
  ]);

  const classOrder = (name: string) => CLASSES.indexOf(name);
  return students
    .map((student) => {
      const account = saved.get(student.studentId);
      return {
        student,
        rollNumber: rollNumbers.get(student.studentId) ?? 0,
        account: applyLateFees(
          account
            ? { ...account, ...pickStudent(student), session }
            : unsavedAccount(session, student, structure, !enrolledBefore.has(student.studentId)),
          settings,
          today
        ),
        saved: Boolean(account),
      };
    })
    .sort(
      (a, b) =>
        classOrder(a.student.className) - classOrder(b.student.className) ||
        a.student.section.localeCompare(b.student.section) ||
        (a.rollNumber || Infinity) - (b.rollNumber || Infinity) ||
        a.student.studentName.localeCompare(b.student.studentName)
    );
}

/** Receipts dated `from` to `to` ("yyyy-MM-dd", inclusive), newest first. */
export async function loadPaymentsBetween(from: string, to: string): Promise<FeePayment[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION.FEE_PAYMENTS),
      where("date", ">=", from),
      where("date", "<=", to)
    )
  );
  return snapshot.docs
    .map((item) => toFeePayment(item.id, item.data()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.serial - a.serial);
}

/** Receipts of one fee account, newest first. */
export async function loadAccountPayments(accountId: string): Promise<FeePayment[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION.FEE_PAYMENTS), where("accountId", "==", accountId))
  );
  return snapshot.docs
    .map((item) => toFeePayment(item.id, item.data()))
    .sort((a, b) => b.serial - a.serial);
}

export async function loadFeePayment(id: string): Promise<FeePayment | null> {
  const snapshot = await getDoc(doc(db, COLLECTION.FEE_PAYMENTS, id));
  return snapshot.exists() ? toFeePayment(snapshot.id, snapshot.data()) : null;
}

/** Most recent change-log entries kept on an account. */
const LOG_LIMIT = 200;

/** Who saves a fee change. */
export interface FeeActor {
  uid: string;
  name: string;
}

/** The fields written for an account (`isNew` adds `createdAt`). */
function accountFields(account: FeeAccount, actor: FeeActor, isNew: boolean) {
  return {
    ...pickStudent(account),
    session: account.session,
    lines: account.lines,
    specialMonthlyFee: account.specialMonthlyFee,
    transport: account.transport,
    log: account.log.slice(-LOG_LIMIT),
    // Kept on the account for the dues report (no need to read lines).
    totals: feeTotals(account.lines),
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
  };
}

/** Thrown by collectFeePayment when the amount is more than the lines owe. */
export const FEE_OVERPAID = "FEE_OVERPAID";

/**
 * Saves a payment in one transaction: the next receipt serial of the
 * session, the receipt and the account with the paid amounts. The amount is
 * split over the lines as they are in Firestore at that moment, so two
 * admins collecting at once can never overpay a line.
 *
 * @param account the account as shown (used when it is not saved yet)
 * @returns the saved receipt
 */
export async function collectFeePayment(
  account: FeeAccount,
  input: FeePaymentInput,
  collectedBy: FeeActor
): Promise<FeePayment> {
  const accountRef = doc(db, COLLECTION.FEE_ACCOUNTS, account.id);
  const counterRef = doc(db, COLLECTION.FEE_COUNTERS, account.session);
  const settings = await loadFeeSettings();
  const today = todayKey();

  return runTransaction(db, async (transaction) => {
    const accountSnap = await transaction.get(accountRef);
    const counterSnap = await transaction.get(counterRef);
    const current = applyLateFees(
      accountSnap.exists()
        ? { ...toFeeAccount(account.id, accountSnap.data()), ...pickStudent(account) }
        : account,
      settings,
      today
    );

    const allocations = allocatePayment(current, input.amount, input.lineIds);
    const allocated = allocations.reduce((sum, item) => sum + item.amount, 0);
    if (input.amount <= 0 || allocated < input.amount) throw new Error(FEE_OVERPAID);

    const serial = toAmount(counterSnap.exists() ? counterSnap.data().lastSerial : 0) + 1;
    const lines = applyAllocations(current.lines, allocations);
    const payment: FeePayment = {
      id: `${account.session}_${String(serial).padStart(4, "0")}`,
      receiptNo: formatReceiptNo(settings.receiptPrefix, account.session, serial),
      serial,
      session: account.session,
      accountId: account.id,
      ...pickStudent(current),
      date: input.date,
      mode: input.mode,
      reference: input.reference.trim(),
      note: input.note.trim(),
      amount: input.amount,
      allocations,
      status: "active",
      collectedByName: collectedBy.name,
      cancelReason: "",
      cancelledByName: "",
    };
    const { id: paymentId, ...paymentData } = payment;

    transaction.set(counterRef, { session: account.session, lastSerial: serial });
    transaction.set(
      accountRef,
      accountFields({ ...current, lines }, collectedBy, !accountSnap.exists()),
      { merge: true }
    );
    transaction.set(doc(db, COLLECTION.FEE_PAYMENTS, paymentId), {
      ...paymentData,
      createdAt: serverTimestamp(),
      createdBy: collectedBy.uid,
    });
    return payment;
  });
}

/**
 * Applies an adjustment (discount, waive, special fee ...) to the account as
 * it is in Firestore at that moment - or to `account` when it is not saved
 * yet - and saves it with a change-log entry.
 *
 * @returns how many lines the change had to leave alone (see FeeChange)
 */
export async function updateFeeAccount(
  account: FeeAccount,
  change: (current: FeeAccount) => FeeChange,
  actor: FeeActor
): Promise<number> {
  const accountRef = doc(db, COLLECTION.FEE_ACCOUNTS, account.id);
  const settings = await loadFeeSettings();
  const today = todayKey();
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(accountRef);
    const current = applyLateFees(
      snapshot.exists()
        ? { ...toFeeAccount(account.id, snapshot.data()), ...pickStudent(account) }
        : account,
      settings,
      today
    );
    const result = change(current);
    const entry: FeeLogEntry = { at: new Date().toISOString(), byName: actor.name, text: result.text };
    transaction.set(
      accountRef,
      accountFields({ ...result.account, log: [...current.log, entry] }, actor, !snapshot.exists())
    );
    return result.skipped;
  });
}

/**
 * Cancels a receipt: it stays in Firestore (marked cancelled, with the
 * reason) and the amounts it paid become due again on the account.
 */
export async function cancelFeePayment(
  payment: FeePayment,
  reason: string,
  actor: FeeActor
): Promise<void> {
  const paymentRef = doc(db, COLLECTION.FEE_PAYMENTS, payment.id);
  const accountRef = doc(db, COLLECTION.FEE_ACCOUNTS, payment.accountId);
  await runTransaction(db, async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);
    const accountSnap = await transaction.get(accountRef);
    if (!paymentSnap.exists() || !accountSnap.exists()) throw new Error("FEE_NOT_FOUND");
    if (paymentSnap.data().status === "cancelled") return;

    const current = toFeeAccount(payment.accountId, accountSnap.data());
    const allocations = toFeePayment(payment.id, paymentSnap.data()).allocations;
    const entry: FeeLogEntry = {
      at: new Date().toISOString(),
      byName: actor.name,
      text: `Receipt ${payment.receiptNo} (${formatRupees(payment.amount)}) cancelled - ${reason.trim()}`,
    };
    transaction.update(paymentRef, {
      status: "cancelled",
      cancelReason: reason.trim(),
      cancelledByName: actor.name,
      cancelledBy: actor.uid,
      cancelledAt: serverTimestamp(),
    });
    transaction.set(
      accountRef,
      accountFields(
        {
          ...current,
          lines: revertAllocations(current.lines, allocations),
          log: [...current.log, entry],
        },
        actor,
        false
      )
    );
  });
}

/* ---------------------------------------------------------- carry forward -- */

/**
 * The students of `session` whose dues of the session before can be carried
 * forward (see planCarryForward).
 */
export async function loadCarryForwardPlan(session: string): Promise<CarryForwardItem[]> {
  const fromSession = previousAcademicYear(session);
  const [rows, previousRows] = await Promise.all([
    loadDuesReport(session, "", ""),
    loadDuesReport(fromSession, "", ""),
  ]);
  return planCarryForward(rows, previousRows, fromSession);
}

/**
 * Carries one student's dues forward in a single transaction: everything due
 * on the old session's account is closed ("carried to") and a Previous Dues
 * line with that amount is added to the new session's account. Both
 * accounts are re-read first, so a payment made meanwhile is respected and
 * running it twice never adds the dues twice.
 *
 * @returns the amount carried (0 when there was nothing left to carry)
 */
export async function carryForwardStudent(item: CarryForwardItem, actor: FeeActor): Promise<number> {
  const fromRef = doc(db, COLLECTION.FEE_ACCOUNTS, item.fromAccount.id);
  const toRef = doc(db, COLLECTION.FEE_ACCOUNTS, item.toAccount.id);
  const settings = await loadFeeSettings();
  const today = todayKey();
  const fromSession = item.fromAccount.session;

  return runTransaction(db, async (transaction) => {
    const fromSnap = await transaction.get(fromRef);
    const toSnap = await transaction.get(toRef);
    const from = applyLateFees(
      fromSnap.exists() ? toFeeAccount(item.fromAccount.id, fromSnap.data()) : item.fromAccount,
      settings,
      today
    );
    const to = applyLateFees(
      toSnap.exists()
        ? { ...toFeeAccount(item.toAccount.id, toSnap.data()), ...pickStudent(item.toAccount) }
        : item.toAccount,
      settings,
      today
    );
    if (to.lines.some((line) => line.id === previousDuesLineId(fromSession))) return 0;

    const out = applyCarryOut(from, to.session);
    if (out.amount <= 0) return 0;
    const into = applyCarryIn(to, fromSession, out.amount);
    const at = new Date().toISOString();

    transaction.set(
      fromRef,
      accountFields(
        { ...out.account, log: [...from.log, { at, byName: actor.name, text: out.text }] },
        actor,
        !fromSnap.exists()
      )
    );
    transaction.set(
      toRef,
      accountFields(
        { ...into.account, log: [...to.log, { at, byName: actor.name, text: into.text }] },
        actor,
        !toSnap.exists()
      )
    );
    return out.amount;
  });
}
