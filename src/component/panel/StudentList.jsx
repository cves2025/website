import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import BulkStudentImport from "./BulkStudentImport";
import { BsX } from "react-icons/bs";

function StudentList() {
  const [students, setStudents] = useState(() =>
    JSON.parse(localStorage.getItem("cves_students") || "[]")
  );
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = students.filter((s) =>
    [s.firstName, s.lastName, s.enrollment, s.className, s.section]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const refresh = () =>
    setStudents(JSON.parse(localStorage.getItem("cves_students") || "[]"));

  const handleDelete = (id) => {
    const updated = students.filter((s) => s.id !== id);
    localStorage.setItem("cves_students", JSON.stringify(updated));
    setStudents(updated);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Student List</h2>
          <p className="text-gray-600 mt-1">{students.length} student(s) added.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
          >
            Import Students
          </button>
          <NavLink
            to="/welcome/student/add"
            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
          >
            + Add Student
          </NavLink>
        </div>
      </div>

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, enrollment, class..."
          className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-500 font-semibold">No students found.</p>
          <NavLink to="/welcome/student/add" className="text-blue-600 underline inline-block mt-2">
            Add the first student
          </NavLink>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-800 text-white text-left">
                <th className="px-4 py-3">Enrollment</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Father's Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-4 py-3 font-semibold">{s.enrollment}</td>
                  <td className="px-4 py-3">{s.firstName} {s.lastName}</td>
                  <td className="px-4 py-3">{s.className}</td>
                  <td className="px-4 py-3">{s.section}</td>
                  <td className="px-4 py-3">{s.fatherName || "-"}</td>
                  <td className="px-4 py-3">{s.phone || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1 text-xs font-bold transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Import modal */}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setImportOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-gray-800">
                Import Students
              </h2>
              <button
                onClick={() => setImportOpen(false)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Close"
              >
                <BsX className="w-6 h-6" />
              </button>
            </div>
            <BulkStudentImport
              onImported={() => {
                refresh();
                setImportOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentList;