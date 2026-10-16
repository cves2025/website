import { isSchemeClass } from "./examMarksScheme";
import type { ExamDoc, SubjectMarksRecord } from "./type";

/**
 * "written-oral": PG / Nursery / LKG / UKG (one table, Written + Oral rows)
 * "scheme":       Class 1-8 (Theory table + Practical table)
 */
export type ResultLayout = "written-oral" | "scheme";

export function getResultLayout(className: string): ResultLayout {
  return isSchemeClass(className) ? "scheme" : "written-oral";
}

export const ABSENT_LABEL = "AB";
export const EXEMPT_LABEL = "EX";
export const EMPTY_LABEL = "-";

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Text shown in a marks cell: grade / AB / EX / marks / "-". */
export function resultCellText(
  record: SubjectMarksRecord | null | undefined
): string {
  if (!record) return EMPTY_LABEL;
  if (typeof record.grade === "string" && record.grade.trim() !== "") {
    return record.grade.trim();
  }
  if (record.status === "absent") return ABSENT_LABEL;
  if (record.status === "exempt") return EXEMPT_LABEL;
  return typeof record.obtained === "number" && Number.isFinite(record.obtained)
    ? String(round2(record.obtained))
    : EMPTY_LABEL;
}

/**
 * True when the record takes part in totals: numeric, not exempt,
 * not a grade (Scholastic) record.
 */
export function recordCountsInTotal(
  record: SubjectMarksRecord | null | undefined
): record is SubjectMarksRecord {
  if (!record) return false;
  if (record.status === "exempt") return false;
  if (typeof record.grade === "string" && record.grade.trim() !== "") {
    return false;
  }
  return true;
}

/** Obtained marks that count in a total (absent counts as 0). */
export function recordObtained(
  record: SubjectMarksRecord | null | undefined
): number {
  if (!recordCountsInTotal(record)) return 0;
  return typeof record.obtained === "number" && Number.isFinite(record.obtained)
    ? record.obtained
    : 0;
}

/** Max marks that count in a total (0 for exempt / grade / missing). */
export function recordMax(
  record: SubjectMarksRecord | null | undefined
): number {
  if (!recordCountsInTotal(record)) return 0;
  return typeof record.maxMarks === "number" && Number.isFinite(record.maxMarks)
    ? record.maxMarks
    : 0;
}

export function percentageOf(obtained: number, max: number): number {
  return max > 0 ? round2((obtained / max) * 100) : 0;
}

/**
 * Report card table ke columns isi fixed order mein dikhte hain:
 *   Term-I  : Unit Test I, Half Yearly
 *   Term-II : Unit Test II, Annual / Final
 * Kisi bhi matlab ke naam (dates ki parwah kiye bina) is order se aate hain;
 * baaki custom exam naam date + name se peeche sort hote hain.
 */
function resultExamPriority(exam: ExamDoc): number {
  const name = exam.examName.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (/^unit test/.test(name)) {
    const suffix = name.replace(/^unit test/, "").trim();
    // Unit Test II (aakhri unit test) Term-II mein Half Yearly ke baad aata hai.
    return /^(2|two|ii)$/.test(suffix) ? 2 : 0;
  }
  if (/^half yearly/.test(name)) return 1;
  if (/^(annual|final)/.test(name)) return 3;
  return 4;
}

/** Header label of an exam, e.g. "Unit Test 1" -> "Unit Test I", "Annual Exam" -> "Annual". */
export function resultExamLabel(examName: string): string {
  const trimmed = examName.trim();
  const normalized = trimmed.toLowerCase().replace(/[\s_-]+/g, " ");
  if (/^unit test/.test(normalized)) {
    const suffix = normalized.replace(/^unit test/, "").trim();
    if (/^(1|one|i)$/.test(suffix)) return "Unit Test I";
    if (/^(2|two|ii)$/.test(suffix)) return "Unit Test II";
    return "Unit Test";
  }
  if (/^half yearly/.test(normalized)) return "Half Yearly";
  if (/^annual(\s*exam(ination)?)?$/.test(normalized)) return "Annual";
  if (/^final(\s*exam(ination)?)?$/.test(normalized)) return "Final";
  return trimmed;
}

export function compareExamsForResult(a: ExamDoc, b: ExamDoc): number {
  const priorityOrder = resultExamPriority(a) - resultExamPriority(b);
  if (priorityOrder !== 0) return priorityOrder;
  const dateOrder = (a.examStartDate || "").localeCompare(b.examStartDate || "");
  if (dateOrder !== 0) return dateOrder;
  return a.examName.localeCompare(b.examName);
}

export function sortExamsForResult(exams: ExamDoc[]): ExamDoc[] {
  return [...exams].sort(compareExamsForResult);
}