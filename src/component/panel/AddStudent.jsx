import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useForm } from "react-hook-form";
import BulkStudentImport from "./BulkStudentImport";
import CustomInput from "../../custom-components/CustomInput";
import CustomSelect from "../../custom-components/CustomSelect";
import CustomTextarea from "../../custom-components/CustomTextarea";
import CustomButton from "../../custom-components/CustomButton";
import FormMessage from "../../custom-components/FormMessage";
import { CLASSES, EMAIL_PATTERN, PHONE_PATTERN, SECTIONS } from "../../constants";

const defaultValues = {
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
};

function AddStudent() {
  const [activeTab, setActiveTab] = useState("single");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  const { control, handleSubmit, reset } = useForm({ defaultValues });

  const onSubmit = (data) => {
    setFormError("");
    const list = JSON.parse(localStorage.getItem("cves_students") || "[]");
    if (list.some((s) => s.enrollment === data.enrollment.trim())) {
      setFormError("A student with this enrollment number already exists.");
      return;
    }
    list.push({ ...data, id: Date.now() });
    localStorage.setItem("cves_students", JSON.stringify(list));
    reset(defaultValues);
    setMessage("Student added successfully!");
    setTimeout(() => setMessage(""), 4000);
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
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
          <FormMessage type="success">
            {message && (
              <>
                {message}{" "}
                <NavLink to="/welcome/student/list" className="underline">
                  View Student List
                </NavLink>
              </>
            )}
          </FormMessage>
          <FormMessage type="error">{formError}</FormMessage>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
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
                name="enrollment"
                label="Enrollment No."
                placeholder="e.g. 1001"
                rules={{ required: "Enrollment number is required" }}
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
              <CustomButton type="submit" variant="success">
                Add Student
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