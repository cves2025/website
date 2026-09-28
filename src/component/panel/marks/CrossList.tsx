import { useState } from "react";
import { CLASSES } from "../../../constants";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { ExamDoc } from "../../../utils/type";

interface CrossListProps {
  exams: ExamDoc[];
  loading: boolean;
}

const academicYears = generateAcademicYears();

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

function CrossList({ exams, loading }: CrossListProps) {
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? ""
  );
  const [selectedExamId, setSelectedExamId] = useState("");

  const yearExams = exams.filter(
    (exam) =>
      exam.status === "active" && exam.academicYear === selectedYear
  );
  const selectedExam = yearExams.find((exam) => exam.id === selectedExamId) ?? null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-bold text-gray-800">Cross List</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Select the academic year and exam to print the cross list for every class.
        </p>
      </div>

      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="crossListYear"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Academic Year
          </label>
          <select
            id="crossListYear"
            value={selectedYear}
            onChange={(event) => {
              setSelectedYear(event.target.value);
              setSelectedExamId("");
            }}
            className={inputClass}
          >
            {academicYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="crossListExam"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Exam
          </label>
          <select
            id="crossListExam"
            value={selectedExamId}
            onChange={(event) => setSelectedExamId(event.target.value)}
            className={inputClass}
          >
            <option value="">Select Exam</option>
            {yearExams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.examName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-10 text-center">
          <p className="text-gray-500 font-semibold">Loading exams...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-gray-800 text-white text-left">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((className, index) => (
                <tr
                  key={className}
                  className={index % 2 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {toOrdinalLabel(className)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 text-xs font-bold transition-colors"
                    >
                      Print Cross List
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 px-4 py-2 text-xs text-gray-500">
            {selectedExam
              ? `Cross list for ${selectedExam.examName} (${selectedYear}).`
              : "Select an exam to print its cross list."}
          </p>
        </div>
      )}
    </div>
  );
}

export default CrossList;