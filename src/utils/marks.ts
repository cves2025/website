/**
 * Pure helpers for the marks storage and the exam-wise Cross List.
 *
 * Every function in this module is side-effect free (no Firestore calls), so
 * the same rules are shared by the marks entry screen, the cross list page and
 * any later report-card work: deterministic document ids, the single
 * pass/fail summary calculation and the client-side sorting/ranking rules.
 */
import { toMarksNumber, type ExamCategory } from "./examMarksScheme";
import type {
  MarksDoc,
  MarksSummary,
  SubjectComponentName,
  SubjectMarkStatus,
  SubjectMarksRecord,
} from "./type";

/** Minimum percentage of the total marks needed to pass an exam. */
export const PASS_PERCENTAGE = 33;

/** Rounds a number to exactly two decimal places (the only rounding used for marks). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Marks text: at most two decimals, trailing zeros removed (22, 22.5, 22.25).
 * Blank when the value is not a finite number.
 */
export function formatMarks(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return String(round2(value));
}

const COMPONENT_NAMES: SubjectComponentName[] = [
  "notebook",
  "test",
  "theory",
  "practical",
];

/**
 * Replaces the characters Firestore forbids in document ids. Every part of a
 * marks / examSheet document id goes through this, so session, exam and class
 * values can never produce an invalid id.
 */
function sanitizeDocPart(value: string): string {
  return value.replace(/[/\s]/g, "-");
}

/** Deterministic id of a marks document: `${session}_${examId}_${studentUid}`. */
export function buildMarksDocId(
  session: string,
  examId: string,
  studentUid: string
): string {
  return `${sanitizeDocPart(session)}_${sanitizeDocPart(
    examId
  )}_${sanitizeDocPart(studentUid)}`;
}

/** Deterministic id of an examSheet document: `${session}_${examId}_${className}`. */
export function buildExamSheetId(
  session: string,
  examId: string,
  className: string
): string {
  return `${sanitizeDocPart(session)}_${sanitizeDocPart(
    examId
  )}_${sanitizeDocPart(className)}`;
}

/**
 * Normalizes a saved `examType` back to the uppercase ExamCategory values.
 * New documents store the category directly, old ones saved the lowercased
 * string ("unit_test" / "main_exam").
 */
export function normalizeExamType(value: unknown): ExamCategory {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase().replace(/-/g, "_");
    if (normalized === "MAIN_EXAM") return "MAIN_EXAM";
    if (normalized === "UNIT_TEST") return "UNIT_TEST";
  }
  return "UNIT_TEST";
}

/**
 * The single source of exam totals. Present subjects count obtained + max;
 * absent subjects count 0 obtained but still count their max marks; exempt
 * subjects are excluded from both. A subject with no key in `subjectMarks`
 * (not applicable / never entered) is excluded from both as well.
 */
export function calculateMarksSummary(
  subjectMarks: Record<string, SubjectMarksRecord>
): MarksSummary {
  let totalMarks = 0;
  let totalMaxMarks = 0;

  Object.values(subjectMarks).forEach((record) => {
    if (record.status === "exempt") return;
    // Scholastic grade records never contribute to totals or percentage.
    if (typeof record.grade === "string" && record.grade.trim() !== "") return;
    const obtained =
      record.status === "present" && typeof record.obtained === "number"
        ? Math.max(record.obtained, 0)
        : 0;
    totalMarks += obtained;
    totalMaxMarks += Math.max(record.maxMarks, 0);
  });

  const percentage =
    totalMaxMarks > 0
      ? round2((totalMarks / totalMaxMarks) * 100)
      : 0;
  const result: "pass" | "fail" =
    totalMaxMarks === 0 || percentage >= PASS_PERCENTAGE ? "pass" : "fail";

  return {
    totalMarks: round2(totalMarks),
    totalMaxMarks: round2(totalMaxMarks),
    percentage,
    result,
  };
}

function isComponentName(value: string): value is SubjectComponentName {
  return (COMPONENT_NAMES as string[]).includes(value);
}

function readStatus(value: unknown): SubjectMarkStatus | undefined {
  return value === "present" || value === "absent" || value === "exempt"
    ? value
    : undefined;
}

function readComponents(
  value: unknown
): Partial<Record<SubjectComponentName, number | null>> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result: Partial<Record<SubjectComponentName, number | null>> = {};
  Object.entries(value as Record<string, unknown>).forEach(
    ([key, componentValue]) => {
      if (!isComponentName(key)) return;
      if (componentValue === null) {
        result[key] = null;
      } else if (typeof componentValue === "number" && Number.isFinite(componentValue)) {
        result[key] = round2(componentValue);
      }
    }
  );
  return Object.keys(result).length > 0 ? result : undefined;
}

function readComponentMax(
  value: unknown
): Partial<Record<SubjectComponentName, number>> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result: Partial<Record<SubjectComponentName, number>> = {};
  Object.entries(value as Record<string, unknown>).forEach(
    ([key, componentValue]) => {
      if (!isComponentName(key)) return;
      if (typeof componentValue === "number" && Number.isFinite(componentValue)) {
        result[key] = Math.max(componentValue, 0);
      }
    }
  );
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Non-negative finite number rounded to 2 decimals, or null when not representable. */
function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return round2(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) return round2(numeric);
  }
  // Legacy Scholastic grades ("A+") have no numeric equivalent.
  return null;
}

/**
 * Converts one subject marks value (new shape or legacy `{ obtained, maxMarks }`
 * where obtained is a number or a string like "AB") into the current shape.
 * Returns null for values that are not a marks record at all.
 */
function normalizeSubjectRecord(value: unknown): SubjectMarksRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const maxMarks = toMarksNumber(record.maxMarks, 0);

  const status = readStatus(record.status);
  if (status) {
    const components = readComponents(record.components);
    const componentMax = readComponentMax(record.componentMax);
    const grade = typeof record.grade === "string" ? record.grade.trim() : "";
    return {
      status,
      obtained: status === "present" ? toNonNegativeNumber(record.obtained) : null,
      maxMarks,
      ...(components ? { components } : {}),
      ...(componentMax ? { componentMax } : {}),
      ...(grade ? { grade } : {}),
    };
  }

  // Legacy record without a status field.
  const obtained = record.obtained;
  if (typeof obtained === "string") {
    const trimmed = obtained.trim();
    // "AB"/"ab" marks an absent student.
    if (trimmed.toLowerCase() === "ab") {
      return { status: "absent", obtained: null, maxMarks };
    }
    const numeric = Number(trimmed);
    if (trimmed !== "" && Number.isFinite(numeric) && numeric >= 0) {
      return { status: "present", obtained: round2(numeric), maxMarks };
    }
    // Any other non-empty string (e.g. a Scholastic grade) becomes `grade`.
    if (trimmed !== "") {
      return { status: "present", obtained: null, maxMarks, grade: trimmed };
    }
    return { status: "present", obtained: null, maxMarks };
  }
  return { status: "present", obtained: toNonNegativeNumber(obtained), maxMarks };
}
/**
 * Reads a (possibly legacy) marks document and returns its current shape.
 * Totals and result are always recomputed through `calculateMarksSummary` so
 * every reader sees exactly one rule, no matter when the document was saved.
 *
 * Hybrid documents (at least one entry in the new format) ignore every entry
 * that has no `status` - those are leftover legacy keys and are dropped for
 * good (no totals, no cells, no completeness). Only documents that contain no
 * new-format entry at all are processed as fully legacy.
 */
export function normalizeLegacyMarksDoc(
  docId: string,
  data: Record<string, unknown>
): MarksDoc {
  const subjectMarks: Record<string, SubjectMarksRecord> = {};
  const rawSubjectMarks = data.subjectMarks;
  if (rawSubjectMarks && typeof rawSubjectMarks === "object") {
    const entries = Object.entries(rawSubjectMarks as Record<string, unknown>);
    const hasNewFormat = entries.some(([, value]) =>
      isNewFormatSubjectRecord(value)
    );
    entries.forEach(([key, value]) => {
      if (hasNewFormat && !isNewFormatSubjectRecord(value)) return;
      const record = normalizeSubjectRecord(value);
      if (record) subjectMarks[key] = record;
    });
  }

  const summary = calculateMarksSummary(subjectMarks);

  return {
    id: docId,
    studentUid: typeof data.studentUid === "string" ? data.studentUid : "",
    admissionNumber:
      typeof data.admissionNumber === "string"
        ? data.admissionNumber
        : String(data.enrollment ?? "").trim(),
    studentName: typeof data.studentName === "string" ? data.studentName : "",
    fatherName: typeof data.fatherName === "string" ? data.fatherName : "",
    session: typeof data.session === "string" ? data.session : "",
    className: typeof data.className === "string" ? data.className : "",
    section: typeof data.section === "string" ? data.section : "",
    rollNumber: typeof data.rollNumber === "number" ? data.rollNumber : 0,
    examId: typeof data.examId === "string" ? data.examId : "",
    examType: normalizeExamType(data.examType),
    examName: typeof data.examName === "string" ? data.examName : "",
    subjectMarks,
    ...summary,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/** True when a subjectMarks value is a current-format record (has a status). */
export function isNewFormatSubjectRecord(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).status === "string"
  );
}

/**
 * Keys of a hybrid marks doc that are leftover legacy entries: entries without
 * a status whose key is not a current SubjectDoc id. Fully legacy docs return
 * an empty list (they are read as legacy and never auto-cleaned).
 */
export function listLegacySubjectKeys(
  subjectMarks: Record<string, unknown>,
  currentSubjectIds: readonly string[]
): string[] {
  const entries = Object.entries(subjectMarks);
  const hasNewFormat = entries.some(([, value]) =>
    isNewFormatSubjectRecord(value)
  );
  if (!hasNewFormat) return [];
  const currentIds = new Set(currentSubjectIds);
  return entries
    .filter(
      ([key, value]) => !isNewFormatSubjectRecord(value) && !currentIds.has(key)
    )
    .map(([key]) => key);
}

/** Row whose rank is derived from its total marks (fail/absent rows included). */
export interface RankableStudent {
  studentUid: string;
  totalMarks: number;
}

/**
 * Competition rank per list: sorted by total marks descending, equal totals
 * share the same rank and the following rank is skipped (1, 2, 2, 4). Every row
 * receives a rank value; the UI decides how to display it (e.g. "-" for fail).
 */
export function computeRanks(rows: RankableStudent[]): Record<string, number> {
  // Ties are decided on the rounded total, so 22.25 and 22.3 never split a rank.
  const ranked = rows
    .map((row) => ({ ...row, rounded: round2(row.totalMarks) }))
    .sort((a, b) => b.rounded - a.rounded);
  const ranks: Record<string, number> = {};
  ranked.forEach((row, index) => {
    if (index === 0) {
      ranks[row.studentUid] = 1;
      return;
    }
    const previous = ranked[index - 1];
    ranks[row.studentUid] =
      previous.rounded === row.rounded ? ranks[previous.studentUid] : index + 1;
  });
  return ranks;
}

/** Natural, numeric-aware class name comparison (Class 10 after Class 9). */
export function compareClassNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

/** Definition of the components that apply to one cross-list subject column. */
export interface SubjectColumnDef {
  /** Component names that apply (empty when the subject uses a single total). */
  components: readonly SubjectComponentName[];
  /** True for Scholastic (grade) subjects. */
  isGrade: boolean;
}

/**
 * True when one student's record of a subject counts as complete: absent,
 * exempt, graded, or every applicable component has been entered. A missing
 * key (not present in the document) counts as incomplete.
 */
export function isSubjectComplete(
  record: SubjectMarksRecord | undefined,
  columnDef: SubjectColumnDef
): boolean {
  if (!record) return false;
  if (record.status !== "present") return true;
  if (columnDef.isGrade) {
    return typeof record.grade === "string" && record.grade.trim() !== "";
  }
  if (columnDef.components.length > 0) {
    return columnDef.components.every(
      (component) => typeof record.components?.[component] === "number"
    );
  }
  return typeof record.obtained === "number";
}

/** Subject id -> component definition, used by the cross-list completeness check. */
export type SubjectColumnDefMap = Record<string, SubjectColumnDef>;

/** True when every subject column of one student's marks document is complete. */
export function isMarksDocComplete(
  doc: MarksDoc,
  columns: SubjectColumnDefMap
): boolean {
  return Object.keys(columns).every((subjectId) =>
    isSubjectComplete(doc.subjectMarks[subjectId], columns[subjectId])
  );
}

/** Row used by the cross-list ordering helpers. */
export interface ClassSectionRollStudent {
  className: string;
  section: string;
  rollNumber: number;
  studentName: string;
  studentUid: string;
}

/**
 * Client-side cross-list order: className (natural), then section, then
 * roll number ascending, then student name as the final tiebreaker.
 */
export function compareByClassSectionRoll(
  a: ClassSectionRollStudent,
  b: ClassSectionRollStudent
): number {
  return (
    compareClassNames(a.className, b.className) ||
    a.section.localeCompare(b.section) ||
    a.rollNumber - b.rollNumber ||
    a.studentName.localeCompare(b.studentName) ||
    a.studentUid.localeCompare(b.studentUid)
  );
}