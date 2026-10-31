/**
 * Excel marks upload: reads a filled template, checks it against the students
 * and subjects of the selected exam + class, and works out exactly what each
 * student's marks document would become. Pure logic (no Firestore, no React),
 * so the preview and the final save use the very same decisions.
 */
import * as XLSX from "xlsx";
import type { ExamRules } from "./examRules";
import { calculateMarksSummary, formatMarks } from "./marks";
import {
  CELL_KEY,
  GRADE_OPTIONS,
  buildStudentDraft,
  resolveCell,
  type MarksSubjectColumn,
} from "./marksEntry";
import {
  MARKS_SHEET,
  META_SHEET,
  TEMPLATE_KEY,
  TEMPLATE_VERSION,
} from "./marksTemplate";
import type {
  ExamDoc,
  MarksDoc,
  MarksSummary,
  SubjectComponentName,
  SubjectMarksRecord,
} from "./type";

/* ------------------------------------------------------------- reading -- */

export interface TemplateMeta {
  version: number;
  session: string;
  examId: string;
  examName: string;
  className: string;
}

export interface ParsedSheetRow {
  /** Row number as shown in Excel. */
  rowNumber: number;
  /** Cell text by template key (see TEMPLATE_KEY). */
  values: Record<string, string>;
}

export interface ParsedMarksSheet {
  meta: TemplateMeta;
  keys: string[];
  headers: string[];
  rows: ParsedSheetRow[];
}

function cellString(value: unknown): string {
  if (typeof value === "number") {
    // toFixed(6) absorbs float noise (23.199999999999996) but keeps 23.456
    // visible, so a 3-decimal mark is still reported as invalid.
    return Number.isFinite(value) ? String(Number(value.toFixed(6))) : "";
  }
  if (typeof value === "string") return value.trim();
  return "";
}

/** Reads a filled template. Throws an Error with a readable message. */
export async function parseMarksWorkbook(
  file: File,
): Promise<ParsedMarksSheet> {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  } catch {
    throw new Error(
      "The file could not be read. Upload the .xlsx template downloaded from the Marks page.",
    );
  }

  const marksSheet = workbook.Sheets[MARKS_SHEET];
  const metaSheet = workbook.Sheets[META_SHEET];
  if (!marksSheet || !metaSheet) {
    throw new Error(
      "This is not a marks template. Download the template from the Marks page and fill that file.",
    );
  }

  const metaMap = new Map<string, string>();
  XLSX.utils
    .sheet_to_json<unknown[]>(metaSheet, { header: 1, defval: "" })
    .forEach((row) => metaMap.set(cellString(row[0]), cellString(row[1])));

  const meta: TemplateMeta = {
    version: Number(metaMap.get("version")) || 0,
    session: metaMap.get("session") ?? "",
    examId: metaMap.get("examId") ?? "",
    examName: metaMap.get("examName") ?? "",
    className: metaMap.get("className") ?? "",
  };
  if (meta.version !== TEMPLATE_VERSION) {
    throw new Error(
      "This template is from another version. Download a fresh template and fill that.",
    );
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(marksSheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: true,
  });

  const keys = (matrix[0] ?? []).map(cellString);
  if (!keys.includes(TEMPLATE_KEY.enrollment)) {
    throw new Error(
      "The hidden first row of the 'Marks' sheet is missing or changed. Download a fresh template and fill that.",
    );
  }
  const seen = new Set<string>();
  for (const key of keys) {
    if (!key) continue;
    if (seen.has(key)) {
      throw new Error(
        "A column of the template appears twice (it was copied). Download a fresh template and fill that.",
      );
    }
    seen.add(key);
  }

  const headers = (matrix[1] ?? []).map(cellString);

  const rows: ParsedSheetRow[] = [];
  matrix.slice(2).forEach((cells, index) => {
    const values: Record<string, string> = {};
    keys.forEach((key, column) => {
      if (key) values[key] = cellString(cells[column]);
    });
    if (Object.values(values).every((text) => text === "")) return;
    rows.push({ rowNumber: index + 3, values });
  });

  return { meta, keys, headers, rows };
}

/* ------------------------------------------------------------- planning -- */

export interface UploadRosterStudent {
  studentUid: string;
  admissionNumber: string;
  studentName: string;
  fatherName: string;
  section: string;
}

export interface SavedAttendance {
  presentDays: number;
  totalDays: number;
}

/** Everything the decisions depend on besides the file itself. */
export interface UploadContext {
  /** Every marks entry column of the class (totals need all of them). */
  columns: readonly MarksSubjectColumn[];
  /** Whether this user may write this subject for students of this section. */
  canEditSubject: (section: string, column: MarksSubjectColumn) => boolean;
  /** Saved marks by studentUid. */
  savedMarks: Readonly<Record<string, MarksDoc>>;
  /** Saved attendance by studentUid. */
  savedAttendance: Readonly<Record<string, SavedAttendance>>;
  includeAttendance: boolean;
  rules: ExamRules;
}

export interface UploadPlanParams extends UploadContext {
  parsed: ParsedMarksSheet;
  session: string;
  exam: ExamDoc;
  className: string;
  /** Every student of the class + session (all sections). */
  roster: readonly UploadRosterStudent[];
}

export interface PlannedStudent {
  rowNumber: number;
  enrollment: string;
  sheetName: string;
  student: UploadRosterStudent | null;
  values: Record<string, string>;
  /** Problems that skip the whole student. */
  errors: string[];
  /** Notes that do not stop the student (e.g. name differs). */
  warnings: string[];
  /** True when the row carries at least one mark/grade/attendance value. */
  hasIncoming: boolean;
}

export interface UploadPlan {
  /** Blocking problems of the file as a whole (wrong exam / class / session). */
  fileProblems: string[];
  /** Columns of the file that are not used, with the reason. */
  ignoredColumns: string[];
  students: PlannedStudent[];
  /** Students of the class (that the user may write) missing from the file. */
  notInFile: UploadRosterStudent[];
  context: UploadContext;
}

const norm = (value: string): string => value.trim().toLowerCase();
const normName = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ").trim();
const stripZeros = (value: string): string => value.replace(/^0+(?=\d)/, "");

function subjectLabel(column: MarksSubjectColumn): string {
  const type = column.type.trim();
  return type ? `${column.name} (${type})` : column.name;
}

export function buildUploadPlan(params: UploadPlanParams): UploadPlan {
  const { parsed, session, exam, className, roster } = params;
  const context: UploadContext = {
    columns: params.columns,
    canEditSubject: params.canEditSubject,
    savedMarks: params.savedMarks,
    savedAttendance: params.savedAttendance,
    includeAttendance: params.includeAttendance,
    rules: params.rules,
  };
  const { columns, canEditSubject, includeAttendance } = context;
  const { meta } = parsed;

  // ---- file level --------------------------------------------------------
  const fileProblems: string[] = [];
  if (meta.session !== session) {
    fileProblems.push(
      `This template is for session ${meta.session || "?"}, but ${session} is selected.`,
    );
  }
  if (meta.examId !== exam.id) {
    fileProblems.push(
      `This template is for "${meta.examName || meta.examId}", but "${exam.examName}" is selected.`,
    );
  }
  if (meta.className !== className) {
    fileProblems.push(
      `This template is for class ${meta.className || "?"}, but class ${className} is selected.`,
    );
  }

  // ---- what each section may edit ----------------------------------------
  const editableBySection = new Map<string, MarksSubjectColumn[]>();
  const editableFor = (section: string): MarksSubjectColumn[] => {
    let list = editableBySection.get(section);
    if (!list) {
      list = columns.filter((column) => canEditSubject(section, column));
      editableBySection.set(section, list);
    }
    return list;
  };
  const keysOf = (column: MarksSubjectColumn): string[] =>
    column.isGrade
      ? [TEMPLATE_KEY.grade(column.id)]
      : column.inputs.map((input) =>
          TEMPLATE_KEY.mark(column.id, input.component),
        );

  const sections = Array.from(
    new Set(roster.map((student) => student.section)),
  );
  const editableAnywhere = new Set<string>();
  sections.forEach((section) =>
    editableFor(section).forEach((column) => editableAnywhere.add(column.id)),
  );

  const validKeys = new Set<string>();
  columns
    .filter((column) => editableAnywhere.has(column.id))
    .forEach((column) => keysOf(column).forEach((key) => validKeys.add(key)));
  if (includeAttendance && editableAnywhere.size > 0) {
    validKeys.add(TEMPLATE_KEY.attendancePresent);
    validKeys.add(TEMPLATE_KEY.attendanceTotal);
  }

  const fixedKeys = new Set<string>([
    TEMPLATE_KEY.enrollment,
    TEMPLATE_KEY.name,
    TEMPLATE_KEY.father,
    TEMPLATE_KEY.section,
  ]);
  const ignoredColumns: string[] = [];
  parsed.keys.forEach((key, index) => {
    if (!key || fixedKeys.has(key) || validKeys.has(key)) return;
    const header = parsed.headers[index] || key;
    let reason = "unknown column.";
    if (key.startsWith("m|") || key.startsWith("g|")) {
      const subjectId = key.split("|")[1];
      const column = columns.find((item) => item.id === subjectId);
      if (!column) {
        reason = "this subject is not in marks entry any more.";
      } else if (!editableAnywhere.has(subjectId)) {
        reason = "you have no permission for this subject.";
      } else {
        reason = "this column does not exist for this exam any more.";
      }
    } else if (key.startsWith("att|")) {
      reason = "attendance is not available.";
    }
    ignoredColumns.push(`${header}: ${reason}`);
  });

  // ---- roster lookup -----------------------------------------------------
  const byEnrollment = new Map<string, UploadRosterStudent>();
  const byDigits = new Map<string, UploadRosterStudent | null>();
  roster.forEach((student) => {
    const key = norm(student.admissionNumber);
    if (!key) return;
    byEnrollment.set(key, student);
    if (/^\d+$/.test(key)) {
      const digits = stripZeros(key);
      byDigits.set(digits, byDigits.has(digits) ? null : student);
    }
  });
  const findStudent = (enrollment: string): UploadRosterStudent | null => {
    const key = norm(enrollment);
    if (!key) return null;
    const exact = byEnrollment.get(key);
    if (exact) return exact;
    // Excel may have dropped leading zeros of a numeric enrollment number.
    return /^\d+$/.test(key) ? (byDigits.get(stripZeros(key)) ?? null) : null;
  };

  // ---- rows --------------------------------------------------------------
  const students: PlannedStudent[] = parsed.rows.map((row) => {
    const enrollment = row.values[TEMPLATE_KEY.enrollment] ?? "";
    const sheetName = row.values[TEMPLATE_KEY.name] ?? "";
    const student = findStudent(enrollment);
    const errors: string[] = [];
    const warnings: string[] = [];
    // Keys this student's section lets the user write.
    const rowKeys = new Set<string>();

    if (!enrollment) {
      errors.push("Enrollment No. is empty.");
    } else if (!student) {
      errors.push(
        `No student with Enrollment No. ${enrollment} in this class and session.`,
      );
    } else {
      if (sheetName && normName(sheetName) !== normName(student.studentName)) {
        warnings.push(
          `Name in the file ("${sheetName}") differs from "${student.studentName}".`,
        );
      }

      const sectionColumns = editableFor(student.section);
      if (sectionColumns.length === 0) {
        errors.push(
          `Section ${student.section || "-"} is not assigned to you.`,
        );
      } else {
        for (const column of sectionColumns) {
          keysOf(column).forEach((key) => rowKeys.add(key));

          if (column.isGrade) {
            const text = row.values[TEMPLATE_KEY.grade(column.id)] ?? "";
            if (text && !GRADE_OPTIONS.includes(text.toUpperCase())) {
              errors.push(
                `${subjectLabel(column)}: "${text}" is not a valid grade (${GRADE_OPTIONS.join(", ")}).`,
              );
            }
            continue;
          }
          for (const input of column.inputs) {
            const text =
              row.values[TEMPLATE_KEY.mark(column.id, input.component)] ?? "";
            if (text && resolveCell(text, input.max).kind === "invalid") {
              errors.push(
                `${subjectLabel(column)} · ${input.label}: "${text}" is not valid (a number from 0 to ${input.max}, AB or EX).`,
              );
            }
          }
        }

        // Values typed for subjects this user cannot edit in this section.
        columns
          .filter((column) => !sectionColumns.includes(column))
          .forEach((column) => {
            if (
              keysOf(column).some(
                (key) => (row.values[key] ?? "").trim() !== "",
              )
            ) {
              warnings.push(
                `${subjectLabel(column)}: ignored, you cannot edit this subject in Section ${student.section}.`,
              );
            }
          });

        if (includeAttendance) {
          rowKeys.add(TEMPLATE_KEY.attendancePresent);
          rowKeys.add(TEMPLATE_KEY.attendanceTotal);
          const present = row.values[TEMPLATE_KEY.attendancePresent] ?? "";
          const total = row.values[TEMPLATE_KEY.attendanceTotal] ?? "";
          if (present || total) {
            const presentDays = Number(present);
            const totalDays = Number(total);
            if (!present || !total) {
              errors.push(
                "Attendance: fill both Present and Total days, or leave both empty.",
              );
            } else if (
              !Number.isInteger(presentDays) ||
              !Number.isInteger(totalDays) ||
              presentDays < 0 ||
              totalDays < 0
            ) {
              errors.push("Attendance: use whole numbers only.");
            } else if (presentDays > totalDays) {
              errors.push(
                "Attendance: present days cannot be more than total days.",
              );
            }
          }
        }
      }
    }

    const hasIncoming = Array.from(rowKeys).some(
      (key) => (row.values[key] ?? "").trim() !== "",
    );
    return {
      rowNumber: row.rowNumber,
      enrollment,
      sheetName,
      student,
      values: row.values,
      errors,
      warnings,
      hasIncoming,
    };
  });

  // The same student in two rows is ambiguous: every such row is an error.
  const rowsByStudent = new Map<string, number[]>();
  students.forEach((item) => {
    if (!item.student) return;
    const list = rowsByStudent.get(item.student.studentUid) ?? [];
    list.push(item.rowNumber);
    rowsByStudent.set(item.student.studentUid, list);
  });
  students.forEach((item) => {
    if (!item.student) return;
    const rowNumbers = rowsByStudent.get(item.student.studentUid) ?? [];
    if (rowNumbers.length > 1) {
      item.errors.push(
        `Duplicate: this student appears in rows ${rowNumbers.join(", ")}.`,
      );
    }
  });

  const matched = new Set(rowsByStudent.keys());
  const notInFile = roster.filter(
    (student) =>
      !matched.has(student.studentUid) &&
      editableFor(student.section).length > 0,
  );

  return {
    fileProblems,
    ignoredColumns,
    students,
    notInFile,
    context,
  };
}

/* ----------------------------------------------------------- evaluating -- */

/**
 * new       : nothing saved yet, the value will be written
 * overwrite : a different value is saved and will be replaced
 * same      : the saved value is already identical
 * kept      : a different value is saved and stays (fill-empty mode)
 */
export type CellState = "new" | "overwrite" | "same" | "kept";

export interface CellOutcome {
  /** Template key of the cell ("attendance" for the attendance pair). */
  key: string;
  incoming: string;
  /** Currently saved value ("" = none). */
  existing: string;
  state: CellState;
}

export interface StudentWrite {
  /** One entry per filled cell of the file. */
  outcomes: Record<string, CellOutcome>;
  attendance: CellOutcome | null;
  /** The marks map to pass to saveStudentMarks. */
  subjectMarks: Record<string, SubjectMarksRecord>;
  clearedSubjectKeys: string[];
  /** Attendance to save, or null when nothing changes. */
  attendanceChange: { presentDays: number; totalDays: number } | null;
  /** Totals after this upload. */
  summary: MarksSummary;
  /** A saved value differs from the file (the overwrite checkbox matters). */
  hasConflict: boolean;
  /** At least one value will actually be written. */
  hasChanges: boolean;
}

function existingInputText(
  record: SubjectMarksRecord | undefined,
  component: SubjectComponentName | null,
): string {
  if (!record) return "";
  const componentState = component
    ? record.componentStatus?.[component]
    : undefined;
  if (record.status === "absent" || componentState === "absent") return "AB";
  if (record.status === "exempt" || componentState === "exempt") return "EX";
  const value = component ? record.components?.[component] : record.obtained;
  return typeof value === "number" ? formatMarks(value) : "";
}

/**
 * What happens to one student if the upload is saved. `overwrite` false fills
 * only empty cells; true replaces saved values with the file's values.
 * Returns null for a student that cannot be saved (error / not matched).
 */
export function evaluateStudentWrite(
  plan: UploadPlan,
  planned: PlannedStudent,
  overwrite: boolean,
): StudentWrite | null {
  const student = planned.student;
  if (!student || planned.errors.length > 0) return null;

  const { columns, canEditSubject, savedMarks, savedAttendance, rules } =
    plan.context;
  const saved = savedMarks[student.studentUid];
  const savedBySubject = saved?.subjectMarks;

  const drafts: Record<string, string> = {};
  const outcomes: Record<string, CellOutcome> = {};
  let hasConflict = false;
  let hasChanges = false;

  const settle = (hasExisting: boolean, same: boolean): CellState => {
    if (!hasExisting) return "new";
    if (same) return "same";
    hasConflict = true;
    return overwrite ? "overwrite" : "kept";
  };

  for (const column of columns) {
    if (!canEditSubject(student.section, column)) continue;
    const savedRecord = savedBySubject?.[column.id];

    // ---- grade subject ---------------------------------------------------
    if (column.isGrade) {
      const key = TEMPLATE_KEY.grade(column.id);
      const text = (planned.values[key] ?? "").trim();
      if (!text) continue;
      const incoming = text.toUpperCase();
      const existing = savedRecord?.grade?.trim() ?? "";
      const state = settle(existing !== "", existing === incoming);
      outcomes[key] = { key, incoming, existing, state };
      if (state === "new" || state === "overwrite") {
        drafts[CELL_KEY.grade(student.studentUid, column.id)] = incoming;
        hasChanges = true;
      }
      continue;
    }

    // ---- marks subject ---------------------------------------------------
    const texts = column.inputs.map((input) =>
      (
        planned.values[TEMPLATE_KEY.mark(column.id, input.component)] ?? ""
      ).trim(),
    );
    if (texts.every((text) => text === "")) continue;

    const existingTexts = column.inputs.map((input) =>
      existingInputText(savedRecord, input.component),
    );
    // AB / EX is decided per input: Notebook = AB never hides the Test marks.
    // A blank cell keeps whatever is saved for that input.
    let anyApplied = false;
    const finalTexts: string[] = [];
    column.inputs.forEach((input, index) => {
      const existing = existingTexts[index];
      const upper = texts[index].toUpperCase();

      let incoming = "";
      if (upper === "AB" || upper === "EX") {
        incoming = upper;
      } else if (texts[index] !== "") {
        const cell = resolveCell(texts[index], input.max);
        if (cell.kind === "number") incoming = formatMarks(cell.value);
      }

      if (incoming === "") {
        finalTexts.push(existing);
        return;
      }

      const key = TEMPLATE_KEY.mark(column.id, input.component);
      const state = settle(existing !== "", existing === incoming);
      outcomes[key] = { key, incoming, existing, state };

      if (state === "new" || state === "overwrite") {
        finalTexts.push(incoming);
        anyApplied = true;
      } else {
        finalTexts.push(existing);
      }
    });

    // The whole subject is rebuilt from its drafts, so the cells that are not
    // changing are seeded with their saved text (number, AB or EX).
    if (anyApplied) {
      column.inputs.forEach((input, index) => {
        if (finalTexts[index] === "") return;
        drafts[
          CELL_KEY.component(student.studentUid, column.id, input.component)
        ] = finalTexts[index];
      });
      hasChanges = true;
    }
  }

  // ---- attendance --------------------------------------------------------
  let attendance: CellOutcome | null = null;
  let attendanceChange: { presentDays: number; totalDays: number } | null =
    null;
  if (plan.context.includeAttendance) {
    const present = (
      planned.values[TEMPLATE_KEY.attendancePresent] ?? ""
    ).trim();
    const total = (planned.values[TEMPLATE_KEY.attendanceTotal] ?? "").trim();
    if (present && total) {
      const savedValue = savedAttendance[student.studentUid];
      const incoming = `${Number(present)} / ${Number(total)}`;
      const existing = savedValue
        ? `${savedValue.presentDays} / ${savedValue.totalDays}`
        : "";
      const state = settle(existing !== "", existing === incoming);
      attendance = { key: "attendance", incoming, existing, state };
      if (state === "new" || state === "overwrite") {
        attendanceChange = {
          presentDays: Number(present),
          totalDays: Number(total),
        };
        hasChanges = true;
      }
    }
  }

  const { subjectMarks, clearedSubjectKeys } = buildStudentDraft(
    student.studentUid,
    drafts,
    savedBySubject,
    [...columns],
  );

  return {
    outcomes,
    attendance,
    subjectMarks,
    clearedSubjectKeys,
    attendanceChange,
    summary: calculateMarksSummary(subjectMarks, rules),
    hasConflict,
    hasChanges,
  };
}
