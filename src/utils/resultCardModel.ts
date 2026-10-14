import type { ExamRules } from "./examRules";
import { NOT_APPLICABLE } from "./examMarksScheme";
import {
  EMPTY_LABEL,
  compareExamsForResult,
  getResultLayout,
  percentageOf,
  recordCountsInTotal,
  recordMax,
  recordObtained,
  resultCellText,
  round2,
} from "./resultCard";
import type { ResultLayout } from "./resultCard";
import type {
  ExamDoc,
  ExamSheetDoc,
  ExamSheetSubjectColumn,
  MarksDoc,
} from "./type";

/** One selected exam for one student. */
export interface ResultExamInput {
  exam: ExamDoc;
  /** Frozen subject columns of this exam + class (null when missing). */
  sheet: ExamSheetDoc | null;
  /** The student's marks in this exam (null when nothing is saved). */
  marks: MarksDoc | null;
}

export interface ResultCell {
  /** "45", "AB", "EX", "A" (grade), "-" (no entry) or "NA" (not applicable). */
  text: string;
  obtained: number;
  max: number;
  /** True when the cell takes part in totals. */
  counts: boolean;
}

export interface ResultRow {
  key: string;
  subject: string;
  /** Sheet type of the row: Theory / Written / Oral / Practical / Scholastic. */
  part: string;
  /** First row of a subject group; its name cell spans `groupSize` rows. */
  isGroupStart: boolean;
  groupSize: number;
  /** One cell per selected exam, in exam order. */
  cells: ResultCell[];
  finalText: string;
  finalObtained: number;
  finalMax: number;
}

export interface ResultTotals {
  obtained: number;
  max: number;
  percentage: number;
  hasMarks: boolean;
}

export interface ResultTableModel {
  layout: ResultLayout;
  exams: { id: string; name: string }[];
  /** Theory table (class 1-8) or the Written/Oral table (PG-UKG). */
  mainRows: ResultRow[];
  /** Practical table (class 1-8 only). */
  practicalRows: ResultRow[];
  /** Grade (Scholastic) subjects, shown in their own table. */
  gradeRows: ResultRow[];
  examTotals: ResultTotals[];
  finalTotals: ResultTotals;
  /** null when there are no counted marks at all. */
  result: "pass" | "fail" | null;
}

interface Slot {
  key: string;
  subject: string;
  type: string;
  order: number;
  isGrade: boolean;
}

function normalize(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

/** The same subject + type is one row across every exam. */
function slotKey(column: ExamSheetSubjectColumn): string {
  return `${normalize(column.name)}|${normalize(column.type)}`;
}

function isPracticalSlot(slot: Slot): boolean {
  return normalize(slot.type) === "practical";
}

function partRank(type: string): number {
  switch (normalize(type)) {
    case "theory":
    case "written":
      return 0;
    case "oral":
      return 1;
    case "practical":
      return 2;
    default:
      return 3;
  }
}

function buildCell(
  input: ResultExamInput,
  column: ExamSheetSubjectColumn | undefined
): ResultCell {
  // This exam's sheet has no such paper (e.g. practical in a Unit Test).
  if (!column) {
    return { text: NOT_APPLICABLE, obtained: 0, max: 0, counts: false };
  }
  const record = input.marks?.subjectMarks?.[column.id];
  return {
    text: resultCellText(record),
    obtained: recordObtained(record),
    max: recordMax(record),
    counts: recordCountsInTotal(record),
  };
}

function sortSlots(slots: Slot[], groupByName: boolean): Slot[] {
  if (!groupByName) {
    return [...slots].sort(
      (a, b) =>
        a.order - b.order ||
        partRank(a.type) - partRank(b.type) ||
        a.subject.localeCompare(b.subject)
    );
  }

  // A subject group sits at the position of its lowest `order`, so the
  // Written and Oral rows of one subject always stay together.
  const groupOrder = new Map<string, number>();
  slots.forEach((slot) => {
    const name = normalize(slot.subject);
    groupOrder.set(
      name,
      Math.min(groupOrder.get(name) ?? Number.MAX_SAFE_INTEGER, slot.order)
    );
  });

  return [...slots].sort((a, b) => {
    const nameA = normalize(a.subject);
    const nameB = normalize(b.subject);
    return (
      (groupOrder.get(nameA) ?? 0) - (groupOrder.get(nameB) ?? 0) ||
      nameA.localeCompare(nameB) ||
      partRank(a.type) - partRank(b.type) ||
      a.order - b.order
    );
  });
}

function makeRow(slot: Slot, cells: ResultCell[]): ResultRow {
  const counted = cells.filter((cell) => cell.counts);
  const finalObtained = round2(
    counted.reduce((sum, cell) => sum + cell.obtained, 0)
  );
  const finalMax = counted.reduce((sum, cell) => sum + cell.max, 0);
  return {
    key: slot.key,
    subject: slot.subject,
    part: slot.type,
    isGroupStart: true,
    groupSize: 1,
    cells,
    finalText: counted.length > 0 ? String(finalObtained) : EMPTY_LABEL,
    finalObtained,
    finalMax,
  };
}

function assignGroups(rows: ResultRow[], groupByName: boolean): void {
  let start = 0;
  while (start < rows.length) {
    let end = start + 1;
    if (groupByName) {
      const name = normalize(rows[start].subject);
      while (end < rows.length && normalize(rows[end].subject) === name) {
        end += 1;
      }
    }
    rows[start].groupSize = end - start;
    for (let i = start + 1; i < end; i += 1) {
      rows[i].isGroupStart = false;
    }
    start = end;
  }
}

function buildRows(
  slots: Slot[],
  groupByName: boolean,
  cellsOf: (slot: Slot) => ResultCell[]
): ResultRow[] {
  const rows = sortSlots(slots, groupByName).map((slot) =>
    makeRow(slot, cellsOf(slot))
  );
  assignGroups(rows, groupByName);
  return rows;
}

function decideResult(
  rules: ExamRules,
  numericRows: ResultRow[],
  finalTotals: ResultTotals
): "pass" | "fail" | null {
  if (finalTotals.max <= 0) return null;

  if (rules.passMode === "subject") {
    const everySubjectPasses = numericRows.every(
      (row) =>
        row.finalMax <= 0 ||
        percentageOf(row.finalObtained, row.finalMax) >=
          rules.subjectPassPercentage
    );
    return everySubjectPasses ? "pass" : "fail";
  }

  return finalTotals.percentage >= rules.totalPassPercentage ? "pass" : "fail";
}

export function buildResultTable(params: {
  className: string;
  inputs: ResultExamInput[];
  rules: ExamRules;
}): ResultTableModel {
  const { className, rules } = params;
  const layout = getResultLayout(className);
  const inputs = [...params.inputs].sort((a, b) =>
    compareExamsForResult(a.exam, b.exam)
  );

  // 1. Every subject+type found in any selected exam becomes one row.
  const slotMap = new Map<string, Slot>();
  const columnsByExam = inputs.map((input) => {
    const columns = new Map<string, ExamSheetSubjectColumn>();
    (input.sheet?.subjects ?? []).forEach((column) => {
      const key = slotKey(column);
      columns.set(key, column);
      const existing = slotMap.get(key);
      if (existing) {
        existing.order = Math.min(existing.order, column.order);
      } else {
        slotMap.set(key, {
          key,
          subject: column.name,
          type: column.type,
          order: column.order,
          isGrade: column.isGrade,
        });
      }
    });
    return columns;
  });

  const allSlots = Array.from(slotMap.values());
  const numericSlots = allSlots.filter((slot) => !slot.isGrade);
  const gradeSlots = allSlots.filter((slot) => slot.isGrade);

  // 2. Class 1-8: Theory table + Practical table.
  //    PG-UKG: a single table with Written/Oral rows grouped per subject.
  const mainSlots =
    layout === "scheme"
      ? numericSlots.filter((slot) => !isPracticalSlot(slot))
      : numericSlots;
  const practicalSlots =
    layout === "scheme" ? numericSlots.filter(isPracticalSlot) : [];

  const cellsOf = (slot: Slot): ResultCell[] =>
    inputs.map((input, index) =>
      buildCell(input, columnsByExam[index].get(slot.key))
    );

  const mainRows = buildRows(mainSlots, layout === "written-oral", cellsOf);
  const practicalRows = buildRows(practicalSlots, false, cellsOf);
  const gradeRows = buildRows(gradeSlots, false, cellsOf);

  // 3. Totals use only counted numeric cells (grades and exempt are skipped).
  const numericRows = [...mainRows, ...practicalRows];

  const examTotals: ResultTotals[] = inputs.map((input, index) => {
    let obtained = 0;
    let max = 0;
    numericRows.forEach((row) => {
      const cell = row.cells[index];
      if (cell.counts) {
        obtained += cell.obtained;
        max += cell.max;
      }
    });
    return {
      obtained: round2(obtained),
      max,
      percentage: percentageOf(obtained, max),
      hasMarks: input.marks !== null,
    };
  });

  const finalObtained = round2(
    numericRows.reduce((sum, row) => sum + row.finalObtained, 0)
  );
  const finalMax = numericRows.reduce((sum, row) => sum + row.finalMax, 0);
  const finalTotals: ResultTotals = {
    obtained: finalObtained,
    max: finalMax,
    percentage: percentageOf(finalObtained, finalMax),
    hasMarks: examTotals.some((total) => total.hasMarks),
  };

  return {
    layout,
    exams: inputs.map((input) => ({
      id: input.exam.id,
      name: input.exam.examName,
    })),
    mainRows,
    practicalRows,
    gradeRows,
    examTotals,
    finalTotals,
    result: decideResult(rules, numericRows, finalTotals),
  };
}

/** Roll number as stored with the marks (same as the Cross List). */
export function rollNumberFromInputs(inputs: ResultExamInput[]): number {
  for (const input of inputs) {
    const roll = input.marks?.rollNumber;
    if (typeof roll === "number" && roll > 0) return roll;
  }
  return 0;
}