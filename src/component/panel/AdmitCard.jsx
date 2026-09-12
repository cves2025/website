import React, { useState } from "react";

const SUBJECTS = ["English", "Hindi", "Math", "Science", "Social Science", "Computer"];

const sampleStudent = {
  firstName: "Aarav",
  lastName: "Sharma",
  enrollment: "1001",
  className: "5",
  section: "A",
  fatherName: "Rajesh Sharma",
  motherName: "Sunita Sharma",
};

function AdmitCard() {
  const [students] = useState(() =>
    JSON.parse(localStorage.getItem("cves_students") || "[]")
  );
  const [enrollmentQuery, setEnrollmentQuery] = useState("");
  const [card, setCard] = useState(sampleStudent);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  const handleGenerate = (e) => {
    e.preventDefault();
    setError("");
    const query = enrollmentQuery.trim();
    if (!query) {
      // Show a design preview with sample data when no enrollment is entered.
      setCard(sampleStudent);
      setGenerated(true);
      return;
    }
    const found = students.find((s) => s.enrollment === query);
    if (found) {
      setCard(found);
      setGenerated(true);
    } else {
      setError("Student not found with this enrollment number.");
      setGenerated(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Admit Card</h2>
      <p className="text-gray-600 mt-1 mb-6">
        Enter enrollment number to generate an admit card.
      </p>

      <form
        onSubmit={handleGenerate}
        className="mb-6 flex flex-col sm:flex-row gap-3 max-w-md"
      >
        <input
          value={enrollmentQuery}
          onChange={(e) => setEnrollmentQuery(e.target.value)}
          placeholder="Enrollment number"
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md px-6 py-2 text-sm transition-colors"
        >
          Generate
        </button>
      </form>

      {error && (
        <p className="mb-4 bg-red-100 text-red-700 border border-red-300 rounded-md px-4 py-2 font-semibold max-w-md">
          {error}
        </p>
      )}

      {generated && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border-4 border-double border-blue-800 overflow-hidden">
          {/* Card header */}
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white text-center py-4 px-4">
            <h3 className="text-lg md:text-2xl font-bold leading-tight">
              CHILDREN'S VALLEY ENGLISH SCHOOL
            </h3>
            <p className="text-sm md:text-base">Mahmoorganj, Varanasi (UP)</p>
            <div className="inline-block mt-2 bg-amber-400 text-blue-900 font-bold rounded px-6 py-1">
              ADMIT CARD
            </div>
          </div>

          {/* Student details */}
          <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-b-2 border-blue-800">
            <p><span className="font-semibold">Enrollment:</span> {card.enrollment}</p>
            <p><span className="font-semibold">Name:</span> {card.firstName} {card.lastName}</p>
            <p><span className="font-semibold">Class:</span> {card.className}</p>
            <p><span className="font-semibold">Section:</span> {card.section}</p>
            <p><span className="font-semibold">Father's Name:</span> {card.fatherName || "-"}</p>
            <p><span className="font-semibold">Mother's Name:</span> {card.motherName || "-"}</p>
          </div>

          {/* Subjects */}
          <div className="p-4 md:p-6">
            <h4 className="font-bold text-center mb-3 text-gray-800">
              Subjects & Exam Schedule (Unit Test - 1)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-300 min-w-[420px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-800">
                    <th className="border border-gray-300 px-3 py-2 text-left">Subject</th>
                    <th className="border border-gray-300 px-3 py-2">Date</th>
                    <th className="border border-gray-300 px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {SUBJECTS.map((sub, i) => (
                    <tr key={sub}>
                      <td className="border border-gray-300 px-3 py-2">{sub}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">-</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-8 text-sm text-gray-700">
              <div className="text-center">
                <p className="pt-2 border-t-2 border-gray-400 w-36">Class Teacher</p>
              </div>
              <div className="text-center">
                <p className="pt-2 border-t-2 border-gray-400 w-36">Principal</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdmitCard;