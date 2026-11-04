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
  buildFeeLines,
  feeAccountId,
  feeTotals,
  formatReceiptNo,
  sortFeeLines,
} from "./feeAccount";
import { emptyFeeStructure, toAmount } from "./feeStructure";
import type {
  ClassFee,
  ExamFeeItem,
  FeeAccount,
  FeeHead,
  FeeLine,
  FeePayment,
  FeePaymentInput,
  FeeSettings,
  FeeStructure,
  FeeStudent,
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
  };
}

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
  };
}

/**
 * True when the student has no enrollment in an earlier session, i.e. was
 * admitted in `session` and owes the admission fee.
 */
async function isNewAdmission(studentId: string, session: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION.ENROLLMENTS), where("studentId", "==", studentId))
  );
  return !snapshot.docs.some((item) => {
    const data = item.data();
    return data.isDeleted !== true && toText(data.academicYear) < session;
  });
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
  const snapshot = await getDoc(doc(db, COLLECTION.FEE_ACCOUNTS, id));
  if (snapshot.exists()) {
    // Name / class may have been edited since; show the current details.
    return {
      account: { ...toFeeAccount(id, snapshot.data()), ...pickStudent(student), session },
      saved: true,
    };
  }
  const [{ structure }, chargeAdmission] = await Promise.all([
    fetchFeeStructure(session),
    isNewAdmission(student.studentId, session),
  ]);
  return {
    account: {
      id,
      session,
      ...pickStudent(student),
      lines: buildFeeLines(structure, student.className, chargeAdmission),
    },
    saved: false,
  };
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
  receiptPrefix: string,
  collectedBy: { uid: string; name: string }
): Promise<FeePayment> {
  const accountRef = doc(db, COLLECTION.FEE_ACCOUNTS, account.id);
  const counterRef = doc(db, COLLECTION.FEE_COUNTERS, account.session);

  return runTransaction(db, async (transaction) => {
    const accountSnap = await transaction.get(accountRef);
    const counterSnap = await transaction.get(counterRef);
    const current: FeeAccount = accountSnap.exists()
      ? { ...toFeeAccount(account.id, accountSnap.data()), ...pickStudent(account) }
      : account;

    const allocations = allocatePayment(current, input.amount, input.lineIds);
    const allocated = allocations.reduce((sum, item) => sum + item.amount, 0);
    if (input.amount <= 0 || allocated < input.amount) throw new Error(FEE_OVERPAID);

    const serial = toAmount(counterSnap.exists() ? counterSnap.data().lastSerial : 0) + 1;
    const lines = applyAllocations(current.lines, allocations);
    const payment: FeePayment = {
      id: `${account.session}_${String(serial).padStart(4, "0")}`,
      receiptNo: formatReceiptNo(receiptPrefix, account.session, serial),
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
    };
    const { id: paymentId, ...paymentData } = payment;

    transaction.set(counterRef, { session: account.session, lastSerial: serial });
    transaction.set(
      accountRef,
      {
        ...pickStudent(current),
        session: current.session,
        lines,
        // Kept on the account for the dues report (no need to read lines).
        totals: feeTotals(lines),
        ...(accountSnap.exists() ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
        updatedBy: collectedBy.uid,
      },
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
