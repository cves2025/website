import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const SUBJECTS = [
  "English", "Hindi", "Math", "Science", "Computer",
  "Social Science", "Drawing", "Dance", "Karate", "Yoga",
];

const emptyTeacher = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  qualification: "",
  joiningDate: "",
  address: "",
};

function AddTeacher() {
  const [teacher, setTeacher] = useState(emptyTeacher);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTeacher((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!teacher.firstName || !teacher.subject || !teacher.email) {
      setError("Name, subject and email are required.");
      return;
    }
    const list = JSON.parse(localStorage.getItem("cves_teachers") || "[]");
    if (list.some((t) => t.email === teacher.email.trim())) {
      setError("A teacher with this email already exists.");
      return;
    }
    list.push({ ...teacher, id: Date.now() });
    localStorage.setItem("cves_teachers", JSON.stringify(list));
    setTeacher(emptyTeacher);
    setMessage("Teacher added successfully!");
    setTimeout(() => setMessage(""), 4000);
  };

  const inputClass =
    "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Add Teacher</h2>
      <p className="text-gray-600 mt-1 mb-6">Fill in the teacher details below.</p>

      {message && (
        <p className="mb-4 bg-green-100 text-green-700 border border-green-300 rounded-md px-4 py-2 font-semibold">
          {message}{" "}
          <NavLink to="/welcome/teacher/list" className="underline">
            View Teachers List
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
            <input name="firstName" value={teacher.firstName} onChange={handleChange} placeholder="First name" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
            <input name="lastName" value={teacher.lastName} onChange={handleChange} placeholder="Last name" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
            <input type="email" name="email" value={teacher.email} onChange={handleChange} placeholder="Email" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
            <input name="phone" value={teacher.phone} onChange={handleChange} placeholder="Mobile number" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Subject *</label>
            <select name="subject" value={teacher.subject} onChange={handleChange} className={inputClass}>
              <option value="">Select subject</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Qualification</label>
            <input name="qualification" value={teacher.qualification} onChange={handleChange} placeholder="e.g. B.Ed, M.A." className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Joining Date</label>
            <input type="date" name="joiningDate" value={teacher.joiningDate} onChange={handleChange} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
            <textarea name="address" value={teacher.address} onChange={handleChange} placeholder="Full address" rows="2" className={inputClass} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-6 py-2.5 transition-colors"
          >
            Add Teacher
          </button>
          <NavLink
            to="/welcome/teacher/list"
            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-md px-6 py-2.5 transition-colors text-center"
          >
            Teachers List
          </NavLink>
        </div>
      </form>
    </div>
  );
}

export default AddTeacher;