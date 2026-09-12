import React, { useState } from "react";
import { NavLink } from "react-router-dom";

function TeachersList() {
  const [teachers, setTeachers] = useState(() =>
    JSON.parse(localStorage.getItem("cves_teachers") || "[]")
  );
  const [query, setQuery] = useState("");

  const filtered = teachers.filter((t) =>
    [t.firstName, t.lastName, t.email, t.subject]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const handleDelete = (id) => {
    const updated = teachers.filter((t) => t.id !== id);
    localStorage.setItem("cves_teachers", JSON.stringify(updated));
    setTeachers(updated);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Teachers List</h2>
          <p className="text-gray-600 mt-1">{teachers.length} teacher(s) added.</p>
        </div>
        <NavLink
          to="/welcome/teacher/add"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
        >
          + Add Teacher
        </NavLink>
      </div>

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, subject..."
          className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-500 font-semibold">No teachers found.</p>
          <NavLink to="/welcome/teacher/add" className="text-blue-600 underline inline-block mt-2">
            Add the first teacher
          </NavLink>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-800 text-white text-left">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Qualification</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-4 py-3 font-semibold">{t.firstName} {t.lastName}</td>
                  <td className="px-4 py-3">{t.email || "-"}</td>
                  <td className="px-4 py-3">{t.phone || "-"}</td>
                  <td className="px-4 py-3">{t.subject}</td>
                  <td className="px-4 py-3">{t.qualification || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(t.id)}
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
    </div>
  );
}

export default TeachersList;