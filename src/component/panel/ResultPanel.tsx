import { useState, FormEvent } from "react";

const CLASSES: string[] = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8"];
const EXAMS: string[] = ["Unit Test-1", "Unit Test-2", "Half Yearly", "Annual"];
const SUBJECTS: string[] = ["English", "Hindi", "Math", "Science"];

interface SampleResult {
  enrollment: string;
  name: string;
  marks: number[];
}

const sampleResults: SampleResult[] = [
  { enrollment: "1001", name: "Aarav Sharma", marks: [45, 38, 42, 40] },
  { enrollment: "1002", name: "Diya Verma", marks: [40, 42, 44, 38] },
  { enrollment: "1003", name: "Rohan Gupta", marks: [38, 35, 40, 42] },
  { enrollment: "1004", name: "Ananya Singh", marks: [46, 44, 43, 45] },
];

const toGrade = (total: number): string => {
  const pct = (total / (SUBJECTS.length * 50)) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 75) return "A";
  if (pct >= 60) return "B";
  if (pct >= 45) return "C";
  return "D";
};

function ResultPanel() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [showResult, setShowResult] = useState(false);

  const handleLoad = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClass || !selectedExam) return;
    setShowResult(true);
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Result</h2>
      <p className="text-gray-600 mt-1 mb-6">View student results by class and exam.</p>

      <form
        onSubmit={handleLoad}
        className="mb-6 flex flex-col sm:flex-row gap-3 max-w-2xl"
      >
        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            setShowResult(false);
          }}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Class</option>
          {CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={selectedExam}
          onChange={(e) => {
            setSelectedExam(e.target.value);
            setShowResult(false);
          }}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Exam</option>
          {EXAMS.map((ex) => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-md px-6 py-2 text-sm transition-colors"
        >
          Load Result
        </button>
      </form>

      {showResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">
              {selectedExam} Result - Class {selectedClass}
            </h3>
          </div>
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-gray-800 text-white text-left">
                <th className="px-4 py-3">Enrollment</th>
                <th className="px-4 py-3">Student Name</th>
                {SUBJECTS.map((sub) => (
                  <th key={sub} className="px-4 py-3">{sub}</th>
                ))}
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {sampleResults.map((r, i) => {
                const total = r.marks.reduce((a, b) => a + b, 0);
                return (
                  <tr key={r.enrollment} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-4 py-3">{r.enrollment}</td>
                    <td className="px-4 py-3 font-semibold">{r.name}</td>
                    {r.marks.map((m, j) => (
                      <td key={j} className="px-4 py-3">{m}</td>
                   ))}
                    <td className="px-4 py-3 font-bold">{total}</td>
                    <td className="px-4 py-3"><span className="bg-green-100 text-green-700 rounded px-2 py-1 font-bold">{toGrade(total)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ResultPanel;