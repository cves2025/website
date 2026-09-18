/**
 * Single source of truth for the marks split used by the Exams module.
 *
 * Classes 1 to 8:
 *  - Unit Test 1 / Unit Test 2 : Notebook 5 + Written Test 25 = 30
 *  - Half Yearly / Annual      : Theory 70 for every subject, except
 *    Science & Computer which are 50 Theory + 20 Practical = 70.
 *
 * Science & Computer therefore show a Practical column in the result; every
 * other subject shows "NA" in that column. Both the result table and the admit
 * card read the scheme from here so all pages stay in sync.
 */

export type ExamCategory = "UNIT_TEST" | "MAIN_EXAM";

/** Subjects that carry a separate practical paper (classes 1 to 8 only). */
export const PRACTICAL_SUBJECTS: string[] = ["Science", "Computer"];

/** Classes the notebook + practical marks scheme applies to (classes 1 to 8). */
export const SCHEME_CLASSES: string[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
];

/** Unit Test 1 / Unit Test 2 split (total 30). */
export const UNIT_TEST_NOTEBOOK_MARKS = 5;
export const UNIT_TEST_TEST_MARKS = 25;

/** Half Yearly / Annual split (total 70). */
export const MAIN_EXAM_THEORY_MARKS = 70;
export const MAIN_EXAM_PRACTICAL_THEORY_MARKS = 50;
export const MAIN_EXAM_PRACTICAL_MARKS = 20;

/** Text shown in the Practical column for subjects without a practical paper. */
export const NOT_APPLICABLE = "NA";

export interface MarksScheme {
  /** Unit test internal/notebook marks. */
  notebookMarks: number;
  /** Unit test written paper marks. */
  testMarks: number;
  /** Half yearly / annual theory marks for regular subjects. */
  theoryMarks: number;
  /** Half yearly / annual theory marks for Science & Computer. */
  practicalTheoryMarks: number;
  /** Half yearly / annual practical marks for Science & Computer. */
  practicalMarks: number;
}

export interface SubjectMarksBreakdown {
  /** Notebook / internal marks (unit tests only, otherwise 0). */
  notebook: number;
  /** Written theory marks (unit test: written test marks). */
  theory: number;
  /** Practical marks (0 when the subject has no practical paper). */
  practical: number;
  /** Sum of notebook + theory + practical. */
  total: number;
  /** True only for Science & Computer in Half Yearly / Annual. */
  hasPractical: boolean;
}

/**
 * The class 1-8 marks scheme every exam template starts with. Both categories
 * keep the full split so switching category never loses the other defaults.
 */
export function defaultMarksScheme(): MarksScheme {
  return {
    notebookMarks: UNIT_TEST_NOTEBOOK_MARKS,
    testMarks: UNIT_TEST_TEST_MARKS,
    theoryMarks: MAIN_EXAM_THEORY_MARKS,
    practicalTheoryMarks: MAIN_EXAM_PRACTICAL_THEORY_MARKS,
    practicalMarks: MAIN_EXAM_PRACTICAL_MARKS,
  };
}

/** True when the class belongs to the 1-8 scheme. */
export function isSchemeClass(className: string): boolean {
  return SCHEME_CLASSES.includes(String(className ?? "").trim());
}

/** True when at least one applicable class falls in classes 1 to 8. */
export function hasSchemeClass(classes: string[] | null | undefined): boolean {
  if (!Array.isArray(classes)) return false;
  return classes.some((className) => isSchemeClass(className));
}

/** Case-insensitive "Science"/"Computer" check. */
export function isPracticalSubject(subject: string): boolean {
  const name = String(subject ?? "").trim().toLowerCase();
  return PRACTICAL_SUBJECTS.some((item) => item.toLowerCase() === name);
}

/** Safe non-negative number conversion for the string based form fields. */
export function toMarksNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
  }
  return fallback;
}
/**
 * Reads the scheme saved on an exam document.
 *
 * Older documents only stored `maxMarks`, so those totals are preserved when
 * the split fields are missing.
 */
export function marksSchemeFromDoc(
  data: Record<string, unknown>,
  fallbackMaxMarks?: number
): MarksScheme {
  const scheme = defaultMarksScheme();
  const storedMaxMarks =
    typeof fallbackMaxMarks === "number" && fallbackMaxMarks > 0
      ? fallbackMaxMarks
      : toMarksNumber(data.maxMarks, 0);

  const read = (key: keyof MarksScheme, fallbackValue: number): number =>
    typeof data[key] === "number"
      ? toMarksNumber(data[key], fallbackValue)
      : fallbackValue;

  const notebook = read("notebookMarks", scheme.notebookMarks);
  const test = read("testMarks", scheme.testMarks);
  const theory = read("theoryMarks", scheme.theoryMarks);
  const practicalTheory = read(
    "practicalTheoryMarks",
    scheme.practicalTheoryMarks
  );
  const practical = read("practicalMarks", scheme.practicalMarks);

  // Legacy Unit Test documents only stored maxMarks (e.g. 30).
  const legacyUnitTest =
    storedMaxMarks > 0 &&
    data.notebookMarks === undefined &&
    data.testMarks === undefined;
  const legacyNotebook = Math.min(
    scheme.notebookMarks,
    Math.max(storedMaxMarks - 1, 0)
  );

  // Legacy Half Yearly / Annual documents only stored maxMarks (e.g. 70).
  const legacyMainExam = storedMaxMarks > 0 && data.theoryMarks === undefined;

  return {
    notebookMarks: legacyUnitTest ? legacyNotebook : notebook,
    testMarks: legacyUnitTest ? storedMaxMarks - legacyNotebook : test,
    theoryMarks: legacyMainExam ? storedMaxMarks : theory,
    practicalTheoryMarks: legacyMainExam
      ? Math.max(storedMaxMarks - practical, 0)
      : practicalTheory,
    practicalMarks: practical,
  };
}

/** Per-subject maximum marks for the selected exam category. */
export function subjectMarksBreakdown(
  subject: string,
  category: ExamCategory,
  scheme: MarksScheme
): SubjectMarksBreakdown {
  if (category === "UNIT_TEST") {
    return {
      notebook: scheme.notebookMarks,
      theory: scheme.testMarks,
      practical: 0,
      total: scheme.notebookMarks + scheme.testMarks,
      hasPractical: false,
    };
  }

  if (isPracticalSubject(subject) && scheme.practicalMarks > 0) {
    return {
      notebook: 0,
      theory: scheme.practicalTheoryMarks,
      practical: scheme.practicalMarks,
      total: scheme.practicalTheoryMarks + scheme.practicalMarks,
      hasPractical: true,
    };
  }

  return {
    notebook: 0,
    theory: scheme.theoryMarks,
    practical: 0,
    total: scheme.theoryMarks,
    hasPractical: false,
  };
}

/** Total maximum marks of one subject for the selected exam category. */
export function schemeMaxMarks(
  category: ExamCategory,
  scheme: MarksScheme
): number {
  if (category === "UNIT_TEST") {
    return scheme.notebookMarks + scheme.testMarks;
  }
  return Math.max(
    scheme.theoryMarks,
    scheme.practicalTheoryMarks + scheme.practicalMarks
  );
}

/** Long description used in the Add Exam preview and exam list tooltips. */
export function marksSchemeSummary(
  category: ExamCategory,
  scheme: MarksScheme
): string {
  if (category === "UNIT_TEST") {
    return `Notebook ${scheme.notebookMarks} + Written Test ${scheme.testMarks} = ${
      scheme.notebookMarks + scheme.testMarks
    } marks per subject.`;
  }

  const practicalText =
    scheme.practicalMarks > 0
      ? ` | ${PRACTICAL_SUBJECTS.join(" & ")}: ${
          scheme.practicalTheoryMarks
        } Theory + ${scheme.practicalMarks} Practical = ${
          scheme.practicalTheoryMarks + scheme.practicalMarks
        }`
      : "";
  return `Theory ${scheme.theoryMarks} for every subject${practicalText}.`;
}

/** Short description used inside list tables. */
export function marksSchemeBadge(
  category: ExamCategory,
  scheme: MarksScheme
): string {
  if (category === "UNIT_TEST") {
    return `Notebook ${scheme.notebookMarks} + Test ${scheme.testMarks} = ${
      scheme.notebookMarks + scheme.testMarks
    }`;
  }
  if (scheme.practicalMarks > 0) {
    return `${scheme.theoryMarks} Theory | ${PRACTICAL_SUBJECTS.join(
      "/"
    )} ${scheme.practicalTheoryMarks} + ${scheme.practicalMarks}`;
  }
  return `${scheme.theoryMarks} Theory`;
}

/** Text for a marks cell: the value when the paper applies, else "NA". */
export function marksCellLabel(
  marks: number | null | undefined,
  applicable: boolean
): string {
  if (!applicable) return NOT_APPLICABLE;
  return typeof marks === "number" && Number.isFinite(marks)
    ? String(marks)
    : NOT_APPLICABLE;
}