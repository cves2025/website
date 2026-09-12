import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import BulkStudentImport from "./BulkStudentImport";

const CLASSES = ["PG", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C"];

const emptyStudent = {
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
  const [student, setStudent] = useState(emptyStudent);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!student.firstName || !student.enrollment || !student.className) {
      setError("First name, enrollment number and class are required.");
      return;
    }
    const list = JSON.parse(localStorage.getItem("cves_students") || "[]");
    if (list.some((s) => s.enrollment === student.enrollment.trim())) {
      setError("A student with this enrollment number already exists.");
      return;
    }
    list.push({ ...student, id: Date.now() });
    localStorage.setItem("cves_students", JSON.stringify(list));
    setStudent(emptyStudent);
    setMessage("Student added successfully!");
    setTimeout(() => setMessage(""), 4000);
  };

  const inputClass =
    "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Add Student</h2>
      <p className="text-gray-600 mt-1 mb-6">Add a single student or import in bulk.</p>

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
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
      <div>
      {message && (
        <p className="mb-4 bg-green-100 text-green-700 border border-green-300 rounded-md px-4 py-2 font-semibold">
          {message}{" "}
          <NavLink to="/welcome/student/list" className="underline">
            View Student List
          </NavLink>
        </p>
      )}
      {error && (
        <p className="mb-4 bg-red-100 text-red-700 border border-red-300 rounded-md px-4 py-2 font-semibold">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">First Name *</label>
            <input name="firstName" value={student.firstName} onChange={handleChange} placeholder="First name" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
            <input name="lastName" value={student.lastName} onChange={handleChange} placeholder="Last name" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Enrollment No. *</label>
            <input name="enrollment" value={student.enrollment} onChange={handleChange} placeholder="e.g. 1001" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Class *</label>
              <select name="className" value={student.className} onChange={handleChange} className={inputClass}>
                <option value="">Select</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Section</label>
              <select name="section" value={student.section} onChange={handleChange} className={inputClass}>
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Father's Name</label>
            <input name="fatherName" value={student.fatherName} onChange={handleChange} placeholder="Father's name" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mother's Name</label>
            <input name="motherName" value={student.motherName} onChange={handleChange} placeholder="Mother's name" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
            <input type="date" name="dob" value={student.dob} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
            <input name="phone" value={student.phone} onChange={handleChange} placeholder="Mobile number" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" name="email" value={student.email} onChange={handleChange} placeholder="Email" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
            <textarea name="address" value={student.address} onChange={handleChange} placeholder="Full address" rows="2" className={inputClass} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-md px-6 py-2.5 transition-colors"
          >
            Add Student
          </button>
          <NavLink
            to="/welcome/student/list"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-6 py-2.5 transition-colors text-center"
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