import type { ExamRules } from "./examRules";
import {
  defaultMarksScheme,
  NOT_APPLICABLE,
  subjectMarksBreakdown,
} from "./examMarksScheme";
import { computeRanks } from "./marks";
import {
  ABSENT_LABEL,
  EMPTY_LABEL,
  EXEMPT_LABEL,
  compareExamsForResult,
  getResultLayout,
  percentageOf,
  recordCountsInTotal,
  recordMax,
  recordObtained,
  resultCellText,
  resultExamLabel,
  round2,
} from "./resultCard";
import type { ResultLayout } from "./resultCard";
import type {
  ExamDoc,
  ExamSheetDoc,
  ExamSheetSubjectColumn,
  MarksDoc,
} from "./type";

/* ------------------------------------------------------------------ */
/* Grading scale (PDF ke "Instructions" table jaisa)                   */
/* ------------------------------------------------------------------ */

export const GRADE_SCALE = [
  { range: "91-100", min: 91, grade: "A1" },
  { range: "81-90", min: 81, grade: "A2" },
  { range: "71-80", min: 71, grade: "B1" },
  { range: "61-70", min: 61, grade: "B2" },
  { range: "51-60", min: 51, grade: "C1" },
  { range: "41-50", min: 41, grade: "C2" },
  { range: "33-40", min: 33, grade: "D" },
  { range: "32 and Below", min: 0, grade: "E" },
] as const;

/** Percentage ko nearest whole number karke grade nikalta hai (70.5 -> 71 -> B1). */
export function gradeFromPercentage(percentage: number): string {
  const rounded = Math.max(0, Math.round(percentage));
  const band = GRADE_SCALE.find((item) => rounded >= item.min);
  return band ? band.grade : "E";
}

/* ------------------------------------------------------------------ */
/* Term rule: exam ke naam se term decide hota hai                     */
/* ------------------------------------------------------------------ */

export type TermKey = "term1" | "term2";

const TERM_LABELS: Record<TermKey, string> = {
  term1: "TERM-I",
  term2: "TERM-II",
};

/**
 * Term 2 ke exams: naam mein II / 2 / 2nd / second / annual / final aaye.
 * Baaki sab (Unit Test I, Note Book I, Half Yearly ...) Term 1 hain.
 * Naya exam naam aaye to sirf yahi pattern badalna hai.
 */
const TERM_TWO_PATTERN =
  /(^|[^a-z0-9])(ii|2|2nd|second|annual|final)([^a-z0-9]|$)/i;

export function getExamTerm(exam: ExamDoc): TermKey {
  return TERM_TWO_PATTERN.test(exam.examName) ? "term2" : "term1";
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

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

/** Sum + grade of a group of cells (one term, or all terms = grand total). */
export interface ResultScore {
  obtained: number;
  max: number;
  text: string;
  grade: string;
}

export interface ResultExamHead {
  id: string;
  name: string;
  /** Max marks of this exam (0 = unknown). */
  max: number;
  /** Unit Test split hone par part: "test" / "notebook" (grade table filter ke liye). */
  sub?: "test" | "notebook";
}

export interface ResultTermHead {
  key: TermKey;
  label: string;
  exams: ResultExamHead[];
  /** "Marks Obtained (max)" of the term. */
  max: number;
}

export interface ResultRow {
  key: string;
  /** Label shown in the table, e.g. "MATHS" or "ENGLISH (Oral)". */
  subject: string;
  /** Plain subject name (chart ke liye). */
  subjectName: string;
  /** Paper type: "Written", "Oral", "Written + Oral", "" (single paper). */
  type: string;
  /** termCells[termIndex][examIndexInTerm] */
  termCells: ResultCell[][];
  termScores: ResultScore[];
  grand: ResultScore;
}

export interface ResultGradeRow {
  key: string;
  subject: string;
  /** Har exam ka apna grade column: termGrades[termIndex][examIndexInTerm] ("-" jab nahi hai). */
  termGrades: string[][];
}

export interface ResultTotals {
  obtained: number;
  max: number;
  percentage: number;
  grade: string;
  hasMarks: boolean;
}

export interface ResultTableModel {
  layout: ResultLayout;
  /** Sirf wahi terms jinke exams select hue hain. */
  terms: ResultTermHead[];
  /** Grand Total tabhi dikhta hai jab Term 1 aur Term 2 dono ho. */
  showGrand: boolean;
  grandMax: number;
  rows: ResultRow[];
  /** Scholastic Areas II (grade wale subjects). */
  gradeRows: ResultGradeRow[];
  termTotals: ResultTotals[];
  /** examTotals[termIndex][examHeadIndex]: har exam column ka apna total + percentage. */
  examTotals: ResultTotals[][];
  grandTotals: ResultTotals;
  /** null when there are no counted marks at all. */
  result: "pass" | "fail" | null;
}

/**
 * Card ke wo fields jo marks mein nahi hote. Marks entry form banate waqt
 * inhe Firestore mein save karna (rank save nahi hota, wo calculate hota hai):
 *
 *   resultExtras/{session}_{studentUid} -> {
 *     remarks: string,
 *     attendancePresent: number,
 *     attendanceTotal: number,
 *     resultDate: string   // "DD.MM.YYYY"
 *   }
 */
export interface ResultCardExtras {
  remarks?: string;
  attendancePresent?: number | null;
  attendanceTotal?: number | null;
  rank?: number | null;
  resultDate?: string;
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Classes 1-8 mein EX (exempt) paper ka max total mein judta hai ya nahi.
 *  true  -> max hamesha AddExam ke scheme jaisa rehta hai (8 subjects = 1600);
 *           EX wale paper ke obtained marks 0 gine jaate hain.
 *  false -> EX wale paper ka max total se hat jata hai (max 1600 se kam ho sakta hai).
 */
const EXEMPT_COUNTS_IN_MAX = true;

interface Slot {
  key: string;
  subject: string;
  type: string;
  order: number;
  /** Report card mein display order (undefined/0 = ordered subjects ke baad). */
  reportCardOrder?: number;
  isGrade: boolean;
}

function normalize(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

/** The same subject + type is one row across every exam. */
function slotKey(column: ExamSheetSubjectColumn): string {
  return `${normalize(column.name)}|${normalize(column.type)}`;
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

/** "Maths" (Theory) -> "Maths"; "English" (Oral) -> "English (Oral)". */
function rowLabel(slot: Slot): string {
  const type = normalize(slot.type);
  if (type === "" || type === "theory" || type === "scholastic") {
    return slot.subject;
  }
  return `${slot.subject} (${slot.type})`;
}

/**
 * Exam sheet ke pehle numeric subject column ka max marks. Header ke
 * "(max)" ke liye fallback: student ke marks na bhare hone par bhi column
 * heading complete dikhe (marks wale columns dash hote hain phir bhi).
 */
function sheetExamMax(columns: Map<string, ExamSheetSubjectColumn>): number {
  for (const column of columns.values()) {
    if (!column.isGrade && column.maxMarks > 0) return column.maxMarks;
  }
  return 0;
}

/**
 * Unit Test exams ka Notebook split active hai? (classes 1-8 scheme + Unit
 * Test exam). Sheet snapshot par depend nahi karte - purani sheets jinki
 * componentMax nahi hai un par bhi Notebook column aata hai.
 */
function examHasNotebook(input: ResultExamInput, scheme: boolean): boolean {
  return scheme && input.exam.examCategory === "UNIT_TEST";
}

/**
 * Unit Test ke Notebook / Test dono ke max marks - sirf exam ke marksScheme se
 * (AddExam mein jo define hua). Sheet snapshot ka componentMax ignore hota hai,
 * taaki purani/stale sheet se max kabhi alag na ho.
 */
function unitTestComponentMaxes(
  input: ResultExamInput,
  _columns?: Map<string, ExamSheetSubjectColumn>
): { test: number; notebook: number } {
  const scheme = input.exam.marksScheme ?? defaultMarksScheme();
  const schemeBreakdown = subjectMarksBreakdown("UNIT_TEST", scheme, false);
  return {
    notebook: schemeBreakdown.notebook,
    test: schemeBreakdown.theory,
  };
}

/** True when the paper is a "Practical"-type subject row. */
function isPracticalPaper(column: ExamSheetSubjectColumn): boolean {
  return normalize(column.type) === "practical";
}

/**
 * Classes 1-8 (scheme): one paper's authoritative max marks, taken from the
 * exam scheme + subject setup - exactly like the Marks Entry page - and NOT
 * from the saved per-student records (those may carry stale/incomplete maxes).
 *
 *  - Unit Test papers are built by buildComponentCell(); this helper returns 0.
 *  - Main Exams: Science/Computer split into 50 theory (parent row, detected
 *    via the same-named Practical sibling in this exam's sheet) + 20 practical
 *    (the Practical-type row); every other subject keeps a plain 70 theory.
 */
function schemePaperMax(
  exam: ExamDoc,
  column: ExamSheetSubjectColumn,
  columnsOfExam: Map<string, ExamSheetSubjectColumn>
): number {
  if (column.isGrade) return 0;
  const scheme = exam.marksScheme ?? defaultMarksScheme();
  if (exam.examCategory === "UNIT_TEST") return 0;
  const name = normalize(column.name);
  if (isPracticalPaper(column)) {
    return subjectMarksBreakdown("MAIN_EXAM", scheme, true).practical;
  }
  const hasPracticalSibling = Array.from(columnsOfExam.values()).some(
    (other) =>
      other.id !== column.id &&
      normalize(other.name) === name &&
      isPracticalPaper(other)
  );
  return subjectMarksBreakdown(
    "MAIN_EXAM",
    scheme,
    hasPracticalSibling
  ).theory;
}

/**
 * Unit Test ka Notebook ya Test part ka cell. Classes 1-8 scheme mein max
 * marks column/ scheme se aate hain aur ek baar exam ka marks doc exist kare
 * (input.marks) to har paper count hota hai - kisi subject ka record chhut
 * jaye to bhi us paper ka max total mein aata hai. Practical-type subjects ka
 * Unit Test mein koi paper nahi hota. Purane records (components ke bina)
 * mein Test cell poora total rakhta hai aur Notebook "-" / count nahi hota.
 */
function buildComponentCell(
  input: ResultExamInput,
  column: ExamSheetSubjectColumn | undefined,
  comp: "notebook" | "test"
): ResultCell {
  if (!input.sheet) {
    return { text: EMPTY_LABEL, obtained: 0, max: 0, counts: false };
  }
  if (!column) {
    return { text: NOT_APPLICABLE, obtained: 0, max: 0, counts: false };
  }

  // Unit Tests (classes 1-8) me practical paper nahi hota, isliye
  // Practical-type subject row ka notebook/test cell bhi NA hai.
  if (isPracticalPaper(column)) {
    return { text: NOT_APPLICABLE, obtained: 0, max: 0, counts: false };
  }

  const record = input.marks?.subjectMarks?.[column.id];

  // Max: hamesha exam ke marksScheme se (AddExam), sheet snapshot se nahi.
  const scheme = input.exam.marksScheme ?? defaultMarksScheme();
  const schemeBreakdown = subjectMarksBreakdown("UNIT_TEST", scheme, false);
  const max =
    comp === "notebook" ? schemeBreakdown.notebook : schemeBreakdown.theory;

  if (record?.status === "exempt") {
    return {
      text: EXEMPT_LABEL,
      obtained: 0,
      max,
      counts: EXEMPT_COUNTS_IN_MAX && input.marks !== null,
    };
  }
  // Exam ka marks doc hi nahi hai: poora exam count nahi hota.
  if (input.marks === null) {
    return { text: EMPTY_LABEL, obtained: 0, max, counts: false };
  }
  // Subject enter nahi hua (record missing): paper exists, isliye max count
  // hota hai, obtained 0.
  if (!record) {
    return { text: EMPTY_LABEL, obtained: 0, max, counts: true };
  }
  if (record.status === "absent") {
    return { text: ABSENT_LABEL, obtained: 0, max, counts: true };
  }

  const parts = record.components ?? {};
  const hasAnyPart = (Object.values(parts) as (number | null)[]).some(
    (value) => typeof value === "number" && Number.isFinite(value)
  );
  if (hasAnyPart) {
    const value = parts[comp];
    if (typeof value === "number" && Number.isFinite(value)) {
      const num = round2(value);
      return { text: String(num), obtained: num, max, counts: true };
    }
    return { text: EMPTY_LABEL, obtained: 0, max, counts: true };
  }

  // Purana data (components nahi): Notebook cell "-" rehta hai aur Test cell
  // mein poora subject total dikhta hai. Max saved record se nahi, scheme ke
  // total (notebook + test) se aata hai, taaki total hamesha AddExam jaisa rahe.
  if (comp === "notebook") {
    return { text: EMPTY_LABEL, obtained: 0, max: 0, counts: false };
  }
  return {
    text: resultCellText(record),
    obtained: recordObtained(record),
    max: schemeBreakdown.total,
    counts: true,
  };
}

/** Ek term ke andar ek head column ka counted max (students ke filled marks se). */
function countedMaxAt(
  rows: ResultRow[],
  termIndex: number,
  headIndex: number
): number {
  return (
    rows
      .map((row) => row.termCells[termIndex][headIndex])
      .find((cell) => cell.counts && cell.max > 0)?.max ?? 0
  );
}

function buildCell(
  input: ResultExamInput,
  column: ExamSheetSubjectColumn | undefined,
  layout: ResultLayout,
  columnsOfExam?: Map<string, ExamSheetSubjectColumn>
): ResultCell {
  // Exam ke liye koi sheet snapshot hi nahi hai (abhi kisi ka bhi marks save
  // nahi hua): is student (aur class) ke saare cells "-" hote hain, "NA" nahi.
  if (!input.sheet) {
    return { text: EMPTY_LABEL, obtained: 0, max: 0, counts: false };
  }
  // This exam's sheet has no such paper (e.g. practical in a Unit Test).
  if (!column) {
    return { text: NOT_APPLICABLE, obtained: 0, max: 0, counts: false };
  }
  const record = input.marks?.subjectMarks?.[column.id];

  // Classes 1-8 (scheme): max marks hamesha scheme se aate hain (saved
  // records se nahi), aur exam ka marks doc exist karte hi har paper count
  // hota hai - absent / na-bhare subjects 0 marks par max ke saath count
  // hote hain. Issi se grand total deterministic rehta hai
  // (8 subjects x 200 = 1600) aur percentage scheme ke max par banta hai.
  if (layout === "scheme") {
    const max = schemePaperMax(
      input.exam,
      column,
      columnsOfExam ?? new Map()
    );
    if (record?.status === "exempt") {
      return {
        text: EXEMPT_LABEL,
        obtained: 0,
        max,
        counts: EXEMPT_COUNTS_IN_MAX && input.marks !== null && max > 0,
      };
    }
    if (input.marks === null) {
      return { text: EMPTY_LABEL, obtained: 0, max, counts: false };
    }
    return {
      text: resultCellText(record),
      obtained: recordObtained(record),
      max,
      counts: max > 0,
    };
  }

  // Non-scheme (PG, Nursery, LKG, UKG): saved record ke hisaab se.
  return {
    text: resultCellText(record),
    obtained: recordObtained(record),
    max: recordMax(record),
    counts: recordCountsInTotal(record),
  };
}

/**
 * Report card ke liye sort key. Defined (>0) reportCardOrder wale subjects
 * pehle ascending order mein aate hain; undefined / 0 wale Number.MAX_SAFE_INTEGER
 * lete hain, jo comparator ko unhe ordered subjects ke baad (bottom) rakhta hai.
 */
function reportCardSortKey(value: number | undefined): number {
  return typeof value === "number" && value > 0
    ? value
    : Number.MAX_SAFE_INTEGER;
}

function sortSlots(slots: Slot[], groupByName: boolean): Slot[] {
  if (!groupByName) {
    return [...slots].sort(
      (a, b) =>
        reportCardSortKey(a.reportCardOrder) -
          reportCardSortKey(b.reportCardOrder) ||
        a.order - b.order ||
        partRank(a.type) - partRank(b.type) ||
        a.subject.localeCompare(b.subject)
    );
  }

  // A subject group sits at the position of its lowest `order`, so the
  // Written and Oral rows of one subject always stay together. The same
  // applies to the report card order, so a subject (group) whose report card
  // order is defined floats above the ones that have none.
  const groupOrder = new Map<string, number>();
  const groupReportCardOrder = new Map<string, number>();
  slots.forEach((slot) => {
    const name = normalize(slot.subject);
    groupOrder.set(
      name,
      Math.min(groupOrder.get(name) ?? Number.MAX_SAFE_INTEGER, slot.order)
    );
    groupReportCardOrder.set(
      name,
      Math.min(
        groupReportCardOrder.get(name) ?? Number.MAX_SAFE_INTEGER,
        reportCardSortKey(slot.reportCardOrder)
      )
    );
  });

  return [...slots].sort((a, b) => {
    const nameA = normalize(a.subject);
    const nameB = normalize(b.subject);
    return (
      (groupReportCardOrder.get(nameA) ?? Number.MAX_SAFE_INTEGER) -
        (groupReportCardOrder.get(nameB) ?? Number.MAX_SAFE_INTEGER) ||
      (groupOrder.get(nameA) ?? 0) - (groupOrder.get(nameB) ?? 0) ||
      nameA.localeCompare(nameB) ||
      partRank(a.type) - partRank(b.type) ||
      a.order - b.order
    );
  });
}

function scoreOf(cells: ResultCell[]): ResultScore {
  const counted = cells.filter((cell) => cell.counts);
  const obtained = round2(
    counted.reduce((sum, cell) => sum + cell.obtained, 0)
  );
  const max = counted.reduce((sum, cell) => sum + cell.max, 0);
  return {
    obtained,
    max,
    text: counted.length > 0 ? String(obtained) : EMPTY_LABEL,
    grade:
      counted.length > 0 && max > 0
        ? gradeFromPercentage((obtained / max) * 100)
        : EMPTY_LABEL,
  };
}

function totalsOf(scores: ResultScore[], hasMarks: boolean): ResultTotals {
  const obtained = round2(scores.reduce((sum, score) => sum + score.obtained, 0));
  const max = scores.reduce((sum, score) => sum + score.max, 0);
  return {
    obtained,
    max,
    percentage: percentageOf(obtained, max),
    grade: max > 0 ? gradeFromPercentage((obtained / max) * 100) : EMPTY_LABEL,
    hasMarks,
  };
}

function decideResult(
  rules: ExamRules,
  rows: ResultRow[],
  grandTotals: ResultTotals
): "pass" | "fail" | null {
  if (grandTotals.max <= 0) return null;

  if (rules.passMode === "subject") {
    const everySubjectPasses = rows.every(
      (row) =>
        row.grand.max <= 0 ||
        percentageOf(row.grand.obtained, row.grand.max) >=
          rules.subjectPassPercentage
    );
    return everySubjectPasses ? "pass" : "fail";
  }

  return grandTotals.percentage >= rules.totalPassPercentage ? "pass" : "fail";
}

/* ------------------------------------------------------------------ */
/* Main builder                                                        */
/* ------------------------------------------------------------------ */

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
        // Chhoti report card order wala value win karta hai (undefined = max).
        const existingReport = reportCardSortKey(existing.reportCardOrder);
        const columnReport = reportCardSortKey(column.reportCardOrder);
        if (columnReport < existingReport) {
          existing.reportCardOrder = column.reportCardOrder;
        }
      } else {
        slotMap.set(key, {
          key,
          subject: column.name,
          type: column.type,
          order: column.order,
          reportCardOrder: column.reportCardOrder,
          isGrade: column.isGrade,
        });
      }
    });
    return columns;
  });

  const allSlots = Array.from(slotMap.values());
  // Sirf Unit Test select hone par (classes 1-8) practical paper nahi hota, isliye
  // same naam ke non-practical subject wali Practical (PR) row hata dete hain.
  // Half Yearly / Annual select hone par ye rows pehle jaisi dikhti hain.
  const onlyUnitTests =
    layout === "scheme" &&
    inputs.length > 0 &&
    inputs.every((input) => input.exam.examCategory === "UNIT_TEST");
  const nonPracticalNames = new Set(
    allSlots
      .filter((slot) => !slot.isGrade && normalize(slot.type) !== "practical")
      .map((slot) => normalize(slot.subject))
  );
  const numericSlots = allSlots.filter((slot) => {
    if (slot.isGrade) return false;
    if (
      onlyUnitTests &&
      normalize(slot.type) === "practical" &&
      nonPracticalNames.has(normalize(slot.subject))
    ) {
      return false;
    }
    return true;
  });
  const gradeSlots = allSlots.filter((slot) => slot.isGrade);

  // 2. Selected exams ko terms mein baanto (sirf wahi terms jinme exam hai).
  const termGroups: {
    key: TermKey;
    members: { input: ResultExamInput; index: number }[];
  }[] = [];
  (["term1", "term2"] as TermKey[]).forEach((key) => {
    const members = inputs
      .map((input, index) => ({ input, index }))
      .filter(({ input }) => getExamTerm(input.exam) === key);
    if (members.length > 0) termGroups.push({ key, members });
  });

  // 3. Numeric rows: ek hi table, har subject ek row.
  const rows: ResultRow[] = sortSlots(
    numericSlots,
    layout === "written-oral"
  ).map((slot) => {
    const termCells = termGroups.map((group) =>
      group.members.flatMap(({ input, index }) => {
        const columns = columnsByExam[index];
        const column = columns.get(slot.key);
        // Unit Test (classes 1-8 scheme): Notebook + Test alag column bante hain.
        if (examHasNotebook(input, layout === "scheme")) {
          return [
            buildComponentCell(input, column, "test"),
            buildComponentCell(input, column, "notebook"),
          ];
        }
        return [buildCell(input, column, layout, columns)];
      })
    );
    return {
      key: slot.key,
      subject: rowLabel(slot),
      subjectName: slot.subject,
      type: slot.type,
      termCells,
      termScores: termCells.map(scoreOf),
      grand: scoreOf(termCells.flat()),
    };
  });

  // 4. Table headers (exam name + max marks).
  const terms: ResultTermHead[] = termGroups.map((group, termIndex) => {
    const exams: ResultExamHead[] = [];
    group.members.forEach(({ input, index }) => {
      const columns = columnsByExam[index];
      const examLabel = resultExamLabel(input.exam.examName);

      // Unit Test (classes 1-8 scheme): Notebook ka column Unit Test ke turant
      // baad aata hai (Unit Test I, Notebook, Half Yearly ...).
      if (examHasNotebook(input, layout === "scheme")) {
        const compMax = unitTestComponentMaxes(input, columns);
        const notebookIndex = exams.length + 1;
        const notebookMax =
          compMax.notebook ||
          rows
            .map((row) => row.termCells[termIndex][notebookIndex])
            .find((cell) => cell.counts && cell.max > 0)?.max ||
          0;
        const testMax =
          compMax.test ||
          Math.max(0, (input.exam.maxMarks || 0) - notebookMax) ||
          countedMaxAt(rows, termIndex, exams.length);
        exams.push({
          id: `${input.exam.id}:test`,
          name: examLabel,
          max: testMax,
          sub: "test",
        });
        exams.push({
          id: `${input.exam.id}:notebook`,
          name: "Notebook",
          max: notebookMax,
          sub: "notebook",
        });
        return;
      }

      // AddExam mein define kiye gaye max marks (exam.maxMarks) hi heading
      // mein dikhte hain (Unit Test = 30, Half Yearly = 70, practical 20,
      // waghera) - chahe student ke marks filled hon ya nahi, aur chahe
      // sheet mein paper split (Written/Oral/Theory) kaise bhi ho. Purane
      // exams (jinke paas maxMarks nahi) ke liye counted cells / sheet
      // fallback rehta hai.
      exams.push({
        id: input.exam.id,
        name: examLabel,
        max:
          (typeof input.exam.maxMarks === "number" &&
          input.exam.maxMarks > 0
            ? input.exam.maxMarks
            : countedMaxAt(rows, termIndex, exams.length) ||
              sheetExamMax(columns)) || 0,
      });
    });
    return {
      key: group.key,
      label: TERM_LABELS[group.key],
      exams,
      max:
        rows.reduce(
          (highest, row) => Math.max(highest, row.termScores[termIndex].max),
          0
        ) || exams.reduce((sum, exam) => sum + exam.max, 0),
    };
  });

  // 5. Totals (grades / exempt / absent count nahi hote).
  const termTotals = termGroups.map((group, termIndex) =>
    totalsOf(
      rows.map((row) => row.termScores[termIndex]),
      group.members.some(({ input }) => input.marks !== null)
    )
  );
  const grandTotals = totalsOf(
    rows.map((row) => row.grand),
    inputs.some((input) => input.marks !== null)
  );

  // 5b. Har exam column ka apna total + percentage (Unit Test, Notebook,
  //     Half Yearly, Annual alag-alag). Order terms[].exams jaisa hi hai:
  //     Unit Test ke liye pehle "test" phir "notebook" column.
  const examTotals: ResultTotals[][] = termGroups.map((group, termIndex) => {
    const totals: ResultTotals[] = [];
    group.members.forEach(({ input }) => {
      const heads = examHasNotebook(input, layout === "scheme") ? 2 : 1;
      for (let offset = 0; offset < heads; offset += 1) {
        const headIndex = totals.length;
        const score = scoreOf(
          rows.map((row) => row.termCells[termIndex][headIndex])
        );
        totals.push(totalsOf([score], input.marks !== null));
      }
    });
    return totals;
  });

  // 6. Scholastic Areas II: har exam ke liye apna grade column (Term-I: Unit
  //    Test I + Half Yearly, Term-II: Unit Test II + Annual). Jis exam mein
  //    grade save hai wahi dikhta hai; baaki "-".
  const gradeRows: ResultGradeRow[] = sortSlots(gradeSlots, false).map(
    (slot) => ({
      key: slot.key,
      subject: slot.subject,
      termGrades: termGroups.map((group) =>
        group.members.map(({ input, index }) => {
          const grade = buildCell(
            input,
            columnsByExam[index].get(slot.key),
            layout,
            columnsByExam[index]
          ).text;
          return grade === EMPTY_LABEL || grade === NOT_APPLICABLE
            ? EMPTY_LABEL
            : grade;
        })
      ),
    })
  );

  return {
    layout,
    terms,
    showGrand: terms.length > 1,
    grandMax: rows.reduce((highest, row) => Math.max(highest, row.grand.max), 0),
    rows,
    gradeRows,
    termTotals,
    examTotals,
    grandTotals,
    result: decideResult(rules, rows, grandTotals),
  };
}

/* ------------------------------------------------------------------ */
/* Rank (Cross List jaisa rule, par selected exams ke combined total par) */
/* ------------------------------------------------------------------ */

/**
 * marksPerExam: selected har exam ke liye poori class ke MarksDoc (ek array
 * per exam). Rank un students ko milta hai jinke SABHI selected exams mein
 * marks saved hain. rules.rankScope ke hisaab se rank section ya poori class
 * mein hota hai. Result: { [studentUid]: rank }.
 */
export function computeResultRanks(params: {
  marksPerExam: MarksDoc[][];
  rules: ExamRules;
}): Record<string, number> {
  const { marksPerExam, rules } = params;
  if (marksPerExam.length === 0) return {};

  const groups = new Map<string, Map<string, { total: number; exams: number }>>();
  marksPerExam.forEach((list) => {
    list.forEach((marks) => {
      const groupKey =
        rules.rankScope === "class"
          ? marks.className
          : `${marks.className}|${marks.section}`;
      const group =
        groups.get(groupKey) ??
        new Map<string, { total: number; exams: number }>();
      const entry = group.get(marks.studentUid) ?? { total: 0, exams: 0 };
      entry.total += marks.totalMarks;
      entry.exams += 1;
      group.set(marks.studentUid, entry);
      groups.set(groupKey, group);
    });
  });

  const ranks: Record<string, number> = {};
  groups.forEach((group) => {
    const rows = Array.from(group.entries())
      .filter(([, entry]) => entry.exams === marksPerExam.length)
      .map(([studentUid, entry]) => ({
        studentUid,
        totalMarks: round2(entry.total),
      }));
    Object.assign(ranks, computeRanks(rows));
  });
  return ranks;
}