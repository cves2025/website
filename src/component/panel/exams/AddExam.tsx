import { useEffect, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { useForm, SubmitHandler } from "react-hook-form";
import CustomButton from "../../../custom-components/CustomButton";
import CustomCheckboxGroup from "../../../custom-components/CustomCheckboxGroup";
import CustomInput from "../../../custom-components/CustomInput";
import CustomRadioGroup from "../../../custom-components/CustomRadioGroup";
import CustomSelect from "../../../custom-components/CustomSelect";
import CustomToggle from "../../../custom-components/CustomToggle";
import FormMessage from "../../../custom-components/FormMessage";
import Loader from "../../../custom-components/Loader";
import { COLLECTION, CLASSES } from "../../../constants";
import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { toDateOrNull } from "../../../utils/toDateOrNull";
import {
  ExamCategory,
  MarksScheme,
  PRACTICAL_SUBJECTS,
  SCHEME_CLASSES,
  defaultMarksScheme,
  hasSchemeClass,
  marksSchemeFromDoc,
  marksSchemeSummary,
  schemeMaxMarks,
  toMarksNumber,
} from "../../../utils/examMarksScheme";

type ExamStatus = "active" | "archived";

interface ExamFormValues {
  examName: string;
  customExamName: string;
  examCategory: ExamCategory;
  // Classes 1-8 marks split: Unit Test = notebook + written test,
  // Half Yearly / Annual = theory (+ practical for Science & Computer).
  notebookMarks: string;
  testMarks: string;
  theoryMarks: string;
  practicalTheoryMarks: string;
  practicalMarks: string;
  applicableClasses: string[];
  academicYear: string;
  // <input type="date"> only understands "yyyy-MM-dd" strings, so the form keeps
  // dates as strings and converts them to a Timestamp while saving.
  examStartDate: string;
  examEndDate: string;
  sequence: string;
  status: ExamStatus;
}

const EXAM_NAME_OPTIONS = [
  "Unit Test 1",
  "Unit Test 2",
  "Half Yearly",
  "Annual Exam",
  "Other",
];

// Which category each preset exam name belongs to. "Other" is picked manually.
const EXAM_NAME_CATEGORY: Partial<Record<string, ExamCategory>> = {
  "Unit Test 1": "UNIT_TEST",
  "Unit Test 2": "UNIT_TEST",
  "Half Yearly": "MAIN_EXAM",
  "Annual Exam": "MAIN_EXAM",
};

const CATEGORY_LABEL: Record<ExamCategory, string> = {
  UNIT_TEST: "Unit Test",
  MAIN_EXAM: "Main Exam",
};

/**
 * Class 1-8 marks split used as the starting point of every exam template:
 * Unit Test = 5 notebook + 25 test (30), Half Yearly / Annual = 70 theory with
 * Science & Computer split as 50 theory + 20 practical.
 */
const DEFAULT_SCHEME: MarksScheme = defaultMarksScheme();

type SchemeFormFields = Pick<
  ExamFormValues,
  | "notebookMarks"
  | "testMarks"
  | "theoryMarks"
  | "practicalTheoryMarks"
  | "practicalMarks"
>;

const DEFAULT_SCHEME_FORM: SchemeFormFields = {
  notebookMarks: String(DEFAULT_SCHEME.notebookMarks),
  testMarks: String(DEFAULT_SCHEME.testMarks),
  theoryMarks: String(DEFAULT_SCHEME.theoryMarks),
  practicalTheoryMarks: String(DEFAULT_SCHEME.practicalTheoryMarks),
  practicalMarks: String(DEFAULT_SCHEME.practicalMarks),
};

/** Converts a saved/derived scheme into the string based form fields. */
function schemeToFormValues(scheme: MarksScheme): SchemeFormFields {
  return {
    notebookMarks: String(scheme.notebookMarks),
    testMarks: String(scheme.testMarks),
    theoryMarks: String(scheme.theoryMarks),
    practicalTheoryMarks: String(scheme.practicalTheoryMarks),
    practicalMarks: String(scheme.practicalMarks),
  };
}

/**
 * Builds a react-hook-form validation rule that only accepts whole numbers
 * inside [min, max]. Number inputs hand the value over as a string.
 */
function wholeNumberRule(label: string, min: number, max: number) {
  return {
    validate: (value: string | Date | string[] | null) => {
      const textValue = typeof value === "string" ? value.trim() : "";
      const numeric = Number(textValue);
      if (textValue === "" || !Number.isFinite(numeric)) {
        return `${label} is required.`;
      }
      if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
        return `${label} must be a whole number between ${min} and ${max}.`;
      }
      return undefined;
    },
  };
}

// Computed once, not on every render.
const academicYears = generateAcademicYears();

function defaultExamValues(): ExamFormValues {
  return {
    examName: "",
    customExamName: "",
    examCategory: "UNIT_TEST",
    ...DEFAULT_SCHEME_FORM,
    applicableClasses: [],
    academicYear: academicYears[0]?.value ?? "",
    examStartDate: "",
    examEndDate: "",
    sequence: "",
    status: "active",
  };
}

function isExamCategory(value: unknown): value is ExamCategory {
  return value === "UNIT_TEST" || value === "MAIN_EXAM";
}

/** Convert a saved date (Date / Timestamp / string) into "yyyy-MM-dd". */
function toDateInputValue(value: unknown): string {
  const date = toDateOrNull(value);
  if (!date) return "";

  // Use local getters (not toISOString) so the calendar day never shifts.
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Convert a <input type="date"> value ("yyyy-MM-dd") into a Date.
 * Parsed as a LOCAL date so the stored day matches what the user picked.
 */
function dateInputToDate(value: unknown): Date | null {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (match) {
      const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  // Fallback covers Date/Timestamp values and already-parsed strings.
  return toDateOrNull(value);
}

/** Convert a form value into a Firestore Timestamp (or null). */
function toTimestampOrNull(value: unknown): Timestamp | null {
  const date = dateInputToDate(value);
  return date ? Timestamp.fromDate(date) : null;
}

/** Turn a saved Firestore exam document back into editable form values. */
function examDocToForm(data: DocumentData): ExamFormValues {
  const examName = typeof data.examName === "string" ? data.examName : "";
  const customExamName =
    typeof data.customExamName === "string" ? data.customExamName : "";
  const usesPreset = (EXAM_NAME_OPTIONS as string[]).includes(examName);
  const examCategory = isExamCategory(data.examCategory)
    ? data.examCategory
    : "UNIT_TEST";

  return {
    examName: usesPreset ? examName : "Other",
    customExamName: usesPreset ? "" : examName || customExamName,
    examCategory,
    // Old documents only stored maxMarks; marksSchemeFromDoc keeps that total
    // and fills the class 1-8 split with the standard defaults.
    ...schemeToFormValues(
      marksSchemeFromDoc(
        data,
        typeof data.maxMarks === "number" ? data.maxMarks : undefined
      )
    ),
    applicableClasses: Array.isArray(data.applicableClasses)
      ? data.applicableClasses.filter(
          (cls): cls is string =>
            typeof cls === "string" && CLASSES.includes(cls)
        )
      : [],
    academicYear:
      typeof data.academicYear === "string" ? data.academicYear : "",
    // toDateOrNull handles Date, Timestamp and string values; the result is
    // formatted as "yyyy-MM-dd" because the field is a native date input.
    examStartDate: toDateInputValue(data.examStartDate),
    examEndDate: toDateInputValue(data.examEndDate),
    sequence: String(typeof data.sequence === "number" ? data.sequence : ""),
    status: data.status === "archived" ? "archived" : "active",
  };
}

function firestoreErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong while saving to Firestore.";
  }
  const lower = error.message.toLowerCase();
  if (lower.includes("permission")) {
    return "You do not have permission to save exams. Please login with an admin account.";
  }
  if (lower.includes("token") || lower.includes("session")) {
    return "Your session is invalid or expired. Please logout and login again.";
  }
  return error.message;
}

interface SequenceConflict {
  className: string;
  examName: string;
}

/**
 * Finds an already-saved exam (same academic year + overlapping class +
 * same sequence number) that would clash with what's about to be saved.
 *
 * Only the academic year is filtered in Firestore (a single-field query needs
 * no custom composite index); classes and sequence are matched in memory,
 * which is plenty fast for the small number of exams per year.
 *
 * Any query failure is treated as "no conflict" so a Firestore hiccup can
 * never stop the user from saving. Errors are logged for debugging.
 */
async function findSequenceConflicts(
  academicYear: string,
  classes: string[],
  sequence: string,
  excludeId: string | null
): Promise<SequenceConflict | null> {
  const sequenceNumber = Number(sequence);
  const isValidInput =
    academicYear.trim() !== "" &&
    classes.length > 0 &&
    Number.isInteger(sequenceNumber) &&
    sequenceNumber >= 1;

  if (!isValidInput) return null;

  try {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTION.EXAMS),
        where("academicYear", "==", academicYear.trim())
      )
    );

    for (const examDoc of snapshot.docs) {
      if (examDoc.id === excludeId) continue;

      const data = examDoc.data();
      if (data.sequence !== sequenceNumber) continue;
      if (!Array.isArray(data.applicableClasses)) continue;

      const overlappingClass = classes.find((cls) =>
        data.applicableClasses.includes(cls)
      );
      if (!overlappingClass) continue;

      return {
        className: overlappingClass,
        examName:
          typeof data.examName === "string" && data.examName
            ? data.examName
            : "another exam",
      };
    }
  } catch (error) {
    // Network/permission/index problems must not block saving.
    console.warn("Sequence conflict check failed:", error);
  }

  return null;
}

function AddExam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editExamIdFromUrl = searchParams.get("edit");

  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);
  const [checkingSequence, setCheckingSequence] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    getValues,
    watch,
    formState: { isSubmitting },
  } = useForm<ExamFormValues>({
    defaultValues: defaultExamValues(),
  });

  // Load the exam when the page opens in edit mode: /welcome/exam/add?edit=<id>
  useEffect(() => {
    if (!editExamIdFromUrl) {
      setEditingId(null);
      setLoadingExam(false);
      return;
    }

    let cancelled = false;

    const loadExamForEdit = async () => {
      setLoadingExam(true);
      try {
        const snapshot = await getDoc(
          doc(db, COLLECTION.EXAMS, editExamIdFromUrl)
        );
        if (!snapshot.exists()) {
          throw new Error("Exam document not found.");
        }
        if (cancelled) return;

        reset(examDocToForm(snapshot.data()));
        setEditingId(editExamIdFromUrl);
        setMessage("");
        setSubmitError("");
        clearErrors();
      } catch (error) {
        if (cancelled) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load the selected exam."
        );
        reset(defaultExamValues());
        setEditingId(null);
        setSearchParams({}, { replace: true });
      } finally {
        if (!cancelled) setLoadingExam(false);
      }
    };

    void loadExamForEdit();

    return () => {
      cancelled = true;
    };
  }, [editExamIdFromUrl, reset, clearErrors, setSearchParams]);

  // Watched values, used for conditional fields and the live sequence check.
  const watchExamName = watch("examName");
  const watchExamCategoryValue = watch("examCategory");
  const watchExamCategory: ExamCategory =
    watchExamCategoryValue === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
  const watchApplicableClasses = (watch("applicableClasses") ?? []) as string[];
  const watchAcademicYear = watch("academicYear") ?? "";
  const watchSequence = watch("sequence") ?? "";
  const classesKey = watchApplicableClasses.join(",");

  // Live marks-scheme preview (classes 1-8 split).
  const watchNotebookMarks = watch("notebookMarks") ?? "";
  const watchTestMarks = watch("testMarks") ?? "";
  const watchTheoryMarks = watch("theoryMarks") ?? "";
  const watchPracticalTheoryMarks = watch("practicalTheoryMarks") ?? "";
  const watchPracticalMarks = watch("practicalMarks") ?? "";

  const watchScheme: MarksScheme = {
    notebookMarks: toMarksNumber(
      watchNotebookMarks,
      DEFAULT_SCHEME.notebookMarks
    ),
    testMarks: toMarksNumber(watchTestMarks, DEFAULT_SCHEME.testMarks),
    theoryMarks: toMarksNumber(watchTheoryMarks, DEFAULT_SCHEME.theoryMarks),
    practicalTheoryMarks: toMarksNumber(
      watchPracticalTheoryMarks,
      DEFAULT_SCHEME.practicalTheoryMarks
    ),
    practicalMarks: toMarksNumber(
      watchPracticalMarks,
      DEFAULT_SCHEME.practicalMarks
    ),
  };

  const isUnitTestExam = watchExamCategory === "UNIT_TEST";
  // Science & Computer carry a practical paper only in Half Yearly / Annual
  // and only for classes 1 to 8.
  const showPracticalFields =
    !isUnitTestExam && hasSchemeClass(watchApplicableClasses);
  const watchMaxMarks = schemeMaxMarks(watchExamCategory, watchScheme);

  // Debounced check: warns the user if this sequence number is already
  // used for one of the selected classes in the same academic year.
  useEffect(() => {
    let cancelled = false;
    clearErrors("sequence");
    setCheckingSequence(false);

    const sequenceNumber = Number(watchSequence);
    const isValidInput =
      watchAcademicYear &&
      watchApplicableClasses.length > 0 &&
      Number.isInteger(sequenceNumber) &&
      sequenceNumber >= 1;

    if (!isValidInput) return;

    setCheckingSequence(true);
    const timer = setTimeout(async () => {
      try {
        const conflict = await findSequenceConflicts(
          watchAcademicYear,
          watchApplicableClasses,
          watchSequence,
          editingId
        );
        if (cancelled) return;
        if (conflict) {
          setError("sequence", {
            type: "server",
            message: `Sequence ${watchSequence} is already used for class ${conflict.className} in ${watchAcademicYear} (${conflict.examName}).`,
          });
        }
      } finally {
        if (!cancelled) setCheckingSequence(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [watchAcademicYear, classesKey, watchSequence, editingId, clearErrors, setError]);

  const handleReset = () => {
    reset(defaultExamValues());
    setEditingId(null);
    setMessage("");
    setSubmitError("");
    if (editExamIdFromUrl) {
      setSearchParams({}, { replace: true });
    }
  };

  /**
   * Restores the standard class 1-8 split (5 notebook + 25 test for Unit Tests,
   * 70 theory / 50 + 20 practical for Half Yearly & Annual) whenever the exam
   * name or category changes, so the form never starts from stale numbers.
   */
  const applySchemeDefaults = () => {
    const fields = schemeToFormValues(DEFAULT_SCHEME);
    (Object.keys(fields) as (keyof SchemeFormFields)[]).forEach((key) => {
      setValue(key, fields[key], { shouldDirty: false });
    });
  };

  const handleExamSelectChange = (value: string) => {
    const category = EXAM_NAME_CATEGORY[value];
    if (category) {
      setValue("examCategory", category, { shouldDirty: false });
      applySchemeDefaults();
    }
    if (value !== "Other") {
      setValue("customExamName", "", { shouldDirty: false });
    }
  };

  const handleCategoryChange = (value: string) => {
    const category: ExamCategory =
      value === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
    setValue("examCategory", category);
    applySchemeDefaults();
  };

  /** Notebook + Test must add up to the unit test total (30 by default). */
  const handleResetNotebookMarks = () => {
    setValue("notebookMarks", String(DEFAULT_SCHEME.notebookMarks), {
      shouldDirty: false,
    });
    setValue("testMarks", String(DEFAULT_SCHEME.testMarks), {
      shouldDirty: false,
    });
  };

  /** Science & Computer: theory + practical must add up to the theory total. */
  const handleResetPracticalMarks = () => {
    setValue("theoryMarks", String(DEFAULT_SCHEME.theoryMarks), {
      shouldDirty: false,
    });
    setValue(
      "practicalTheoryMarks",
      String(DEFAULT_SCHEME.practicalTheoryMarks),
      { shouldDirty: false }
    );
    setValue("practicalMarks", String(DEFAULT_SCHEME.practicalMarks), {
      shouldDirty: false,
    });
  };

  const handleClassesChange = (next: string[]) => {
    setValue("applicableClasses", next);
    // Ticking a class from 1 to 8 turns on the Science & Computer practical
    // papers, so fill in the standard split when none is configured yet
    // (50 theory + 20 practical for the usual 70 mark paper).
    if (
      hasSchemeClass(next) &&
      toMarksNumber(getValues("practicalMarks"), 0) < 1
    ) {
      const theory = toMarksNumber(
        getValues("theoryMarks"),
        DEFAULT_SCHEME.theoryMarks
      );
      const practical = DEFAULT_SCHEME.practicalMarks;
      setValue("practicalMarks", String(practical), { shouldDirty: false });
      setValue(
        "practicalTheoryMarks",
        String(Math.max(theory - practical, 0)),
        { shouldDirty: false }
      );
    }
  };

  const handleStatusChange = (value: string) => {
    setValue("status", value === "archived" ? "archived" : "active");
  };

  const onSubmit: SubmitHandler<ExamFormValues> = async (data) => {
    setMessage("");
    setSubmitError("");
    clearErrors("sequence");

    // Everything (including the pre-save sequence check) runs inside
    // try/catch/finally so a failure can never leave the button stuck on
    // "Saving..." and always surfaces an error message to the user.
    setCheckingSequence(true);
    try {
      // Final check right before saving (covers any race with the debounce above).
      const conflict = await findSequenceConflicts(
        data.academicYear,
        data.applicableClasses,
        data.sequence,
        editingId
      );

      if (conflict) {
        setError("sequence", {
          type: "server",
          message: `Sequence ${data.sequence} is already used for class ${conflict.className} in ${data.academicYear} (${conflict.examName}).`,
        });
        return;
      }

      const examName = (
        data.examName === "Other" ? data.customExamName : data.examName
      ).trim();

      // Keep classes sorted in the same order as the CLASSES list.
      const applicableClasses = CLASSES.filter((cls) =>
        data.applicableClasses.includes(cls)
      );

      const scheme: MarksScheme = {
        notebookMarks: toMarksNumber(
          data.notebookMarks,
          DEFAULT_SCHEME.notebookMarks
        ),
        testMarks: toMarksNumber(data.testMarks, DEFAULT_SCHEME.testMarks),
        theoryMarks: toMarksNumber(data.theoryMarks, DEFAULT_SCHEME.theoryMarks),
        practicalTheoryMarks: toMarksNumber(
          data.practicalTheoryMarks,
          DEFAULT_SCHEME.practicalTheoryMarks
        ),
        practicalMarks: toMarksNumber(
          data.practicalMarks,
          DEFAULT_SCHEME.practicalMarks
        ),
      };

      // The Science & Computer practical paper exists only in Half Yearly /
      // Annual and only for classes 1 to 8. Everything else keeps plain theory.
      const hasPracticalPaper =
        data.examCategory === "MAIN_EXAM" &&
        hasSchemeClass(applicableClasses) &&
        scheme.practicalMarks > 0;

      const examFields = {
        examName,
        examCategory: data.examCategory,
        // Total marks stay 30 (notebook + test) or 70 (theory / 50 + 20).
        maxMarks: schemeMaxMarks(data.examCategory, scheme),
        notebookMarks: scheme.notebookMarks,
        testMarks: scheme.testMarks,
        theoryMarks: scheme.theoryMarks,
        practicalTheoryMarks: hasPracticalPaper
          ? scheme.practicalTheoryMarks
          : 0,
        practicalMarks: hasPracticalPaper ? scheme.practicalMarks : 0,
        practicalSubjects: hasPracticalPaper ? PRACTICAL_SUBJECTS : [],
        practicalClasses: hasPracticalPaper ? SCHEME_CLASSES : [],
        applicableClasses,
        academicYear: data.academicYear.trim(),
        examStartDate: toTimestampOrNull(data.examStartDate),
        examEndDate: toTimestampOrNull(data.examEndDate),
        sequence: Number(data.sequence),
        status: data.status,
      };

      const successMessage = editingId
        ? `Exam "${examName}" updated successfully.`
        : `Exam "${examName}" added successfully.`;

      if (editingId) {
        await updateDoc(doc(db, COLLECTION.EXAMS, editingId), {
          ...examFields,
          updatedAt: serverTimestamp(),
        });
        setEditingId(null);
        setSearchParams({}, { replace: true });
      } else {
        await addDoc(collection(db, COLLECTION.EXAMS), {
          ...examFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      reset(defaultExamValues());
      clearErrors();
      setMessage(successMessage);
      toast.success(successMessage);
      setTimeout(() => setMessage(""), 6000);
    } catch (error) {
      console.error("Failed to save exam:", error);
      setSubmitError(firestoreErrorMessage(error));
    } finally {
      setCheckingSequence(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            {editingId ? "Edit Exam" : "Add Exam"}
          </h2>
          <p className="text-gray-600 mt-1">
            Define exam templates for classes and academic years. Student marks
            are entered later on the Marks Entry page.
          </p>
          <p className="text-xs font-semibold text-amber-700 mt-1">
            Classes 1 to 8: {marksSchemeSummary(watchExamCategory, watchScheme)}
          </p>
        </div>
        <NavLink
          to="/welcome/exam/list"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
        >
          View Exam List
        </NavLink>
      </div>

      {editingId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
          Editing mode: changes will update the selected exam record.
        </div>
      )}

      {message && (
        <FormMessage type="success">
          {message}{" "}
          <NavLink to="/welcome/exam/list" className="underline">
            View Exam List
          </NavLink>
        </FormMessage>
      )}
      {submitError && <FormMessage type="error">{submitError}</FormMessage>}

      {loadingExam ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-10">
          <Loader label="Loading exam data..." fullScreen={false} />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6"
        >
          {/* Exam name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              control={control}
              name="examName"
              label="Exam Name"
              required
              placeholder="Select exam name"
              options={EXAM_NAME_OPTIONS}
              rules={{ required: "Please select an exam name." }}
              wrapperClassName="sm:col-span-2"
              onChange={(event) => handleExamSelectChange(event.target.value)}
            />

            {watchExamName === "Other" && (
              <CustomInput
                control={control}
                name="customExamName"
                label="Custom Exam Name"
                required
                placeholder="e.g. Pre-Board Examination"
                maxLength={80}
                wrapperClassName="sm:col-span-2"
                rules={{
                  required: "Custom exam name is required.",
                  minLength: {
                    value: 2,
                    message: "Exam name must be at least 2 characters long.",
                  },
                }}
              />
            )}
          </div>

          {/* Category, year, dates, sequence, status */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {watchExamName === "Other" ? (
                <CustomRadioGroup
                  control={control}
                  name="examCategory"
                  label="Exam Category"
                  options={[
                    {
                      value: "UNIT_TEST",
                      label: "Unit Test",
                      hint: `notebook ${DEFAULT_SCHEME.notebookMarks} + test ${DEFAULT_SCHEME.testMarks}`,
                    },
                    {
                      value: "MAIN_EXAM",
                      label: "Main Exam",
                      hint: `theory ${DEFAULT_SCHEME.theoryMarks} (Science & Computer ${DEFAULT_SCHEME.practicalTheoryMarks} + ${DEFAULT_SCHEME.practicalMarks} practical)`,
                    },
                  ]}
                  onChange={handleCategoryChange}
                />
              ) : (
                <>
                  <span className="block text-sm font-semibold text-gray-700 mb-1">
                    Exam Category
                  </span>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <span className="font-semibold">
                      {CATEGORY_LABEL[watchExamCategory]}
                    </span>
                    <span className="text-gray-500">
                      {" "}— marks split is set in the Marks Scheme section below
                    </span>
                  </div>
                </>
              )}
            </div>

            <CustomSelect
              control={control}
              name="academicYear"
              label="Academic Year"
              required
              placeholder="Select academic year"
              options={academicYears.map((year) => ({
                value: year.value,
                label: year.label,
              }))}
              rules={{ required: "Academic year is required." }}
            />

            <CustomInput
              control={control}
              name="examStartDate"
              label="Exam Start Date"
              type="date"
              required
              rules={{ required: "Exam start date is required." }}
            />

            <CustomInput
              control={control}
              name="examEndDate"
              label="Exam End Date"
              type="date"
              required
              rules={{
                required: "Exam end date is required.",
                validate: (value: string | Date | string[] | null) => {
                  const start = dateInputToDate(getValues("examStartDate"));
                  const end = dateInputToDate(value);
                  if (!start || !end) return undefined;
                  return end < start
                    ? "Exam end date cannot be before the start date."
                    : undefined;
                },
              }}
            />

            <div>
              <CustomInput
                control={control}
                name="sequence"
                label="Sequence"
                type="number"
                min={1}
                required
                placeholder="e.g. 1"
                rules={{
                  required: "Sequence is required.",
                  pattern: {
                    value: /^[1-9]\d*$/,
                    message: "Sequence must be a positive whole number (min 1).",
                  },
                }}
              />
              <p className="mt-1 text-xs text-gray-500">
                Determines column order in report cards. Must be unique per
                class &amp; academic year.
              </p>
              {checkingSequence && (
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Checking sequence availability...
                </p>
              )}
            </div>

            <CustomToggle
              control={control}
              name="status"
              label="Status"
              onChange={handleStatusChange}
            />
          </div>

          {/* Applicable classes */}
          <CustomCheckboxGroup
            control={control}
            name="applicableClasses"
            label="Applicable Classes"
            options={CLASSES.map((cls) => ({
              label: toOrdinalLabel(cls),
              value: cls,
            }))}
            required
            rules={{ required: "Select at least one applicable class." }}
            onChange={handleClassesChange}
            className="mt-4"
          />

          {/* Marks scheme - classes 1 to 8 */}
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Marks Scheme (Classes 1 to 8)
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {isUnitTestExam
                    ? "Notebook marks and written test marks are added together to make the unit test total."
                    : `All subjects carry theory marks; ${PRACTICAL_SUBJECTS.join(
                        " & "
                      )} also carry a practical paper.`}
                </p>
              </div>
              <span className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-800">
                Maximum Marks: {watchMaxMarks}
              </span>
            </div>

            {isUnitTestExam ? (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomInput
                  control={control}
                  name="notebookMarks"
                  label="Notebook Marks"
                  type="number"
                  min={0}
                  required
                  placeholder={`e.g. ${DEFAULT_SCHEME.notebookMarks}`}
                  rules={wholeNumberRule("Notebook marks", 0, 30)}
                />
                <CustomInput
                  control={control}
                  name="testMarks"
                  label="Written Test Marks"
                  type="number"
                  min={1}
                  required
                  placeholder={`e.g. ${DEFAULT_SCHEME.testMarks}`}
                  rules={wholeNumberRule("Written test marks", 1, 100)}
                />
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-gray-700">
                  <span>
                    Notebook <b>{watchScheme.notebookMarks}</b> + Written Test{" "}
                    <b>{watchScheme.testMarks}</b> = <b>{watchMaxMarks}</b> marks
                    per subject (Unit Test 1 &amp; 2, classes 1 to 8).
                  </span>
                  <button
                    type="button"
                    onClick={handleResetNotebookMarks}
                    className="rounded border border-amber-300 px-2 py-1 font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Reset to {DEFAULT_SCHEME.notebookMarks} +{" "}
                    {DEFAULT_SCHEME.testMarks}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomInput
                  control={control}
                  name="theoryMarks"
                  label="Theory Marks (all other subjects)"
                  type="number"
                  min={1}
                  required
                  placeholder={`e.g. ${DEFAULT_SCHEME.theoryMarks}`}
                  rules={wholeNumberRule("Theory marks", 1, 200)}
                />
                {showPracticalFields ? (
                  <>
                    <CustomInput
                      control={control}
                      name="practicalTheoryMarks"
                      label={`Theory Marks (${PRACTICAL_SUBJECTS.join(" & ")})`}
                      type="number"
                      min={0}
                      required
                      placeholder={`e.g. ${DEFAULT_SCHEME.practicalTheoryMarks}`}
                      rules={wholeNumberRule(
                        `Theory marks (${PRACTICAL_SUBJECTS.join(" & ")})`,
                        0,
                        200
                      )}
                    />
                    <CustomInput
                      control={control}
                      name="practicalMarks"
                      label={`Practical Marks (${PRACTICAL_SUBJECTS.join(" & ")})`}
                      type="number"
                      min={1}
                      required
                      placeholder={`e.g. ${DEFAULT_SCHEME.practicalMarks}`}
                      rules={{
                        ...wholeNumberRule("Practical marks", 1, 100),
                        validate: (
                          value: string | Date | string[] | null
                        ) => {
                          const numeric = toMarksNumber(value, 0);
                          if (!Number.isInteger(numeric) || numeric < 1) {
                            return "Practical marks must be a whole number of at least 1.";
                          }
                          const theory = toMarksNumber(
                            getValues("theoryMarks"),
                            0
                          );
                          const practicalTheory = toMarksNumber(
                            getValues("practicalTheoryMarks"),
                            0
                          );
                          return practicalTheory + numeric === theory
                            ? undefined
                            : `For ${PRACTICAL_SUBJECTS.join(
                                " & "
                              )} theory + practical must add up to ${theory} (currently ${practicalTheory} + ${numeric}).`;
                        },
                      }}
                    />
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-gray-700">
                      <span>
                        {PRACTICAL_SUBJECTS.join(" & ")}:{" "}
                        <b>{watchScheme.practicalTheoryMarks}</b> theory +{" "}
                        <b>{watchScheme.practicalMarks}</b> practical ={" "}
                        <b>
                          {watchScheme.practicalTheoryMarks +
                            watchScheme.practicalMarks}
                        </b>{" "}
                        | all other subjects: <b>{watchScheme.theoryMarks}</b>{" "}
                        theory. A Practical column (NA for other subjects) is
                        added to the result and admit card.
                      </span>
                      <button
                        type="button"
                        onClick={handleResetPracticalMarks}
                        className="rounded border border-amber-300 px-2 py-1 font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Reset to {DEFAULT_SCHEME.theoryMarks} /{" "}
                        {DEFAULT_SCHEME.practicalTheoryMarks} +{" "}
                        {DEFAULT_SCHEME.practicalMarks}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-gray-600">
                    The practical paper applies to{" "}
                    {PRACTICAL_SUBJECTS.join(" & ")} only, and only for classes
                    1 to 8. Tick any class from 1st to 8th above to configure the
                    theory + practical split.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <CustomButton
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || checkingSequence}
            >
              {isSubmitting || checkingSequence
                ? "Saving..."
                : editingId
                  ? "Update Exam"
                  : "Save Exam"}
            </CustomButton>
            <CustomButton
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting || checkingSequence}
            >
              Reset Form
            </CustomButton>
            <NavLink
              to="/welcome/exam/list"
              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-md px-6 py-2.5 transition-colors text-center"
            >
              Exam List
            </NavLink>
          </div>
        </form>
      )}
    </div>
  );
}

export default AddExam;