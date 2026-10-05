/**
 * School-wide EXAM rules shared by the marks entry screen and the Cross List.
 *
 * The values live in ONE Firestore document (`panelSettings/exam`) but the
 * pure logic here never touches Firestore: every read goes through
 * `sanitizeExamRules` and every save through `validateExamRules`, so unknown
 * stored values or bad input always fall back to safe defaults.
 */

/** Minimum percentage of the total marks needed to pass an exam. */
export const PASS_PERCENTAGE = 33;

export interface ExamRules {
  /** "section" = one rank list per class-section; "class" = across all sections of a class. */
  rankScope: "section" | "class";
  /** "total" = pass decided on the total percentage; "subject" = must pass every subject. */
  passMode: "total" | "subject";
  /** Percentage of the total marks needed to pass when passMode is "total". */
  totalPassPercentage: number;
  /** Minimum percentage (of each subject's max) needed in EVERY subject when passMode is "subject". */
  subjectPassPercentage: number;
}

export const DEFAULT_EXAM_RULES: ExamRules = {
  rankScope: "section",
  passMode: "total",
  totalPassPercentage: PASS_PERCENTAGE,
  subjectPassPercentage: PASS_PERCENTAGE,
};

function readRankScope(value: unknown): ExamRules["rankScope"] {
  return value === "class" ? "class" : "section";
}

function readPassMode(value: unknown): ExamRules["passMode"] {
  return value === "subject" ? "subject" : "total";
}

function readPercentage(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const clamped = Math.min(Math.max(value, 0), 100);
  return Math.round(clamped * 100) / 100;
}

/**
 * Merges an unknown (stored or partial) value over the defaults. Every field
 * is sanitized: invalid rank/pass values fall back to the default, percentages
 * are clamped to 0-100 and rounded to two decimals.
 */
export function sanitizeExamRules(value: unknown): ExamRules {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    rankScope: readRankScope(data.rankScope),
    passMode: readPassMode(data.passMode),
    totalPassPercentage: readPercentage(
      data.totalPassPercentage,
      DEFAULT_EXAM_RULES.totalPassPercentage
    ),
    subjectPassPercentage: readPercentage(
      data.subjectPassPercentage,
      DEFAULT_EXAM_RULES.subjectPassPercentage
    ),
  };
}

/**
 * Returns an error message when the rules cannot be saved, or null when they
 * are valid. Both percentages must be finite numbers between 0 and 100.
 */
export function validateExamRules(rules: ExamRules): string | null {
  const fields: Array<[number, string]> = [
    [rules.totalPassPercentage, "Total pass percentage"],
    [rules.subjectPassPercentage, "Subject pass percentage"],
  ];
  for (const [value, label] of fields) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return `${label} must be a number.`;
    }
    if (value < 0 || value > 100) {
      return `${label} must be between 0 and 100.`;
    }
  }
  return null;
}