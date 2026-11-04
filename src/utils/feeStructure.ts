/**
 * Pure helpers of the fee module: month labels, empty documents and amount
 * parsing. The fee constants are in constants.ts, Firestore access is in
 * feeService.ts.
 */
import { MONTH_LABELS } from "../constants";
import type { FeeStructure } from "./type";

/** 4 -> "April". */
export const monthLabel = (month: number): string => MONTH_LABELS[month - 1] ?? "";

export function emptyFeeStructure(session: string): FeeStructure {
  return { session, classes: {}, examFees: [] };
}

/** A whole, non-negative rupee amount from user input or Firestore (else 0). */
export function toAmount(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

/** "1500" -> "₹1,500". */
export const formatRupees = (amount: number): string =>
  `₹${amount.toLocaleString("en-IN")}`;
