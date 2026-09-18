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
import { COLLECTION, EXAM_CLASSES } from "../../../constants";
import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";

type ExamCategory = "UNIT_TEST" | "MAIN_EXAM";
type ExamStatus = "active" | "archived";

interface ExamFormValues {
  examName: string;
  customExamName: string;
  examCategory: ExamCategory;
  maxMarks: string;
  applicableClasses: string[];
  academicYear: string;
  examDate: string;
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

/** Category inferred for each preset exam name (kept flexible: "Other" is manual). */
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

const CATEGORY_DEFAULT_MARKS: Record<ExamCategory, number> = {
  UNIT_TEST: 30,
  MAIN_EXAM: 70,
};

// Kept local to avoid re-computing on every render; the list only grows over time.
const academicYears = generateAcademicYears();

function defaultExamValues(): ExamFormValues {
  return {
    examName: "",
    customExamName: "",
    examCategory: "UNIT_TEST",
    maxMarks: String(CATEGORY_DEFAULT_MARKS["UNIT_TEST"]),
    applicableClasses: [],
    academicYear: academicYears[0]?.value ?? "",
    examDate: "",
    sequence: "",
    status: "active",
  };
}

function isExamCategory(value: unknown): value is ExamCategory {
  return value === "UNIT_TEST" || value === "MAIN_EXAM";
}

/** Map a Firestore exam document back into editable form values. */
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
    maxMarks: String(
      typeof data.maxMarks === "number"
        ? data.maxMarks
        : CATEGORY_DEFAULT_MARKS[examCategory]
    ),
    applicableClasses: Array.isArray(data.applicableClasses)
      ? data.applicableClasses.filter(
          (cls): cls is string =>
            typeof cls === "string" && EXAM_CLASSES.includes(cls)
        )
      : [],
    academicYear:
      typeof data.academicYear === "string" ? data.academicYear : "",
    examDate: typeof data.examDate === "string" ? data.examDate : "",
    sequence: String(typeof data.sequence === "number" ? data.sequence : ""),
    status: data.status === "archived" ? "archived" : "active",
  };
}

function firestoreErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    const lower = message.toLowerCase();
    if (lower.includes("permission")) {
      return "You do not have permission to save exams. Please login with an admin account.";
    }
    if (lower.includes("token") || lower.includes("session")) {
      return "Your session is invalid or expired. Please logout and login again.";
    }
    return message;
  }
  return "Something went wrong while saving to Firestore.";
}

interface SequenceConflict {
  className: string;
  examName: string;
}

// Firestore's array-contains-any accepts at most 10 values per query.
const MAX_ARRAY_CONTAIN_ANY_VALUES = 10;

/**
 * Returns the first class + exam that would collide when saving this exam,
 * i.e. an existing exam for the same academic year whose applicableClasses
 * overlap the selected classes and that already uses the same sequence.
 */
async function findSequenceConflicts(
  academicYear: string,
  classes: string[],
  sequence: string,
  excludeId: string | null
): Promise<SequenceConflict | null> {
  const sequenceNumber = Number(sequence);
  if (
    !academicYear ||
    classes.length === 0 ||
    !Number.isInteger(sequenceNumber) ||
    sequenceNumber < 1
  ) {
    return null;
  }

  for (
    let start = 0;
    start < classes.length;
    start += MAX_ARRAY_CONTAIN_ANY_VALUES
  ) {
    const chunk = classes.slice(start, start + MAX_ARRAY_CONTAIN_ANY_VALUES);
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTION.EXAMS),
        where("academicYear", "==", academicYear),
        where("applicableClasses", "array-contains-any", chunk)
      )
    );

    for (const documentSnapshot of snapshot.docs) {
      if (documentSnapshot.id === excludeId) continue;
      const data = documentSnapshot.data();
      if (data.sequence !== sequenceNumber) continue;
      const overlappingClass = chunk.find(
        (cls) =>
          Array.isArray(data.applicableClasses) &&
          data.applicableClasses.includes(cls)
      );
      if (overlappingClass) {
        return {
          className: overlappingClass,
          examName:
            typeof data.examName === "string" && data.examName
              ? data.examName
              : "another exam",
        };
      }
    }
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
    watch,
    formState: { isSubmitting },
  } = useForm<ExamFormValues>({
    defaultValues: defaultExamValues(),
  });

  // Load the exam document when opened in edit mode (/welcome/exam/add?edit=<id>).
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

  // Watched values used by conditional rendering + the live sequence check.
  const watchExamName = watch("examName");
  const watchExamCategoryValue = watch("examCategory");
  const watchExamCategory: ExamCategory =
    watchExamCategoryValue === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
  const watchApplicableClasses = (watch("applicableClasses") ?? []) as string[];
  const watchAcademicYear = watch("academicYear") ?? "";
  const watchSequence = watch("sequence") ?? "";

  const classesKey = watchApplicableClasses.join(",");

  // Debounced live check for sequence clashes (inline RHF error naming class + sequence).
  useEffect(() => {
    let cancelled = false;
    clearErrors("sequence");
    setCheckingSequence(false);

    const sequenceNumber = Number(watchSequence);
    if (
      !watchAcademicYear ||
      watchApplicableClasses.length === 0 ||
      !Number.isInteger(sequenceNumber) ||
      sequenceNumber < 1
    ) {
      return;
    }

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

  const handleExamSelectChange = (value: string) => {
    const category = EXAM_NAME_CATEGORY[value];
    if (category) {
      setValue("examCategory", category, { shouldDirty: false });
      setValue("maxMarks", String(CATEGORY_DEFAULT_MARKS[category]), {
        shouldDirty: false,
      });
    }
    if (value !== "Other") {
      setValue("customExamName", "", { shouldDirty: false });
    }
  };

  const handleCategoryChange = (value: string) => {
    const category: ExamCategory = value === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
    setValue("examCategory", category);
    setValue("maxMarks", String(CATEGORY_DEFAULT_MARKS[category]), {
      shouldDirty: false,
    });
  };

  const handleClassesChange = (next: string[]) => {
    setValue("applicableClasses", next);
  };

  const handleStatusChange = (value: string) => {
    setValue("status", value === "archived" ? "archived" : "active");
  };

  const onSubmit: SubmitHandler<ExamFormValues> = async (data) => {
    clearErrors("sequence");

    // Authoritative check before saving (also covers the pre-submit debounce).
    setCheckingSequence(true);
    const conflict = await findSequenceConflicts(
      data.academicYear,
      data.applicableClasses,
      data.sequence,
      editingId
    );
    setCheckingSequence(false);
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

    // Store classes in the canonical EXAM_CLASSES order.
    const applicableClasses = EXAM_CLASSES.filter((cls) =>
      data.applicableClasses.includes(cls)
    );

    const examFields = {
      examName,
      examCategory: data.examCategory,
      maxMarks: Number(data.maxMarks),
      applicableClasses,
      academicYear: data.academicYear.trim(),
      examDate: data.examDate.trim(),
      sequence: Number(data.sequence),
      status: data.status,
    };

    setMessage("");
    setSubmitError("");
    try {
      if (editingId) {
        await updateDoc(doc(db, COLLECTION.EXAMS, editingId), {
          ...examFields,
          updatedAt: serverTimestamp(),
        });
        setEditingId(null);
        setSearchParams({}, { replace: true });
        setMessage(`Exam "${examName}" updated successfully.`);
      } else {
        await addDoc(collection(db, COLLECTION.EXAMS), {
          ...examFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setMessage(`Exam "${examName}" added successfully.`);
      }
      reset(defaultExamValues());
      clearErrors();
      setTimeout(() => setMessage(""), 6000);
    } catch (error) {
      console.error("Failed to save exam:", error);
      setSubmitError(firestoreErrorMessage(error));
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
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Loading exam data...
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

          {/* Category, marks, year, date, sequence, status */}
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
                      hint: `default ${CATEGORY_DEFAULT_MARKS["UNIT_TEST"]} marks`,
                    },
                    {
                      value: "MAIN_EXAM",
                      label: "Main Exam",
                      hint: `default ${CATEGORY_DEFAULT_MARKS["MAIN_EXAM"]} marks`,
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
                      {" "}— default max marks{" "}
                      {CATEGORY_DEFAULT_MARKS[watchExamCategory]} (editable below)
                    </span>
                  </div>
                </>
              )}
            </div>

            <CustomInput
              control={control}
              name="maxMarks"
              label="Maximum Marks"
              type="number"
              min={1}
              required
              placeholder="e.g. 30"
              rules={{
                required: "Maximum marks is required.",
                validate: (value: string | string[]) => {
                  const textValue = typeof value === "string" ? value : "" ;
                  const numeric = Number(textValue);
                  return textValue.trim() !== "" &&
                    Number.isFinite(numeric) &&
                    numeric >= 1
                    ? undefined
                    : "Maximum marks must be a positive number of at least 1.";
                },
              }}
            />

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
              name="examDate"
              label="Exam Date (optional)"
              type="date"
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
            options={EXAM_CLASSES}
            required
            rules={{ required: "Select at least one applicable class." }}
            onChange={handleClassesChange}
            className="mt-4"
          />

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