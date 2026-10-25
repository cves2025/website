/**
 * Builds the Excel template of the marks upload. The template is generated from
 * the same subject columns the Marks page shows, so every cell of the sheet is
 * exactly one input of the marks entry grid.
 *
 * Marks sheet layout:
 *   row 1 (hidden): machine keys, see TEMPLATE_KEY
 *   row 2         : readable headers
 *   row 3...      : one row per student
 */
import * as XLSX from "xlsx";
import type { MarksSubjectColumn } from "./marksEntry";
import type { ExamDoc, SubjectComponentName } from "./type";

export const TEMPLATE_VERSION = 1;
export const MARKS_SHEET = "Marks";
export const INSTRUCTIONS_SHEET = "Instructions";
export const META_SHEET = "_meta";

/** Machine keys written to the hidden first row of the Marks sheet. */
export const TEMPLATE_KEY = {
  enrollment: "enrollment",
  name: "name",
  father: "father",
  section: "section",
  attendancePresent: "att|present",
  attendanceTotal: "att|total",
  mark: (subjectId: string, component: SubjectComponentName | null): string =>
    `m|${subjectId}|${component ?? "marks"}`,
  grade: (subjectId: string): string => `g|${subjectId}`,
};

export interface MarksTemplateStudent {
  admissionNumber: string;
  studentName: string;
  fatherName: string;
  section: string;
}

export interface MarksTemplateParams {
  session: string;
  exam: ExamDoc;
  className: string;
  /** Subject columns that go into the template (already limited to what the user may edit). */
  columns: readonly MarksSubjectColumn[];
  students: readonly MarksTemplateStudent[];
  /** Adds Present / Total attendance columns (default true). */
  includeAttendance?: boolean;
}

const FIXED_HEADERS = [
  "Enrollment No.",
  "Student Name",
  "Father's Name",
  "Section",
];
const FIXED_WIDTHS = [14, 28, 24, 9];

function subjectLabel(column: MarksSubjectColumn): string {
  const type = column.type.trim();
  return type ? `${column.name} (${type})` : column.name;
}

export function buildMarksTemplateWorkbook(
  params: MarksTemplateParams,
): XLSX.WorkBook {
  const {
    session,
    exam,
    className,
    columns,
    students,
    includeAttendance = true,
  } = params;

  const keys: string[] = [
    TEMPLATE_KEY.enrollment,
    TEMPLATE_KEY.name,
    TEMPLATE_KEY.father,
    TEMPLATE_KEY.section,
  ];
  const headers: string[] = [...FIXED_HEADERS];

  columns.forEach((column) => {
    if (column.isGrade) {
      keys.push(TEMPLATE_KEY.grade(column.id));
      headers.push(`${subjectLabel(column)} · Grade`);
      return;
    }
    column.inputs.forEach((input) => {
      keys.push(TEMPLATE_KEY.mark(column.id, input.component));
      // "English (Written) · Written (20)" reads badly: say "Marks" instead.
      const part =
        input.label.trim().toLowerCase() === column.type.trim().toLowerCase()
          ? "Marks"
          : input.label;
      headers.push(`${subjectLabel(column)} · ${part} (${input.max})`);
    });
  });

  if (includeAttendance) {
    keys.push(TEMPLATE_KEY.attendancePresent, TEMPLATE_KEY.attendanceTotal);
    headers.push("Attendance · Present days", "Attendance · Total days");
  }

  const emptyCells = keys.length - FIXED_HEADERS.length;
  const studentRows = students.map((student) => [
    // Plain strings stay text cells, so enrollment numbers keep leading zeros.
    student.admissionNumber,
    student.studentName,
    student.fatherName,
    student.section,
    ...Array<string | null>(emptyCells).fill(null),
  ]);

  const marksSheet = XLSX.utils.aoa_to_sheet([keys, headers, ...studentRows]);
  marksSheet["!rows"] = [{ hidden: true }];
  marksSheet["!cols"] = headers.map((header, index) => ({
    wch:
      index < FIXED_WIDTHS.length
        ? FIXED_WIDTHS[index]
        : Math.min(Math.max(header.length, 12), 34),
  }));

  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ["How to fill this template"],
    [""],
    [
      "1. Fill the marks only in the 'Marks' sheet, below the header row. Do not add, delete or rename columns, and do not touch the hidden first row or the hidden '_meta' sheet.",
    ],
    ["2. The Enrollment No. identifies the student. Do not change it."],
    [
      "3. Type AB for absent or EX for exempt in the cell of that paper only (for example Notebook = AB, Test = 5 keeps the 5 marks). AB counts as 0 marks and its maximum stays in the total; EX is left out of the total. If every cell of a subject is AB (or EX), the whole subject is absent (or exempt).",
    ],
    [
      "4. Leave a cell empty when the marks are not ready yet: nothing is saved for it.",
    ],
    [
      "5. Marks may have up to 2 decimals (for example 23.5) and cannot be more than the maximum shown in the header.",
    ],
    ["6. Grades allowed: A+, A, B+, B, C+, C, D, E, F."],
    [
      "7. Attendance: whole days only, and present days cannot be more than total days.",
    ],
  ]);
  instructionsSheet["!cols"] = [{ wch: 120 }];

  const metaSheet = XLSX.utils.aoa_to_sheet([
    ["key", "value"],
    ["version", TEMPLATE_VERSION],
    ["session", session],
    ["examId", exam.id],
    ["examName", exam.examName],
    ["className", className],
    ["generatedAt", new Date().toISOString()],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, marksSheet, MARKS_SHEET);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, INSTRUCTIONS_SHEET);
  XLSX.utils.book_append_sheet(workbook, metaSheet, META_SHEET);
  workbook.Workbook = {
    Sheets: workbook.SheetNames.map((name) => ({
      Hidden: (name === META_SHEET ? 1 : 0) as 0 | 1,
    })),
  };

  return workbook;
}

function filePart(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function marksTemplateFileName(params: MarksTemplateParams): string {
  return `Marks-Template_Class-${filePart(params.className)}_${filePart(
    params.exam.examName,
  )}_${filePart(params.session)}.xlsx`;
}

export function downloadMarksTemplate(params: MarksTemplateParams): void {
  const workbook = buildMarksTemplateWorkbook(params);
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = marksTemplateFileName(params);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
