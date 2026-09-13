import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { StudentFormValues } from "../../../utils/type";
import BulkStudentImport from "../BulkStudentImport";
import CustomInput from "../../../custom-components/CustomInput";
import CustomSelect from "../../../custom-components/CustomSelect";
import CustomTextarea from "../../../custom-components/CustomTextarea";
import CustomButton from "../../../custom-components/CustomButton";
import { CLASSES, COLLECTION, EMAIL_PATTERN, PHONE_PATTERN, SECTIONS } from "../../../constants";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";

// Academic sessions from 2023-24 up to the current session (generated once).
const ACADEMIC_YEARS = generateAcademicYears();

function firestoreErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    const lower = message.toLowerCase();
    if (lower.includes("permission")) {
      return "You do not have permission to save students. Please login with an admin account.";
    }
    if (lower.includes("token") || lower.includes("session")) {
      return "Your session is invalid or expired. Please logout and login again.";
    }
    return message;
  }
  return "Something went wrong while saving to Firestore.";
}

const defaultValues: StudentFormValues = {
  firstName: "",
  lastName: "",
  enrollment: "",
  className: "",
  section: "A",
  fatherName: "",
  motherName: "",
  dob: "",
  phone: "",
  email: "",
  address: "",
  academicYear: "",
};

function AddStudent() {
  const [activeTab, setActiveTab] = useState("single");
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset } = useForm({ defaultValues });

  const onSubmit: SubmitHandler<StudentFormValues> = async (data) => {
  setSaving(true);

  try {
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const enrollment = data.enrollment.trim();

    const studentRef = doc(collection(db, COLLECTION.STUDENTS));
    const enrollmentRef = doc(collection(db, COLLECTION.ENROLLMENTS));

    const batch = writeBatch(db);

    batch.set(studentRef, {
      firstName,
      lastName,
      enrollment,

      firstNameLower: firstName.toLowerCase(),
      lastNameLower: lastName.toLowerCase(),

      fatherName: data.fatherName.trim(),
      motherName: data.motherName.trim(),
      dob: data.dob,
      phone: data.phone.trim(),
      email: data.email.trim(),
      address: data.address.trim(),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(enrollmentRef, {
      studentId: studentRef.id,

      academicYear: data.academicYear,
      className: data.className,
      section: data.section,

      enrollment,

      studentName: `${firstName} ${lastName}`.trim(),

      firstName,
      lastName,

      firstNameLower: firstName.toLowerCase(),
      lastNameLower: lastName.toLowerCase(),

      fatherName: data.fatherName.trim(),
      phone: data.phone.trim(),

      status: "active",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    reset(defaultValues);

    toast.success(
      `Student ${data.firstName} ${data.lastName} added successfully!`
    );
  } catch (error) {
    toast.error(firestoreErrorMessage(error));
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 md:text-3xl">
            Add Student
          </h2>
          <p className="mt-1 text-gray-600">
            Add a single student or import in bulk.
          </p>
        </div>
        <NavLink
          to="/welcome/student/list"
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Student List
        </NavLink>
      </div>

      {/* Tabs */}
      <div className="mb-6 inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white">
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          className={`px-5 py-2 text-sm font-bold transition-colors ${
            activeTab === "single"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Add Single
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bulk")}
          className={`px-5 py-2 text-sm font-bold transition-colors ${
            activeTab === "bulk"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Bulk Import (Excel / CSV)
        </button>
      </div>

      {activeTab === "bulk" ? (
        <BulkStudentImport />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <CustomSelect
                control={control}
                name="academicYear"
                label="Academic Year"
                placeholder="Select Academic Year"
                options={ACADEMIC_YEARS}
                rules={{ required: "Please select a Academic Year" }}
              />
                <CustomInput
                  control={control}
                  name="enrollment"
                  label="Enrollment No."
                  placeholder="e.g. 1001"
                  rules={{ required: "Enrollment number is required" }}
                />
              <CustomInput
                control={control}
                name="firstName"
                label="First Name"
                placeholder="First name"
                rules={{ required: "First name is required" }}
              />
              <CustomInput
                control={control}
                name="lastName"
                label="Last Name"
                placeholder="Last name"
              />
              <CustomSelect
                control={control}
                name="className"
                label="Class"
                placeholder="Select class"
                options={CLASSES}
                rules={{ required: "Please select a class" }}
              />
              <CustomSelect
                control={control}
                name="section"
                label="Section"
                placeholder={null}
                options={SECTIONS}
              />
              <CustomInput
                control={control}
                name="fatherName"
                label="Father's Name"
                placeholder="Father's name"
              />
              <CustomInput
                control={control}
                name="motherName"
                label="Mother's Name"
                placeholder="Mother's name"
              />
              <CustomInput
                control={control}
                name="dob"
                label="Date of Birth"
                type="date"
              />
              <CustomInput
                control={control}
                name="phone"
                label="Phone"
                type="tel"
                placeholder="Mobile number"
                rules={{
                  pattern: {
                    value: PHONE_PATTERN,
                    message: "Phone can contain only digits, spaces, + or -",
                  },
                }}
              />
              <CustomInput
                control={control}
                name="email"
                label="Email"
                type="email"
                placeholder="Email"
                rules={{
                  pattern: {
                    value: EMAIL_PATTERN,
                    message: "Enter a valid email address",
                  },
                }}
              />
              <CustomTextarea
                control={control}
                name="address"
                label="Address"
                placeholder="Full address"
                rows={2}
                wrapperClassName="sm:col-span-2"
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CustomButton type="submit" variant="success" loading={saving}>
                {saving ? "Saving..." : "Add Student"}
              </CustomButton>
              <NavLink
                to="/welcome/student/list"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Student List
              </NavLink>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AddStudent;