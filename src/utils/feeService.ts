/**
 * Firestore access of the fee module.
 *
 * - `feeStructures/{session}` - class-wise admission / monthly fee and the
 *   exam fee plan of a session.
 * - `feeSettings/general` - due day, late fee and receipt prefix.
 */
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import {
  COLLECTION,
  DEFAULT_FEE_SETTINGS,
  FEE_SETTINGS_DOC,
  SESSION_MONTHS,
} from "../constants";
import { db } from "../firebase/config";
import { emptyFeeStructure, toAmount } from "./feeStructure";
import type { ClassFee, ExamFeeItem, FeeSettings, FeeStructure } from "./type";

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

/** The fee structure of a session (empty when it was never saved). */
export async function loadFeeStructure(session: string): Promise<FeeStructure> {
  const snapshot = await getDoc(doc(db, COLLECTION.FEE_STRUCTURES, session));
  if (!snapshot.exists()) return emptyFeeStructure(session);
  const data = snapshot.data();
  return {
    session,
    classes: toClassFees(data.classes),
    examFees: Array.isArray(data.examFees)
      ? data.examFees.map(toExamFee).filter((item): item is ExamFeeItem => item !== null)
      : [],
  };
}

/** True when the session has a saved fee structure. */
export async function feeStructureExists(session: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, COLLECTION.FEE_STRUCTURES, session));
  return snapshot.exists();
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
