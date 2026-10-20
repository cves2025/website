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
  String(value ?? "").trim().toLowerCase();

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

  // Same-named subjects that DO have a non-practical row. A subject of type
  // "Practical" is only the Main-Exam practical paper of its same-named
  // written subject; such sibling rows have no paper in unit tests.
  const nonPracticalNames = new Set(
    shown
      .filter((subject) => subject.data.type !== "Practical")
      .map((subject) => nameKey(subject.data.name)),
  );

  const oralNames = new Set(
    shown
      .filter((subject) => subject.data.type === "Oral")
      .map((subject) => nameKey(subject.data.name)),
  );

  // Unit Tests of classes 1-8 never have a practical paper, so the
  // "Practical"-type sibling row is dropped from the marks entry (the
  // parent subject already shows Notebook + Test). Subjects where the
  // "Practical" row is the ONLY row of that name are kept and also get
  // Notebook + Test.
  const isUnitTestScheme =
    exam?.examCategory === "UNIT_TEST" && isSchemeClass(className);

  return subjects
    .map(toSubjectColumnBase)
    .filter((c): c is SubjectColumnBase => c !== null && Boolean(c.name))
    .sort(sortSubjectColumns)
    .filter(
      (c) =>
        !(
          isUnitTestScheme &&
          c.type === "Practical" &&
          nonPracticalNames.has(nameKey(c.name))
        ),
    )
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

export function normalizeGrade(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-F0-9+-]/g, "")
    .slice(0, 3);
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

/**
 * The effective state of one subject from its cell drafts: absent/exempt when
 * any cell holds "AB"/"EX", invalid when any cell holds something unusable,
 * "clear" when every cell is empty, present otherwise. For present subjects,
 * obtained is the sum of the entered components (empty components store null).
 */
export function resolveSubject(
  drafts: Record<string, string>,
  studentUid: string,
  column: MarksSubjectColumn,
): ResolvedSubject {
  if (column.inputs.length === 0) return { kind: "clear" };

  const cells = column.inputs.map((input) =>
    resolveCell(
      drafts[CELL_KEY.component(studentUid, column.id, input.component)] ?? "",
      input.max,
    ),
  );

  const statusCell = cells.find((cell) => cell.kind === "status");
  if (statusCell && statusCell.kind === "status") {
    return { kind: "status", status: statusCell.status };
  }

  if (cells.some((cell) => cell.kind === "invalid")) {
    return { kind: "invalid" };
  }

  if (cells.every((cell) => cell.kind === "empty")) {
    return { kind: "clear" };
  }

  const components: Partial<Record<SubjectComponentName, number | null>> = {};
  const componentMax: Partial<Record<SubjectComponentName, number>> = {};
  let obtained = 0;
  let maxMarks = 0;

  cells.forEach((cell, index) => {
    const input = column.inputs[index];
    maxMarks += input.max;

    if (!input.component) {
      // Single total input (classes outside the 1-8 scheme).
      if (cell.kind === "number") obtained = cell.value;
      return;
    }

    componentMax[input.component] = input.max;

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
      } else {
        subjectMarks[column.id] = {
          status: "present",
          obtained: null,
          maxMarks: 0,
          grade,
        };
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

    const resolved = resolveSubject(drafts, studentUid, column);

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
              }
            : {}),
        };
        return;
    }
  });

  return { subjectMarks, clearedSubjectKeys };
}