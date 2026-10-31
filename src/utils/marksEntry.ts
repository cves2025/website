/**
 * Pure marks-entry logic shared by the Marks page (manual entry) and the
 * Excel upload: which input cells every subject column has, how one typed
 * cell is read, and how a student's cells become the subjectMarks map.
 * No React and no Firestore in this module.
 */
import { isSchemeClass, subjectMarksBreakdown } from "./examMarksScheme";
import { round2 } from "./marks";
import type {
  ExamDoc,
  SubjectComponentName,
  SubjectMarksRecord,
  SubjectMarkStatus,
} from "./type";

export const ORAL_MAX_MAIN_EXAM = 20;

/**
 * Unit Test written / oral split for classes outside the 1-8 scheme
 * (PG, Nur, LKG, UKG): 20 written + 10 oral = exam maxMarks (30).
 */
export const UNIT_TEST_WRITTEN_MAX = 20;
export const UNIT_TEST_ORAL_MAX = 10;

export const GRADE_OPTIONS = ["A+", "A", "B+", "B", "C+", "C", "D", "E", "F"];

/** Draft keys: one per component input (or grade) of every subject cell. */
export const CELL_KEY = {
  component: (
    studentUid: string,
    subjectId: string,
    component: SubjectComponentName | null,
  ): string => `${studentUid}::${subjectId}::${component ?? "marks"}`,

  grade: (studentUid: string, subjectId: string): string =>
    `${studentUid}::${subjectId}::grade`,
};

/** One input of a subject column: a single component, or the whole total. */
export interface MarksComponentInput {
  /** Component name for scheme subjects; null for the single total input. */
  component: SubjectComponentName | null;
  /** Maximum marks of this component / total. */
  max: number;
  /** Header label shown above the input (e.g. "Notebook (5)"). */
  label: string;
}

export interface MarksSubjectColumn {
  /** SubjectDoc id - the key used inside subjectMarks. */
  id: string;
  name: string;
  type: string;
  order: number;
  /** Optional report card order (undefined = report card ke bottom mein). */
  reportCardOrder?: number;
  /** Scholastic subjects keep one grade cell and no component inputs. */
  isGrade: boolean;
  inputs: MarksComponentInput[];
}

/** A subject as loaded from Firestore, before the scheme-based layout. */
export interface SubjectColumnBase {
  id: string;
  name: string;
  type: string;
  order: number;
  reportCardOrder?: number;
}

/** A document of the subjects collection in plain form. */
export interface SubjectDocInput {
  id: string;
  data: Record<string, unknown>;
}

/** What one subject of one student will be written as (or not written). */
export type ResolvedSubject =
  | { kind: "clear" }
  | { kind: "invalid" }
  | { kind: "status"; status: "absent" | "exempt" }
  | {
      kind: "present";
      obtained: number;
      maxMarks: number;
      components: Partial<Record<SubjectComponentName, number | null>>;
      componentMax: Partial<Record<SubjectComponentName, number>>;
      componentStatus?: Partial<
        Record<SubjectComponentName, SubjectMarkStatus>
      >;
    };

/** Parsed state of one cell's draft. */
export type ResolvedCell =
  | { kind: "empty" }
  | { kind: "status"; status: "absent" | "exempt" }
  | { kind: "number"; value: number }
  | { kind: "invalid" };

export interface StudentDraftPlan {
  subjectMarks: Record<string, SubjectMarksRecord>;
  clearedSubjectKeys: string[];
}

export function toSubjectColumnBase(
  subject: SubjectDocInput,
): SubjectColumnBase | null {
  const { id, data } = subject;
  if (data.displayInMarksEntry !== true) return null;
  const reportCardOrder = data.reportCardOrder;
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    type: typeof data.type === "string" ? data.type : "",
    order: typeof data.order === "number" ? data.order : 1,
    reportCardOrder:
      typeof reportCardOrder === "number" && reportCardOrder > 0
        ? Math.floor(reportCardOrder)
        : undefined,
  };
}

export function sortSubjectColumns(
  a: SubjectColumnBase,
  b: SubjectColumnBase,
): number {
  return a.order - b.order || a.name.localeCompare(b.name);
}

/**
 * Turns a loaded subject into the input layout of its marks cell. The exam
 * scheme decides the split (Unit Tests of classes 1-8 = notebook + test for
 * EVERY subject, no practical; Main Exam = theory, + practical for
 * Science/Computer on classes 1-8). Classes outside the 1-8 scheme
 * (PG, Nur, LKG, UKG) split Unit Tests into Written + Oral (20 + 10)
 * and Main Exams into Written + Oral (maxMarks - 20 / 20). Scholastic
 * subjects keep a single grade cell. Other classes get one "Marks" input.
 */
export function enrichSubjectColumn(
  column: SubjectColumnBase,
  exam: ExamDoc | null,
  className: string,
  hasPracticalSibling: boolean,
  hasOralSibling: boolean,
): MarksSubjectColumn {
  if (column.type === "Scholastic") {
    return { ...column, isGrade: true, inputs: [] };
  }

  const inputs: MarksComponentInput[] = [];
  const isMainExam = exam?.examCategory === "MAIN_EXAM";
  const oralMax = exam ? Math.min(ORAL_MAX_MAIN_EXAM, exam.maxMarks) : 0;

  if (exam && isMainExam && column.type === "Written + Oral") {
    // One subject row holding both papers.
    inputs.push(
      { component: "written", max: exam.maxMarks - oralMax, label: "Written" },
      { component: "oral", max: oralMax, label: "Oral" },
    );
  } else if (exam && isMainExam && column.type === "Oral") {
    // Separate Oral row: only the oral paper marks.
    inputs.push({ component: null, max: oralMax, label: "Oral" });
  } else if (
    exam &&
    isMainExam &&
    column.type === "Written" &&
    hasOralSibling
  ) {
    // Separate Written row of a subject that also has an Oral row.
    inputs.push({
      component: null,
      max: exam.maxMarks - oralMax,
      label: "Written",
    });
  } else if (exam && isSchemeClass(className)) {
    const isPractical = column.type === "Practical";
    const breakdown = subjectMarksBreakdown(
      exam.examCategory,
      exam.marksScheme,
      isPractical || hasPracticalSibling,
    );

    if (exam.examCategory === "UNIT_TEST") {
      // Unit Tests (classes 1-8) never carry a practical paper: every subject -
      // including Computer / Science and any "Practical"-type subject - is
      // entered with Notebook + Test only.
      inputs.push(
        { component: "notebook", max: breakdown.notebook, label: "Notebook" },
        { component: "test", max: breakdown.theory, label: "Test" },
      );
    } else if (isPractical) {
      // Main Exams: only the "Practical"-type subject keeps the practical
      // paper; the theory part is entered on the same-named parent subject.
      if (breakdown.practical > 0) {
        inputs.push({
          component: "practical",
          max: breakdown.practical,
          label: "Practical",
        });
      }
    } else {
      inputs.push({
        component: "theory",
        max: breakdown.theory,
        label: "Theory",
      });
    }
  } else if (exam && column.type === "Written + Oral") {
    // Unit Tests of classes outside the 1-8 scheme (PG, Nur, LKG, UKG):
    // one subject row holding both papers, 20 written + 10 oral = 30.
    inputs.push(
      { component: "written", max: UNIT_TEST_WRITTEN_MAX, label: "Written" },
      { component: "oral", max: UNIT_TEST_ORAL_MAX, label: "Oral" },
    );
  } else if (exam && column.type === "Oral") {
    // Separate Oral row (e.g. Conversation): only the oral paper marks.
    inputs.push({ component: null, max: UNIT_TEST_ORAL_MAX, label: "Oral" });
  } else if (exam && column.type === "Written" && hasOralSibling) {
    // Separate Written row of a subject that also has an Oral row.
    inputs.push({
      component: null,
      max: UNIT_TEST_WRITTEN_MAX,
      label: "Written",
    });
  } else {
    inputs.push({ component: null, max: exam?.maxMarks ?? 0, label: "Marks" });
  }

  return { ...column, isGrade: false, inputs };
}

const nameKey = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/**
 * Unit Tests of classes 1-8 never have a practical paper, so a "Practical"-type
 * subject is dropped when a same-named non-practical subject exists (that one
 * already shows Notebook + Test). A "Practical" subject that is the ONLY one
 * of its name is kept. Main Exams and other classes keep every subject.
 */
export function dropUnitTestPracticalSiblings<
  T extends { name: string; type: string },
>(
  subjects: readonly T[],
  examCategory: ExamDoc["examCategory"] | null | undefined,
  className: string,
): T[] {
  if (examCategory !== "UNIT_TEST" || !isSchemeClass(className)) {
    return [...subjects];
  }
  const nonPracticalNames = new Set(
    subjects
      .filter((subject) => subject.type !== "Practical")
      .map((subject) => nameKey(subject.name)),
  );
  return subjects.filter(
    (subject) =>
      !(subject.type === "Practical" && nonPracticalNames.has(nameKey(subject.name))),
  );
}

/**
 * The marks entry columns of one class: the subjects shown in marks entry,
 * sorted, with the Unit Test "Practical" sibling rows dropped (classes 1-8)
 * and every subject laid out by `enrichSubjectColumn`.
 */
export function buildSubjectColumns(
  subjects: readonly SubjectDocInput[],
  exam: ExamDoc | null,
  className: string,
): MarksSubjectColumn[] {
  const shown = subjects.filter(
    (subject) => subject.data.displayInMarksEntry === true,
  );

  const practicalNames = new Set(
    shown
      .filter((subject) => subject.data.type === "Practical")
      .map((subject) => nameKey(subject.data.name)),
  );

  const oralNames = new Set(
    shown
      .filter((subject) => subject.data.type === "Oral")
      .map((subject) => nameKey(subject.data.name)),
  );

  const columns = subjects
    .map(toSubjectColumnBase)
    .filter((c): c is SubjectColumnBase => c !== null && Boolean(c.name))
    .sort(sortSubjectColumns);

  return dropUnitTestPracticalSiblings(columns, exam?.examCategory, className)
    .map((c) =>
      enrichSubjectColumn(
        c,
        exam,
        className,
        practicalNames.has(nameKey(c.name)),
        oralNames.has(nameKey(c.name)),
      ),
    );
}

/** Status tokens a grade cell accepts besides the grades: absent / exempt. */
const GRADE_STATUS_TOKENS: Record<string, "absent" | "exempt"> = {
  AB: "absent",
  EX: "exempt",
};

/** Everything a grade cell accepts: the grades plus AB / EX. */
export const GRADE_CELL_OPTIONS = [
  ...GRADE_OPTIONS,
  ...Object.keys(GRADE_STATUS_TOKENS),
];

const GRADE_CHARS = new Set(GRADE_CELL_OPTIONS.join(""));
export const GRADE_MAX_LENGTH = Math.max(
  ...GRADE_CELL_OPTIONS.map((option) => option.length),
);

/** Upper-cases a typed grade and drops every character no option uses (digits included). */
export function normalizeGrade(value: string): string {
  return Array.from(value.toUpperCase())
    .filter((char) => GRADE_CHARS.has(char))
    .join("")
    .slice(0, GRADE_MAX_LENGTH);
}

/** True for a grade (A+ ... F) or AB / EX, in any case. */
export function isValidGrade(value: string): boolean {
  return GRADE_CELL_OPTIONS.includes(value.trim().toUpperCase());
}

/** Saved record of a grade subject for a valid grade-cell value. */
export function gradeCellRecord(value: string): SubjectMarksRecord {
  const token = value.trim().toUpperCase();
  const status = GRADE_STATUS_TOKENS[token];
  return status
    ? { status, obtained: null, maxMarks: 0 }
    : { status: "present", obtained: null, maxMarks: 0, grade: token };
}

/** Text of a saved grade-subject record as typed in a grade cell. */
export function gradeCellText(record: SubjectMarksRecord | undefined): string {
  if (!record) return "";
  const grade = record.grade?.trim() ?? "";
  if (grade) return grade;
  if (record.status === "absent") return "AB";
  if (record.status === "exempt") return "EX";
  return "";
}

/** "AB"/"EX" (any case) are shown back in the cell as uppercase tokens. */
export function toMarkTokenOrRaw(value: string): string {
  const upper = value.trim().toUpperCase();
  return upper === "AB" || upper === "EX" ? upper : value;
}

/**
 * Parses what the teacher typed in one cell: empty, the "AB"/"EX" token, a
 * valid non-negative number (at most 2 decimal places, "." or "," accepted as
 * the decimal separator) within [0, max], or invalid (letters other than
 * AB/EX, negative values, over-max values).
 */
export function resolveCell(value: string, max: number): ResolvedCell {
  const trimmed = value.trim().replace(",", ".").toUpperCase();
  if (trimmed === "") return { kind: "empty" };
  if (trimmed === "AB") return { kind: "status", status: "absent" };
  if (trimmed === "EX") return { kind: "status", status: "exempt" };
  if (/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= max) {
      return { kind: "number", value: round2(numeric) };
    }
  }
  return { kind: "invalid" };
}

/** "AB"/"EX" typed in any cell of a subject applies to the whole subject. */
export function subjectStatusToken(
  drafts: Record<string, string>,
  studentUid: string,
  column: MarksSubjectColumn,
): "AB" | "EX" | null {
  for (const input of column.inputs) {
    const draft =
      drafts[CELL_KEY.component(studentUid, column.id, input.component)];
    if (!draft) continue;
    const upper = draft.trim().toUpperCase();
    if (upper === "AB" || upper === "EX") return upper;
  }
  return null;
}

/** Text of one cell as it is currently saved (used when the cell has no draft). */
function savedCellText(
  saved: SubjectMarksRecord | undefined,
  input: MarksComponentInput,
): string {
  if (!saved) return "";
  const componentState = input.component
    ? saved.componentStatus?.[input.component]
    : undefined;
  if (saved.status === "absent" || componentState === "absent") return "AB";
  if (saved.status === "exempt" || componentState === "exempt") return "EX";
  if (input.component) {
    const value = saved.components?.[input.component];
    return typeof value === "number" ? String(value) : "";
  }
  return typeof saved.obtained === "number" ? String(saved.obtained) : "";
}

/**
 * The effective state of one subject from its cell drafts (cells without a
 * draft fall back to the saved value, so editing one cell never wipes the
 * others). For subjects with several components (Notebook + Test,
 * Written + Oral) AB/EX apply to that component only: AB counts 0 but keeps
 * its max, EX drops its max. The whole subject is absent/exempt only when
 * EVERY component is AB/EX. Single-input subjects: AB/EX = whole subject.
 */
export function resolveSubject(
  drafts: Record<string, string>,
  studentUid: string,
  column: MarksSubjectColumn,
  saved?: SubjectMarksRecord,
): ResolvedSubject {
  if (column.inputs.length === 0) return { kind: "clear" };

  const cells = column.inputs.map((input) =>
    resolveCell(
      drafts[CELL_KEY.component(studentUid, column.id, input.component)] ??
        savedCellText(saved, input),
      input.max,
    ),
  );

  if (cells.some((cell) => cell.kind === "invalid")) {
    return { kind: "invalid" };
  }

  if (cells.every((cell) => cell.kind === "empty")) {
    return { kind: "clear" };
  }

  const perComponent =
    column.inputs.length > 1 &&
    column.inputs.every((input) => input.component !== null);

  const firstStatus = cells.find((cell) => cell.kind === "status");

  if (!perComponent) {
    if (firstStatus && firstStatus.kind === "status") {
      return { kind: "status", status: firstStatus.status };
    }
  } else if (cells.every((cell) => cell.kind === "status")) {
    const allExempt = cells.every(
      (cell) => cell.kind === "status" && cell.status === "exempt",
    );
    return { kind: "status", status: allExempt ? "exempt" : "absent" };
  }

  const components: Partial<Record<SubjectComponentName, number | null>> = {};
  const componentMax: Partial<Record<SubjectComponentName, number>> = {};
  const componentStatus: Partial<
    Record<SubjectComponentName, SubjectMarkStatus>
  > = {};
  let obtained = 0;
  let maxMarks = 0;

  cells.forEach((cell, index) => {
    const input = column.inputs[index];

    if (!input.component) {
      // Single total input (classes outside the 1-8 scheme).
      maxMarks += input.max;
      if (cell.kind === "number") obtained = cell.value;
      return;
    }

    componentMax[input.component] = input.max;

    if (cell.kind === "status") {
      components[input.component] = null;
      componentStatus[input.component] = cell.status;
      // AB: scores 0 but its max still counts. EX: excluded from the max.
      if (cell.status === "absent") maxMarks += input.max;
      return;
    }

    componentStatus[input.component] = "present";
    maxMarks += input.max;

    if (cell.kind === "number") {
      components[input.component] = cell.value;
      obtained += cell.value;
    } else {
      components[input.component] = null;
    }
  });

  return {
    kind: "present",
    obtained: round2(obtained),
    maxMarks,
    components,
    componentMax,
    ...(perComponent ? { componentStatus } : {}),
  };
}

/**
 * Builds the document-level plan of one student: the fresh subjectMarks map
 * plus the keys that must be deleted. Invalid cells keep the last valid saved
 * record untouched (neither rewritten nor deleted).
 */
export function buildStudentDraft(
  studentUid: string,
  drafts: Record<string, string>,
  savedBySubject: Record<string, SubjectMarksRecord> | undefined,
  columns: MarksSubjectColumn[],
): StudentDraftPlan {
  const subjectMarks: Record<string, SubjectMarksRecord> = {};
  const clearedSubjectKeys: string[] = [];

  columns.forEach((column) => {
    if (column.isGrade) {
      const gradeKey = CELL_KEY.grade(studentUid, column.id);

      if (drafts[gradeKey] === undefined) {
        // Grade not being edited: keep the saved record (or nothing).
        if (savedBySubject?.[column.id]) {
          subjectMarks[column.id] = savedBySubject[column.id];
        }
        return;
      }

      const grade = normalizeGrade(drafts[gradeKey]);

      if (grade === "") {
        if (savedBySubject?.[column.id]) clearedSubjectKeys.push(column.id);
      } else if (!isValidGrade(grade)) {
        // Invalid grade: keep the last saved record untouched.
        if (savedBySubject?.[column.id]) {
          subjectMarks[column.id] = savedBySubject[column.id];
        }
      } else {
        subjectMarks[column.id] = gradeCellRecord(grade);
      }
      return;
    }

    // A subject whose cells have no draft at all is not being edited: keep the
    // last saved record untouched instead of treating it as "cleared".
    const hasCellDraft = column.inputs.some(
      (input) =>
        drafts[CELL_KEY.component(studentUid, column.id, input.component)] !==
        undefined,
    );

    if (!hasCellDraft) {
      if (savedBySubject?.[column.id]) {
        subjectMarks[column.id] = savedBySubject[column.id];
      }
      return;
    }

    const resolved = resolveSubject(
      drafts,
      studentUid,
      column,
      savedBySubject?.[column.id],
    );

    switch (resolved.kind) {
      case "clear":
        if (savedBySubject?.[column.id]) clearedSubjectKeys.push(column.id);
        return;

      case "invalid":
        // Keep the last valid saved value: leave the existing key untouched.
        if (savedBySubject?.[column.id]) {
          subjectMarks[column.id] = savedBySubject[column.id];
        }
        return;

      case "status":
        subjectMarks[column.id] = {
          status: resolved.status,
          obtained: null,
          maxMarks: column.inputs.reduce((sum, input) => sum + input.max, 0),
        };
        return;

      case "present":
        subjectMarks[column.id] = {
          status: "present",
          obtained: resolved.obtained,
          maxMarks: resolved.maxMarks,
          ...(Object.keys(resolved.components).length > 0
            ? {
                components: resolved.components,
                componentMax: resolved.componentMax,
                ...(resolved.componentStatus
                  ? { componentStatus: resolved.componentStatus }
                  : {}),
              }
            : {}),
        };
        return;
    }
  });

  return { subjectMarks, clearedSubjectKeys };
}
