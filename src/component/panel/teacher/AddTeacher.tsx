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
  CLASS_OPTIONS,
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
import CustomToggle from "../../../custom-components/CustomToggle";
import FormMessage from "../../../custom-components/FormMessage";
import Modal from "../../../custom-components/Modal";
import PageHeader from "../../../custom-components/PageHeader";
import PhotoUploadBox from "../../../custom-components/admission/PhotoUploadBox";
import SearchableMultiSelect from "../../../custom-components/SearchableMultiSelect";
import { db } from "../../../firebase/config";
import { uploadTeacherPhoto } from "../../../firebase/teacherPhotos";
import { useTeachers } from "../../../hooks/useTeachers";
import type { TeacherFormValues, TeacherRecord } from "../../../utils/type";
import { toDateOrNull } from "../../../utils/toDateOrNull";

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
  assignedClasses: [],
  isClassTeacher: false,
  classTeacherOf: "",
  password: "",
  role: "teacher",
};

function teacherDocToForm(data: DocumentData): TeacherFormValues {
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
    assignedClasses: Array.isArray(data.assignedClasses)
      ? data.assignedClasses.filter((item) => typeof item === "string")
      : [],
    isClassTeacher: data.isClassTeacher === true,
    classTeacherOf: stringField("classTeacherOf"),
    password: "",
    role: stringField("role") || "teacher",
  };
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
  const classTeacherFlag = watch("isClassTeacher");
  const selectedClasses = watch("assignedClasses");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const isClassTeacher = classTeacherFlag === true;
  const assignedClasses = Array.isArray(selectedClasses)
    ? selectedClasses
    : [];

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
        if (!cancelled) reset(teacherDocToForm(snapshot.data()));
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

  const handlePhotoSelected = (file: File | null) => {
    setPhotoFile(file);
    setPhotoRemoved(file === null);
  };

  const handleReset = () => {
    reset(EMPTY_TEACHER);
    setPhotoFile(null);
    setPhotoRemoved(false);
    setSubmitError("");
  };

  const onSubmit: SubmitHandler<TeacherFormValues> = async (data) => {
    setSubmitError("");
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
        assignedClasses: Array.isArray(data.assignedClasses)
          ? data.assignedClasses
          : [],
        isClassTeacher: data.isClassTeacher === true,
        classTeacherOf: data.isClassTeacher === true ? data.classTeacherOf : "",
        role: data.role || "teacher",
      };

      if (initialEditId) {
        await updateDoc(doc(db, COLLECTION.USERS, initialEditId), {
          ...teacherFields,
          updatedAt: serverTimestamp(),
        });
        toast.success("Teacher updated successfully.");
      } else {
        console.log(API_BASE_URL);
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
          <CustomToggle
            control={control}
            name="isClassTeacher"
            label="Class Teacher"
            activeValue="true"
            inactiveValue="false"
            activeLabel="Yes"
            inactiveLabel="No"
            onChange={(value) => {
              setValue("isClassTeacher", value === "true");
              if (value !== "true") setValue("classTeacherOf", "");
            }}
          />
          <CustomSelect
            control={control}
            name="classTeacherOf"
            label="Class Teacher Of"
            placeholder="Select class"
            options={CLASSES}
            disabled={!isClassTeacher}
            className={isClassTeacher ? "" : "text-gray-400"}
          />
          <SearchableMultiSelect
            options={CLASS_OPTIONS}
            values={assignedClasses}
            onChange={(values) => setValue("assignedClasses", values)}
            label="Assigned Classes"
            placeholder="Select classes"
            helpText="Classes this teacher handles."
            wrapperClassName="sm:col-span-2"
            maxChips={3}
          />
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
          <CustomButton type="submit" disabled={!isDirty || isSubmitting}>
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
          <table className="w-full text-sm min-w-[1100px]">
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
                    {teacher.isClassTeacher && (
                      <span className="mt-0.5 block text-xs font-medium text-blue-600">
                        Class Teacher · {teacher.classTeacherOf || "Not assigned"}
                      </span>
                    )}
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
          description="Fill in the teacher details below. Fields marked with * are required."
          cancelText="Cancel"
          hideSubmit
          onSubmit={() => {}}
          modalClassName="max-w-3xl"
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