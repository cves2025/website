import { useEffect, useMemo, useState } from "react";
import {
  doc,
  DocumentData,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  SubmitHandler,
  useController,
  useForm,
} from "react-hook-form";
import toast from "react-hot-toast";
import { FaEdit, FaTrash } from "react-icons/fa";

import { API_BASE_URL, authHeaders } from "../../context/api";
import {
  CLASSES,
  CLASS_OPTIONS,
  COLLECTION,
  EMAIL_PATTERN,
  GENDER_OPTIONS,
  TEACHER_DESIGNATIONS,
  TEACHER_STATUS,
} from "../../../constants";
import Button from "../../../custom-components/Button";
import CustomButton from "../../../custom-components/CustomButton";
import CustomInput from "../../../custom-components/CustomInput";
import CustomSelect from "../../../custom-components/CustomSelect";
import CustomTextarea from "../../../custom-components/CustomTextarea";
import DatePicker, { INVALID_DATE } from "../../../custom-components/DatePicker";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import { Switch } from "@/components/ui/switch";
import FormMessage from "../../../custom-components/FormMessage";
import Modal from "../../../custom-components/Modal";
import PageHeader from "../../../custom-components/PageHeader";
import PhotoUploadBox from "../../../custom-components/admission/PhotoUploadBox";
import SearchableMultiSelect, {
  SearchableOption,
} from "../../../custom-components/SearchableMultiSelect";
import { db } from "../../../firebase/config";
import { uploadTeacherPhoto } from "../../../firebase/teacherPhotos";
import { useClassSubjects } from "../../../hooks/useClassSubjects";
import { useTeachers } from "../../../hooks/useTeachers";
import type {
  TeacherFormValues,
  TeacherRecord,
  TeacherSectionAssignment,
  TeacherSubjectOption,
} from "../../../utils/type";
import { toDateOrNull } from "../../../utils/toDateOrNull";
import {
  INDIAN_MOBILE_PATTERN,
  assignmentOwners,
  classTeacherKey,
  emailConflict,
  findAssignmentConflict,
  subjectAssignmentKey,
  type AssignmentOwners,
  employeeIdConflict,
  loadUserIdentities,
  nextEmployeeId,
  normalizeEmail,
  normalizeEmployeeId,
  toMobileDigits,
  type UserIdentity,
} from "../../../utils/teacherIdentity";
import {
  TEACHER_SECTIONS,
  createEmptySectionAssignment,
  createEmptySectionAssignments,
  formatSectionSummary,
  mergeClassSubjects,
  pruneSectionAssignments,
  toClassLabel,
  toEditableSectionAssignments,
  toLegacyTeacherFields,
  toSectionTabs,
} from "../../../utils/teacherSections";

const CLASS_CHOICES: SearchableOption[] = CLASSES.map((className) => ({
  value: className,
  label: toClassLabel(className),
}));

/** A Subject Teacher only teaches subjects; only a Class Teacher can be a class teacher. */
const SUBJECT_TEACHER = "Subject Teacher";

const EMPTY_TEACHER: TeacherFormValues = {
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: null,
  employeeId: "",
  designation: "",
  status: "Active",
  email: "",
  phone: "",
  joiningDate: null,
  address: "",
  photo: "",
  qualification: "",
  sectionAssignments: createEmptySectionAssignments(),
  assignedClasses: [],
  isClassTeacher: false,
  classTeacherOf: "",
  password: "",
  role: "teacher",
};

function teacherDocToForm(
  data: DocumentData,
  sectionAssignments: TeacherSectionAssignment[]
): TeacherFormValues {
  const stringField = (key: string) =>
    typeof data[key] === "string" ? data[key] : "";

  return {
    firstName: stringField("firstName"),
    lastName: stringField("lastName"),
    gender: stringField("gender"),
    dateOfBirth: toDateOrNull(data.dateOfBirth),
    employeeId: stringField("employeeId"),
    designation: stringField("designation"),
    status: stringField("status") || "Active",
    email: stringField("email"),
    phone: toMobileDigits(stringField("phone")),
    joiningDate: toDateOrNull(data.joiningDate),
    address: stringField("address"),
    photo: stringField("photo"),
    qualification: stringField("qualification"),
    sectionAssignments,
    assignedClasses: [],
    isClassTeacher: false,
    classTeacherOf: "",
    password: "",
    role: stringField("role") || "teacher",
  };
}

/** Subjects of a class; ones another teacher holds in this section are locked. */
function toSubjectChoices(
  subjects: TeacherSubjectOption[],
  selected: string[],
  ownerOf: (subject: string) => string | undefined
): SearchableOption[] {
  const choices: SearchableOption[] = subjects.map((subject) => {
    const owner = ownerOf(subject.name);
    const isSelected = selected.includes(subject.name);
    return {
      value: subject.name,
      label: subject.name,
      hint: owner
        ? isSelected
          ? `Also with ${owner}`
          : `Assigned to ${owner}`
        : subject.type,
      // A selected one stays clickable so it can still be removed.
      disabled: Boolean(owner) && !isSelected,
    };
  });

  selected.forEach((name) => {
    if (choices.some((choice) => choice.value === name)) return;
    choices.push({ value: name, label: name, hint: "Saved earlier" });
  });

  return choices;
}

function toDateInputValue(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateValue(value: string): Date | null {
  // Typed text that is not a date yet: kept as an Invalid Date so the
  // field shows an error instead of silently dropping it.
  if (value === INVALID_DATE) return new Date(Number.NaN);
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

const isInvalidDate = (value: unknown) =>
  value instanceof Date && Number.isNaN(value.getTime());

interface DateInputProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  required?: boolean;
  /** Earliest / latest allowed date, "yyyy-MM-dd". */
  min?: string;
  max?: string;
  wrapperClassName?: string;
}

/** shadcn calendar with month / year dropdowns, or type DD/MM/YYYY. */
function DateInput<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  required = false,
  min,
  max,
  wrapperClassName = "",
}: DateInputProps<T>) {
  const { field, fieldState } = useController<T, FieldPath<T>>({
    control,
    name,
    rules: {
      validate: (value: unknown) =>
        isInvalidDate(value)
          ? "Enter a valid date as DD/MM/YYYY."
          : !required || value instanceof Date || `${label ?? "Date"} is required.`,
    },
  });

  const value = field.value as Date | null;
  const current = isInvalidDate(value)
    ? INVALID_DATE
    : value instanceof Date
      ? toDateInputValue(value)
      : "";

  return (
    <div className={`flex w-full flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-semibold text-gray-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <DatePicker
        id={name}
        typeable
        yearDropdown
        value={current}
        min={min}
        max={max}
        onChange={(next) => field.onChange(toDateValue(next))}
        onBlur={field.onBlur}
        aria-invalid={Boolean(fieldState.error)}
      />
      {fieldState.error ? (
        <p className="text-xs font-medium text-red-600">
          {fieldState.error.message}
        </p>
      ) : (
        <p className="text-xs text-gray-500">Type DD/MM/YYYY or pick from the calendar.</p>
      )}
    </div>
  );
}

/** "yyyy-MM-dd" of today moved by whole years (date limits of the pickers). */
function yearsFromToday(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return toDateInputValue(date);
}

interface SectionAssignmentCardProps {
  section: string;
  assignment: TeacherSectionAssignment;
  subjectsOfClass: (className: string) => TeacherSubjectOption[];
  loadingSubjects: boolean;
  /** Class / subject assignments of the other teachers. */
  owners: AssignmentOwners;
  /** False for a Subject Teacher. */
  canBeClassTeacher: boolean;
  onToggleClassTeacher: (active: boolean) => void;
  onClassTeacherClassChange: (className: string) => void;
  onClassesChange: (classNames: string[]) => void;
  onClassSubjectsChange: (className: string, subjects: string[]) => void;
  onReset: () => void;
}

function SectionAssignmentCard({
  section,
  assignment,
  subjectsOfClass,
  loadingSubjects,
  owners,
  canBeClassTeacher,
  onToggleClassTeacher,
  onClassTeacherClassChange,
  onClassesChange,
  onClassSubjectsChange,
  onReset,
}: SectionAssignmentCardProps) {
  const selectedClasses = assignment.classes.map((entry) => entry.className);
  const subjectOwner = (className: string, subject: string) =>
    owners.subject.get(subjectAssignmentKey(section, className, subject));

  // A class already taken by another class teacher of this section is locked.
  const classTeacherChoices = CLASS_OPTIONS.map((option) => {
    const owner = owners.classTeacher.get(classTeacherKey(section, option.value));
    return owner && option.value !== assignment.classTeacherOf
      ? { ...option, label: `${option.label} - ${owner}`, disabled: true }
      : option;
  });
  const classTeacherOwner = assignment.classTeacherOf
    ? owners.classTeacher.get(classTeacherKey(section, assignment.classTeacherOf))
    : undefined;

  // Classes whose every subject is taken in this section are only marked.
  const classChoices = CLASS_CHOICES.map((option) => {
    const subjects = subjectsOfClass(option.value);
    const allTaken =
      subjects.length > 0 &&
      subjects.every((subject) => subjectOwner(option.value, subject.name));
    return allTaken ? { ...option, hint: "All subjects assigned" } : option;
  });
  const teachingCount = assignment.classes.reduce(
    (total, entry) => total + entry.subjects.length,
    0
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
            Section {section}
          </span>
          <span className="text-xs font-semibold text-gray-600">
            {formatSectionSummary(assignment)}
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-100"
        >
          Clear section
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex w-full flex-col gap-1.5">
          <span className="block text-sm font-semibold text-gray-700">
            Class Teacher of Section {section}
          </span>
          <div className="flex items-center gap-3 py-2">
            <Switch
              checked={assignment.isClassTeacher}
              onCheckedChange={onToggleClassTeacher}
              // Turning it off is always allowed.
              disabled={!canBeClassTeacher && !assignment.isClassTeacher}
              aria-label={`Class Teacher of Section ${section}`}
            />
            <span
              className={`text-sm font-semibold ${
                assignment.isClassTeacher ? "text-green-700" : "text-gray-600"
              }`}
            >
              {assignment.isClassTeacher ? "Yes" : "No"}
            </span>
          </div>
          {!canBeClassTeacher && (
            <p
              className={`text-xs font-medium ${
                assignment.isClassTeacher ? "text-red-600" : "text-gray-500"
              }`}
            >
              {assignment.isClassTeacher
                ? "A Subject Teacher cannot be a class teacher. Turn this off or change the designation."
                : "Only a Class Teacher can be the class teacher of a class."}
            </p>
          )}
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <label
            htmlFor={`section-${section}-class-teacher-class`}
            className="block text-sm font-semibold text-gray-700"
          >
            Class
            {assignment.isClassTeacher && (
              <span className="ml-0.5 text-red-500">*</span>
            )}
          </label>
          <SelectDropdown
            id={`section-${section}-class-teacher-class`}
            value={assignment.classTeacherOf}
            disabled={!assignment.isClassTeacher}
            onValueChange={onClassTeacherClassChange}
            placeholder="Select class"
            options={classTeacherChoices}
            aria-invalid={Boolean(classTeacherOwner)}
          />
          {classTeacherOwner && (
            <p className="text-xs font-medium text-red-600">
              {classTeacherOwner} is already the class teacher of this class.
            </p>
          )}
        </div>

        <SearchableMultiSelect
          id={`section-${section}-classes`}
          options={classChoices}
          values={selectedClasses}
          onChange={onClassesChange}
          label={`Classes Taught in Section ${section}`}
          placeholder="Select classes"
          searchPlaceholder="Type to search classes..."
          emptyMessage="No matching class found"
          helpText={`Select every class this teacher handles in Section ${section}, then pick the subjects for each class below.`}
          maxChips={5}
          wrapperClassName="sm:col-span-2"
        />
      </div>

      {assignment.classes.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-xs font-semibold text-gray-500">
          No class selected for Section {section} yet.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-500">
            {assignment.classes.length} class(es) · {teachingCount} subject
            {teachingCount === 1 ? "" : "s"} assigned in Section {section}
          </p>
          {assignment.classes.map((entry) => (
            <div
              key={entry.className}
              className="rounded-md border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                  {toClassLabel(entry.className)}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    entry.subjects.length > 0
                      ? "text-gray-500"
                      : "text-amber-600"
                  }`}
                >
                  {entry.subjects.length > 0
                    ? `${entry.subjects.length} subject(s) selected`
                    : "No subject selected"}
                </span>
              </div>
              <div className="mt-2">
                <SearchableMultiSelect
                  id={`section-${section}-class-${entry.className}-subjects`}
                  options={toSubjectChoices(
                    subjectsOfClass(entry.className),
                    entry.subjects,
                    (subject) => subjectOwner(entry.className, subject)
                  )}
                  values={entry.subjects}
                  onChange={(values) =>
                    onClassSubjectsChange(entry.className, values)
                  }
                  placeholder="Select subjects"
                  searchPlaceholder="Type to search subjects..."
                  emptyMessage={`No subject added for ${toClassLabel(
                    entry.className
                  )} yet`}
                  loading={loadingSubjects}
                  loadingLabel="Loading subjects..."
                  maxChips={4}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function firestoreErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong while saving. Please try again.";
  }
  const lower = error.message.toLowerCase();
  if (lower.includes("permission") || lower.includes("forbidden")) {
    return "You do not have permission to save teachers. Please login with an admin account.";
  }
  if (lower.includes("token") || lower.includes("session")) {
    return "Your session is invalid or expired. Please logout and login again.";
  }
  return error.message;
}

interface TeacherFormProps {
  initialEditId: string | null;
  onClose: () => void;
}

function TeacherForm({ initialEditId, onClose }: TeacherFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty },
    setError,
    getValues,
  } = useForm<TeacherFormValues>({
    defaultValues: EMPTY_TEACHER,
    // Duplicate employee ID / email are checked as soon as a field is left.
    mode: "onTouched",
  });

  const photoUrl = watch("photo");
  const [activeSection, setActiveSection] = useState(TEACHER_SECTIONS[0]);
  const [sectionAssignments, setSectionAssignments] = useState<
    TeacherSectionAssignment[]
  >(createEmptySectionAssignments());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [movedFromLegacy, setMovedFromLegacy] = useState(false);
  const { subjectsOfClass, loadingSubjects } = useClassSubjects();

  useEffect(() => {
    let cancelled = false;
    loadUserIdentities()
      .then((users) => {
        if (cancelled) return;
        setIdentities(users);
        // A new teacher gets the next free employee ID (still editable).
        if (!initialEditId && getValues("employeeId") === "") {
          setValue("employeeId", nextEmployeeId(users));
        }
      })
      .catch((loadError) => {
        console.error("Failed to load teacher IDs:", loadError);
      });
    return () => {
      cancelled = true;
    };
  }, [initialEditId]);

  // Every user (deleted too) for the employee ID / email / assignment checks.
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
  const isFormDirty = isDirty || photoFile !== null || photoRemoved;
  const canBeClassTeacher = watch("designation") !== SUBJECT_TEACHER;
  const owners = useMemo(
    () => assignmentOwners(identities ?? [], initialEditId),
    [identities, initialEditId]
  );

  const activeAssignment =
    sectionAssignments.find((item) => item.section === activeSection) ??
    createEmptySectionAssignment(activeSection);

  useEffect(() => {
    if (!initialEditId) return;
    let cancelled = false;

    const loadTeacher = async () => {
      try {
        const snapshot = await getDoc(
          doc(db, COLLECTION.USERS, initialEditId)
        );
        if (!snapshot.exists()) {
          throw new Error("Teacher record not found.");
        }
        if (cancelled) return;
        const data = snapshot.data();
        const restored = toEditableSectionAssignments(data);
        reset(teacherDocToForm(data, restored.assignments));
        setSectionAssignments(restored.assignments);
        setMovedFromLegacy(restored.movedFromLegacy);
      } catch (loadError) {
        if (cancelled) return;
        console.error("Failed to load teacher:", loadError);
        toast.error(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load the selected teacher."
        );
      }
    };

    void loadTeacher();

    return () => {
      cancelled = true;
    };
  }, [initialEditId]);

  const assignmentOf = (section: string): TeacherSectionAssignment =>
    sectionAssignments.find((item) => item.section === section) ??
    createEmptySectionAssignment(section);

  const applySections = (next: TeacherSectionAssignment[]) => {
    setSectionAssignments(next);
    setValue("sectionAssignments", next, { shouldDirty: true });
  };

  const updateSection = (
    section: string,
    patch: Partial<TeacherSectionAssignment>
  ) =>
    applySections(
      sectionAssignments.map((item) =>
        item.section === section ? { ...item, ...patch } : item
      )
    );

  const handleToggleClassTeacher = (section: string, active: boolean) =>
    updateSection(
      section,
      active
        ? { isClassTeacher: true }
        : { isClassTeacher: false, classTeacherOf: "" }
    );

  const handleClassTeacherClassChange = (
    section: string,
    className: string
  ) => updateSection(section, { classTeacherOf: className });

  const handleClassesChange = (section: string, classNames: string[]) =>
    updateSection(section, {
      classes: mergeClassSubjects(classNames, assignmentOf(section).classes),
    });

  const handleClassSubjectsChange = (
    section: string,
    className: string,
    subjects: string[]
  ) => {
    const current = assignmentOf(section);
    updateSection(section, {
      classes: current.classes.map((entry) =>
        entry.className === className ? { ...entry, subjects } : entry
      ),
    });
  };

  const handleResetSection = (section: string) =>
    updateSection(section, {
      isClassTeacher: false,
      classTeacherOf: "",
      classes: [],
    });

  const handlePhotoSelected = (file: File | null) => {
    setPhotoFile(file);
    setPhotoRemoved(file === null);
  };

  const handleReset = () => {
    reset({
      ...EMPTY_TEACHER,
      employeeId: identities ? nextEmployeeId(identities) : "",
    });
    setSectionAssignments(createEmptySectionAssignments());
    setPhotoFile(null);
    setPhotoRemoved(false);
    setSubmitError("");
    setMovedFromLegacy(false);
    setActiveSection(TEACHER_SECTIONS[0]);
  };

  const onSubmit: SubmitHandler<TeacherFormValues> = async (data) => {
    setSubmitError("");

    const sectionPayload = pruneSectionAssignments(toSectionTabs(sectionAssignments));
    const incompleteSection = sectionPayload.find(
      (item) => item.isClassTeacher && item.classTeacherOf === ""
    );
    if (incompleteSection) {
      setActiveSection(incompleteSection.section);
      setSubmitError(
        `Select the class of the class teacher for Section ${incompleteSection.section}.`
      );
      return;
    }
    const classTeacherSection = sectionPayload.find((item) => item.isClassTeacher);
    if (data.designation === SUBJECT_TEACHER && classTeacherSection) {
      setActiveSection(classTeacherSection.section);
      setSubmitError(
        `A Subject Teacher cannot be a class teacher. Turn off "Class Teacher of Section ${classTeacherSection.section}" or change the designation to Class Teacher.`
      );
      return;
    }

    const legacyFields = toLegacyTeacherFields(sectionPayload);

    // Checked again on fresh data: another admin may have saved meanwhile.
    let freshUsers: UserIdentity[];
    try {
      freshUsers = await loadUserIdentities();
      setIdentities(freshUsers);
    } catch (checkError) {
      console.error("Failed to check teacher IDs:", checkError);
      setSubmitError("Could not check the employee ID. Please try again.");
      return;
    }
    const idTaken = employeeIdConflict(freshUsers, data.employeeId, initialEditId);
    const emailTaken = initialEditId
      ? null
      : emailConflict(freshUsers, data.email, null);
    if (idTaken) setError("employeeId", { message: idTaken }, { shouldFocus: true });
    if (emailTaken) setError("email", { message: emailTaken }, { shouldFocus: !idTaken });
    if (idTaken || emailTaken) return;

    const assignmentTaken = findAssignmentConflict(
      sectionPayload,
      assignmentOwners(freshUsers, initialEditId)
    );
    if (assignmentTaken) {
      setActiveSection(assignmentTaken.section);
      setSubmitError(
        `${assignmentTaken.message} Remove it from that teacher first.`
      );
      return;
    }

    try {
      let photo = data.photo;
      if (photoRemoved) {
        photo = "";
      } else if (photoFile) {
        photo = await uploadTeacherPhoto(photoFile);
      }

      const teacherFields = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        gender: data.gender,
        dateOfBirth: toDateInputValue(data.dateOfBirth),
        employeeId: normalizeEmployeeId(data.employeeId),
        designation: data.designation,
        status: data.status || "Active",
        email: initialEditId ? data.email.trim() : normalizeEmail(data.email),
        phone: toMobileDigits(data.phone),
        joiningDate: toDateInputValue(data.joiningDate),
        address: data.address.trim(),
        photo,
        qualification: data.qualification.trim(),
        sectionAssignments: sectionPayload,
        assignedClasses: legacyFields.assignedClasses,
        isClassTeacher: legacyFields.isClassTeacher,
        classTeacherOf: legacyFields.classTeacherOf,
        role: data.role || "teacher",
      };

      if (initialEditId) {
        await updateDoc(doc(db, COLLECTION.USERS, initialEditId), {
          ...teacherFields,
          updatedAt: serverTimestamp(),
        });
        toast.success("Teacher updated successfully.");
      } else {
        const response = await fetch(`${API_BASE_URL}/api/add-teacher`, {
          method: "POST",
          headers: await authHeaders(),
          credentials: "include",
          body: JSON.stringify({ ...teacherFields, password: data.password }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result?.error || "Failed to add teacher. Please try again."
          );
        }
        toast.success(result?.message || "Teacher added successfully.");
      }

      handleReset();
      onClose();
    } catch (error) {
      console.error("Failed to save teacher:", error);
      setSubmitError(firestoreErrorMessage(error));
    }
  };

  return (
    <div>
      {movedFromLegacy && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
          This teacher was saved before section-wise assignments. The earlier
          classes were placed in Section {TEACHER_SECTIONS[0]} - please review
          them before saving.
        </div>
      )}
      {submitError && <FormMessage type="error">{submitError}</FormMessage>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CustomInput
            control={control}
            name="firstName"
            label="First Name"
            required
            placeholder="First name"
            rules={{ required: "First name is required." }}
          />
          <CustomInput
            control={control}
            name="lastName"
            label="Last Name"
            placeholder="Last name"
          />
          <CustomInput
            control={control}
            name="employeeId"
            label="Employee ID"
            required
            placeholder={identities ? "e.g. CVES-T-001" : "Loading next ID..."}
            // Saved in capitals (normalizeEmployeeId); shown that way while typing.
            className="uppercase placeholder:normal-case"
            rules={{
              validate: (value) => {
                if (String(value).trim() === "") return "Employee ID is required.";
                return (
                  (identities &&
                    employeeIdConflict(identities, String(value), initialEditId)) ||
                  true
                );
              },
            }}
          />
          <CustomSelect
            control={control}
            name="gender"
            label="Gender"
            required
            placeholder="Select gender"
            options={GENDER_OPTIONS}
            rules={{ required: "Gender is required." }}
          />
          <CustomSelect
            control={control}
            name="designation"
            label="Designation"
            required
            placeholder="Select designation"
            options={TEACHER_DESIGNATIONS}
            rules={{ required: "Designation is required." }}
          />
          <CustomSelect
            control={control}
            name="status"
            label="Status"
            placeholder="Select status"
            options={TEACHER_STATUS}
          />
          <CustomInput
            control={control}
            name="email"
            label="Email"
            type="email"
            required
            placeholder="Email address"
            // The email is the login ID, so it is fixed after the account is created.
            disabled={Boolean(initialEditId)}
            title={
              initialEditId
                ? "The email is the login ID and cannot be changed here."
                : undefined
            }
            rules={{
              required: "Email is required.",
              pattern: {
                value: EMAIL_PATTERN,
                message: "Enter a valid email address.",
              },
              validate: (value) =>
                initialEditId || !identities
                  ? true
                  : emailConflict(identities, String(value), null) || true,
            }}
          />
          {!initialEditId && (
            <CustomInput
              control={control}
              name="password"
              label="Password"
              type="password"
              required
              placeholder="Minimum 6 characters"
              rules={{
                required: "Password is required.",
                minLength: {
                  value: 6,
                  message: "Password should be at least 6 characters long.",
                },
              }}
            />
          )}
          <Controller
            control={control}
            name="phone"
            rules={{
              validate: (value) =>
                value === "" ||
                INDIAN_MOBILE_PATTERN.test(value) ||
                "Enter a valid 10 digit mobile number (starting with 6-9).",
            }}
            render={({ field, fieldState }) => (
              <div className="flex w-full flex-col gap-1.5">
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Phone Number
                </label>
                <div
                  className={`flex w-full overflow-hidden rounded-md border bg-white shadow-sm transition-colors focus-within:ring-2 ${
                    fieldState.error
                      ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/40"
                      : "border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500/50"
                  }`}
                >
                  <span className="flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm font-semibold text-gray-600">
                    +91
                  </span>
                  <input
                    id="phone"
                    ref={field.ref}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="10 digit mobile number"
                    value={field.value}
                    onChange={(event) =>
                      field.onChange(toMobileDigits(event.target.value).slice(0, 10))
                    }
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(fieldState.error)}
                    className="min-w-0 flex-1 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                  />
                </div>
                {fieldState.error && (
                  <p className="text-xs font-medium text-red-600">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
          <DateInput
            control={control}
            name="dateOfBirth"
            label="Date of Birth"
            min="1940-01-01"
            max={yearsFromToday(-18)}
          />
          <DateInput
            control={control}
            name="joiningDate"
            label="Joining Date"
            min="1980-01-01"
            max={yearsFromToday(1)}
          />
          <CustomInput
            control={control}
            name="qualification"
            label="Qualification"
            placeholder="e.g. B.Ed, M.A."
          />
          <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:col-span-2">
            <div>
              <h3 className="text-sm font-bold text-gray-800">
                Section-wise Assignment
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                The class teacher and the teaching subjects are saved separately
                for every section. Switch the tab to fill what this teacher
                handles in Section A and Section B.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {TEACHER_SECTIONS.map((section) => {
                const assignment =
                  sectionAssignments.find((item) => item.section === section) ??
                  createEmptySectionAssignment(section);
                const isActive = section === activeSection;
                const classCount = assignment.classes.length;
                const badge = [
                  assignment.isClassTeacher ? "Class Teacher" : "",
                  classCount > 0 ? `${classCount} class(es)` : "",
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setActiveSection(section)}
                    className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-bold transition-colors ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Section {section}
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {badge || "Empty"}
                    </span>
                  </button>
                );
              })}
            </div>

            <SectionAssignmentCard
              key={activeSection}
              section={activeSection}
              assignment={activeAssignment}
              subjectsOfClass={subjectsOfClass}
              loadingSubjects={loadingSubjects}
              owners={owners}
              canBeClassTeacher={canBeClassTeacher}
              onToggleClassTeacher={(active) =>
                handleToggleClassTeacher(activeSection, active)
              }
              onClassTeacherClassChange={(className) =>
                handleClassTeacherClassChange(activeSection, className)
              }
              onClassesChange={(classNames) =>
                handleClassesChange(activeSection, classNames)
              }
              onClassSubjectsChange={(className, subjects) =>
                handleClassSubjectsChange(activeSection, className, subjects)
              }
              onReset={() => handleResetSection(activeSection)}
            />
          </div>
          <div className="flex flex-col items-center justify-center sm:col-span-2">
            <PhotoUploadBox
              label={"TEACHER'S\nPHOTO"}
              photoUrl={photoUrl}
              onFileSelected={handlePhotoSelected}
            />
          </div>
          <CustomTextarea
            control={control}
            name="address"
            label="Address"
            placeholder="Full address"
            rows={2}
            wrapperClassName="sm:col-span-2"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <CustomButton type="submit" disabled={!isFormDirty || isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : initialEditId
                ? "Update Teacher"
                : "Add Teacher"}
          </CustomButton>
          <CustomButton type="button" variant="outline" onClick={handleReset}>
            Reset
          </CustomButton>
        </div>
      </form>
    </div>
  );
}

function AddTeacher() {
  const { teachers, loading, error } = useTeachers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherRecord | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const openAddModal = () => {
    setEditingTeacherId(null);
    setModalOpen(true);
  };

  const openEditModal = (teacherId: string) => {
    setEditingTeacherId(teacherId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTeacherId(null);
  };

  const openDeleteModal = (teacher: TeacherRecord) => {
    setTeacherToDelete(teacher);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!teacherToDelete) return;
    setDeleting(true);
    try {
      await updateDoc(doc(db, COLLECTION.USERS, teacherToDelete.id), {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        `${teacherToDelete.firstName} ${teacherToDelete.lastName} deleted successfully.`
      );
      setIsDeleteModalOpen(false);
      setTeacherToDelete(null);
    } catch (error) {
      console.error("Failed to delete teacher:", error);
      toast.error(firestoreErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Add Teacher"
        titleStyle="text-primaryBlue"
        description={`${teachers.length} teacher(s) added. Click the Add Teacher button to create a new record.`}
        descriptionStyle="text-gray-500"
        button={<Button buttonName="+ Add Teacher" onClick={openAddModal} />}
      />

      {loading ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Loading teachers...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700">
          Failed to load teachers: {error}
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-500 font-semibold">No teachers added yet.</p>
          <Button
            buttonName="Add the first teacher"
            onClick={openAddModal}
            buttonStyle="mt-2"
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[1300px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="px-4 py-3">Sr. No.</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>                
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, index) => (
                <tr
                  key={teacher.id}
                  className={index % 2 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-4 py-3">{index+1}</td>
                  <td className="px-4 py-3">
                    {teacher.photo ? (
                      <img
                        src={teacher.photo}
                        alt={`${teacher.firstName} ${teacher.lastName}`}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                        {(teacher.firstName[0] || "T").toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {teacher.firstName} {teacher.lastName}
                  </td>
                  <td className="px-4 py-3">{teacher.employeeId || "-"}</td>
                  <td className="px-4 py-3">{teacher.designation || "-"}</td>
                  <td className="px-4 py-3">{teacher.gender || "-"}</td>
                  <td className="px-4 py-3">{teacher.email}</td>
                  <td className="px-4 py-3">{teacher.phone || "-"}</td>                                    
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-bold ${
                        teacher.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {teacher.status || "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        title={`Edit ${teacher.firstName}`}
                        aria-label={`Edit ${teacher.firstName}`}
                        onClick={() => openEditModal(teacher.id)}
                        className="rounded border p-2 text-sm text-blue-600 hover:bg-blue-50"
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        title={`Delete ${teacher.firstName}`}
                        aria-label={`Delete ${teacher.firstName}`}
                        disabled={deleting}
                        onClick={() => openDeleteModal(teacher)}
                        className="rounded border p-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          isOpen
          onClose={closeModal}
          title={editingTeacherId ? "Edit Teacher" : "Add Teacher"}
          description="Fill in the teacher details below. Personal information is common and the class teacher / subjects are saved for every section separately. Fields marked with * are required."
          cancelText="Cancel"
          hideSubmit
          onSubmit={() => {}}
          modalClassName="max-w-5xl"
        >
          <TeacherForm initialEditId={editingTeacherId} onClose={closeModal} />
        </Modal>
      )}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Teacher"
        description={
          teacherToDelete
            ? `Are you sure you want to delete ${teacherToDelete.firstName} ${teacherToDelete.lastName}? The teacher will be hidden from the list.`
            : "Are you sure you want to delete this teacher?"
        }
        cancelText="Cancel"
        submitText="Delete"
        loading={deleting}
        onSubmit={() => void handleDelete()}
      />
    </div>
  );
}

export default AddTeacher;