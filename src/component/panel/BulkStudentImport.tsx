import { useState, ChangeEvent } from "react";
import {
  parseStudentFile,
  downloadCsvTemplate,
  saveStudentsLocally,
  StudentRow,
  StudentImportError,
} from "../../utils/studentImport";
import { API_BASE_URL, authHeaders } from "../context/api";

const PREVIEW_ROWS = 5;

interface BulkStudentImportProps {
  onImported?: (students: StudentRow[]) => void;
}

function BulkStudentImport({ onImported }: BulkStudentImportProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [errors, setErrors] = useState<StudentImportError[]>([]);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const readFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    try {
      const result = await parseStudentFile(file);
      setStudents(result.students);
      setErrors(result.errors);
      setHeaders(result.headers);
      setFileName(file.name);
    } catch (parseError) {
      setError(
        parseError instanceof Error ? parseError.message : "Could not read the file."
      );
      setStudents([]);
      setErrors([]);
      setFileName("");
    } finally {
      e.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!students.length) {
      setError("No valid students to import.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      // Try to upload to Cloud Firestore via the backend (batch endpoint).
      const response = await fetch(`${API_BASE_URL}/api/students/import`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ students }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `HTTP error ${response.status}`);
      }
      // Mirror locally so the list shows the imported rows immediately.
      saveStudentsLocally(students);
      setMessage(`✅ ${data.imported} student(s) uploaded to Cloud Firestore.`);
    } catch (apiError) {
      // Backend not reachable yet (not hosted) -> keep it local so the app still works.
      const merged = saveStudentsLocally(students);
      console.warn(
        "Firestore import failed, saved locally:",
        apiError instanceof Error ? apiError.message : apiError
      );
      const apiMessage =
        apiError instanceof Error ? apiError.message : "unknown error";
      setMessage(
        `⚠️ Backend not reachable (${apiMessage}). ${students.length} student(s) saved locally for now. They will need re-importing once the backend is live.`
      );
      onImported?.(merged);
      setLoading(false);
      return;
    }
    setLoading(false);
    onImported?.(students);
  };

  const reset = () => {
    setStudents([]);
    setErrors([]);
    setHeaders([]);
    setFileName("");
    setMessage("");
    setError("");
  };

  const inputClass =
    "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      {/* File picker */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
        <p className="text-gray-700 font-semibold mb-1">
          Upload Excel (.xlsx / .xls) or CSV file
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports bulk import of 500 - 1000 students at once. Required columns:{" "}
          <span className="font-semibold">Name, Enrollment, Class</span>.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-5 py-2 text-sm transition-colors">
            Choose File
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={readFile}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-md px-5 py-2 text-sm transition-colors"
          >
            Download CSV Template
          </button>
        </div>
        {fileName && (
          <p className="mt-4 inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-sm font-semibold">
            {fileName}
            <button onClick={reset} className="text-blue-700 hover:text-blue-900 font-bold">
              ✕
            </button>
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Flexible columns are accepted: e.g. <em>Name / Student Name / Full Name</em>,
        <em> Enrollment / Roll No / Admission No</em>, <em>Class</em>, <em>Section</em>,
        Father's Name, Mother's Name, DOB, Phone, Email, Address. Extra columns are ignored.
      </p>

      {error && (
        <p className="mt-4 bg-red-100 text-red-700 border border-red-300 rounded-md px-4 py-2 font-semibold">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 bg-green-100 text-green-700 border border-green-300 rounded-md px-4 py-2 font-semibold break-words">
          {message}
        </p>
      )}

      {/* Preview */}
      {students.length > 0 && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-gray-800">
              Preview — {students.length} valid student(s)
            </h3>
            <button
              onClick={handleImport}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-md px-5 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload to Firestore"}
            </button>
          </div>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="px-4 py-2">Enrollment</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Class</th>
                <th className="px-4 py-2">Section</th>
                <th className="px-4 py-2">Father's Name</th>
                <th className="px-4 py-2">Phone</th>
              </tr>
            </thead>
            <tbody>
              {students.slice(0, PREVIEW_ROWS).map((s, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-semibold">{s.enrollment}</td>
                  <td className="px-4 py-2">{s.firstName} {s.lastName}</td>
                  <td className="px-4 py-2">{s.className}</td>
                  <td className="px-4 py-2">{s.section}</td>
                  <td className="px-4 py-2">{s.fatherName || "-"}</td>
                  <td className="px-4 py-2">{s.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length > PREVIEW_ROWS && (
            <p className="px-4 py-2 text-sm text-gray-500">
              ...and {students.length - PREVIEW_ROWS} more row(s).
            </p>
          )}
        </div>
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          <p className="font-bold text-yellow-800 mb-2">
            ⚠️ {errors.length} row(s) skipped (missing Name / Enrollment / Class):
          </p>
          <div className="max-h-40 overflow-y-auto text-sm">
            {errors.map((err, i) => (
              <p key={i} className="text-yellow-800">
                <span className="font-semibold">Row {err.row}</span> ({err.name} / {err.enrollment}) — {err.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Detected headers hint */}
      {headers.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Columns detected in your file:
          </p>
          <input
            value={headers.join(", ")}
            readOnly
            className={`${inputClass} bg-gray-50 text-sm`}
          />
        </div>
      )}
    </div>
  );
}

export default BulkStudentImport;