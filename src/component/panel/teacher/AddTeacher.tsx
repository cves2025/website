import { useEffect, useState } from "react";
import {
  doc,
  DocumentData,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  Control,
  FieldPath,
  FieldValues,
  RegisterOptions,
  SubmitHandler,
  useController,
  useForm,
} from "react-hook-form";
import toast from "react-hot-toast";
import { FaEdit, FaTrash } from "react-icons/fa";

import { API_BASE_URL, authHeaders } from "../../context/api";
import {
  CLASSES,
  COLLECTION,
  EMAIL_PATTERN,
  GENDER_OPTIONS,
  PHONE_PATTERN,
  TEACHER_DESIGNATIONS,
  TEACHER_STATUS,
} from "../../../constants";
import Button from "../../../custom-components/Button";
import CustomButton from "../../../custom-components/CustomButton";
import CustomInput from "../../../custom-components/CustomInput";
import CustomSelect from "../../../custom-components/CustomSelect";
import CustomTextarea from "../../../custom-components/CustomTextarea";
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
  TEACHER_SECTIONS,
  createEmptySectionAssignment,
  createEmptySectionAssignments,
  formatClassSubjects,
  formatSectionLabel,
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
    phone: stringField("phone"),
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

function toSubjectChoices(
  subjects: TeacherSubjectOption[],
  selected: string[]
): SearchableOption[] {
  const choices: SearchableOption[] = subjects.map((subject) => ({
    value: subject.name,
    label: subject.name,
    hint: subject.type,
  }));

  selected.forEach((name) => {
    if (choices.some((choice) => choice.value === name)) return;
    choices.push({ value: name, label: name, hint: "Saved earlier" });
  });

  return choices;
}

function formatJoiningDate(value: Date | null): string {
  if (!value) return "-";
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toDateInputValue(value: Date | null): string {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateValue(value: string): Date | null {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

interface DateInputProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  required?: boolean;
  rules?: RegisterOptions<T, FieldPath<T>>;
  wrapperClassName?: string;
}

function DateInput<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  required = false,
  rules = {},
  wrapperClassName = "",
}: DateInputProps<T>) {
  const { field, fieldState } = useController<T, FieldPath<T>>({
    control,
    name,
    rules,
  });

  const value = field.value as Date | null;
  const current = value instanceof Date ? toDateInputValue(value) : "";
  const invalid = Boolean(fieldState.error);
  const isRequired = required || Boolean(rules.required);

  return (
    <div className={`flex w-full flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-semibold text-gray-700"
        >
          {label}
          {isRequired && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <input
        id={name}
        type="date"
        ref={field.ref}
        value={current}
        aria-invalid={invalid}
        onChange={(event) => field.onChange(toDateValue(event.target.value))}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 ${
          invalid
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/40"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/50"
        }`}
      />
      {fieldState.error && (
        <p className="text-xs font-medium text-red-600">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}

interface SectionAssignmentCardProps {
  section: string;
  assignment: TeacherSectionAssignment;
  subjectsOfClass: (className: string) => TeacherSubjectOption[];
  loadingSubjects: boolean;
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
  onToggleClassTeacher,
  onClassTeacherClassChange,
  onClassesChange,
  onClassSubjectsChange,
  onReset,
}: SectionAssignmentCardProps) {
  const selectedClasses = assignment.classes.map((entry) => entry.className);
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={assignment.isClassTeacher}
              onClick={() => onToggleClassTeacher(!assignment.isClassTeacher)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                assignment.isClassTeacher ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  assignment.isClassTeacher ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm font-semibold ${
                assignment.isClassTeacher ? "text-green-700" : "text-gray-600"
              }`}
            >
              {assignment.isClassTeacher ? "Yes" : "No"}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <label
            htmlFor={`section-${section}-class-teacher-class`}
            className="block text-sm font-semibold text-gray-700"
          >
            Class Teacher Class
          </label>
          <select
            id={`section-${section}-class-teacher-class`}
            value={assignment.classTeacherOf}
            disabled={!assignment.isClassTeacher}
            onChange={(event) => onClassTeacherClassChange(event.target.value)}
            className={`w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 ${
              assignment.isClassTeacher
                ? "border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-500/50"
                : "border-gray-300 text-gray-400"
            }`}
          >
            <option value="">Select class</option>
            {CLASSES.map((className) => (
              <option key={className} value={className}>
                {toClassLabel(className)}
              </option>
            ))}
          </select>
        </div>

        <SearchableMultiSelect
          id={`section-${section}-classes`}
          options={CLASS_CHOICES}
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
                    entry.subjects
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
  } = useForm<TeacherFormValues>({ defaultValues: EMPTY_TEACHER });

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

  const isFormDirty = isDirty || photoFile !== null || photoRemoved;

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
    reset(EMPTY_TEACHER);
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

    const legacyFields = toLegacyTeacherFields(sectionPayload);

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
        employeeId: data.employeeId.trim(),
        designation: data.designation,
        status: data.status || "Active",
        email: data.email.trim(),
        phone: data.phone.trim(),
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
            placeholder="e.g. EMP-2026-001"
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
            rules={{
              required: "Email is required.",
              pattern: {
                value: EMAIL_PATTERN,
                message: "Enter a valid email address.",
              },
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
          <CustomInput
            control={control}
            name="phone"
            label="Phone Number"
            type="tel"
            placeholder="Mobile number"
            rules={{
              pattern: {
                value: PHONE_PATTERN,
                message: "Phone can contain only digits, spaces, + or -",
              },
            }}
          />
          <DateInput
            control={control}
            name="dateOfBirth"
            label="Date of Birth"
          />
          <DateInput
            control={control}
            name="joiningDate"
            label="Joining Date"
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
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Joining Date</th>
                <th className="px-4 py-3">Qualification</th>
                <th className="px-4 py-3">Section-wise Assignment</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, index) => (
                <tr
                  key={teacher.id}
                  className={index % 2 ? "bg-gray-50" : "bg-white"}
                >
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
                  <td className="px-4 py-3">{teacher.gender || "-"}</td>
                  <td className="px-4 py-3">{teacher.email}</td>
                  <td className="px-4 py-3">{teacher.phone || "-"}</td>
                  <td className="px-4 py-3">
                    {formatJoiningDate(teacher.joiningDate)}
                  </td>
                  <td className="px-4 py-3">{teacher.qualification || "-"}</td>
                  <td className="px-4 py-3 align-top">
                    {teacher.sectionAssignments.length === 0 ? (
                      <span className="text-xs text-gray-400">Not assigned</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {teacher.sectionAssignments.map((assignment) => {
                          const teaching = formatClassSubjects(
                            assignment.classes
                          );
                          return (
                            <div
                              key={assignment.section || "all"}
                              className="flex flex-wrap items-center gap-1.5 text-xs"
                            >
                              <span className="rounded bg-gray-200 px-1.5 py-0.5 font-bold text-gray-700">
                                {formatSectionLabel(assignment.section)}
                              </span>
                              {assignment.isClassTeacher && (
                                <span className="rounded bg-purple-100 px-1.5 py-0.5 font-bold text-purple-700">
                                  Class Teacher ·{" "}
                                  {assignment.classTeacherOf
                                    ? toClassLabel(assignment.classTeacherOf)
                                    : "Not selected"}
                                </span>
                              )}
                              {teaching && (
                                <span
                                  className="max-w-[20rem] truncate text-gray-600"
                                  title={teaching}
                                >
                                  {teaching}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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