import { useState, ChangeEvent } from "react";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import {
  parseStudentFile,
  downloadCsvTemplate,
  saveStudentsLocally,
  toFirestoreStudent,
  toFirestoreEnrollment,
  StudentRow,
  StudentImportError,
  StudentImportResult,
} from "../../utils/studentImport";
import { COLLECTION } from "../../constants";
import { db } from "../../firebase/config";

const PREVIEW_ROWS = 5;

// Each student = 2 Firestore writes (students + enrollments).
// 200 x 2 = 400 writes < the 500-write commit limit - optimized batching.
const STUDENTS_PER_BATCH = 200;

interface BulkStudentImportProps {
  onImported?: (students: StudentRow[]) => void;
}

/**
 * Write rows straight to Cloud Firestore using the same documents/timestamps
 * that AddStudent.tsx creates. Both documents get Firestore auto-generated
 * doc ids; the enrollment record links to the student via `studentId`.
 */
async function importStudentsToFirestore(rows: StudentRow[]): Promise<number> {
  let batch = writeBatch(db);
  let queued = 0;
  let imported = 0;
  for (const row of rows) {
    const studentRef = doc(collection(db, COLLECTION.STUDENTS));
    const enrollmentRef = doc(collection(db, COLLECTION.ENROLLMENTS));
    batch.set(studentRef, {
      ...toFirestoreStudent(row),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(enrollmentRef, {
      ...toFirestoreEnrollment(row, studentRef.id),
      status: "active",
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    queued += 1;
    if (queued === STUDENTS_PER_BATCH) {
      await batch.commit();
      imported += queued;
      queued = 0;
      batch = writeBatch(db);
    }
  }
  if (queued > 0) {
    await batch.commit();
    imported += queued;
  }
  return imported;
}

function firestoreErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("permission")) {
      return "You do not have permission to save students. Please login with an admin account.";
    }
    if (lower.includes("token") || lower.includes("session")) {
      return "Your session is invalid or expired. Please logout and login again.";
    }
    return error.message;
  }
  return "Something went wrong while saving to Firestore.";
}

function BulkStudentImport({ onImported }: BulkStudentImportProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [errors, setErrors] = useState<StudentImportError[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
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
      const result: StudentImportResult = await parseStudentFile(file);
      setStudents(result.students);
      setErrors(result.errors);
      setMissingColumns(result.missingRequiredColumns);
      setHeaders(result.headers);
      setFileName(file.name);
    } catch (parseError) {
      setError(
        parseError instanceof Error ? parseError.message : "Could not read the file.",
      );
      setStudents([]);
      setErrors([]);
      setMissingColumns([]);
      setHeaders([]);
      setFileName("");
    } finally {
      e.target.value = "";
    }
  };

const handleImport = async () => {
    if (!students.length) {
      setError("No valid students to import - fix the missing required field(s) shown below first.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const count = await importStudentsToFirestore(students);
      // Mirror locally so the Admit Card / ID card panels can use the rows.
      saveStudentsLocally(students);
      setMessage(`✅ ${count} student(s) uploaded to Cloud Firestore.`);
      onImported?.(students);
    } catch (importError) {
      setError(firestoreErrorMessage(importError));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStudents([]);
    setErrors([]);
    setMissingColumns([]);
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
          Bulk import up to 2000 students at once. Required columns:{" "}
          <span className="font-semibold">
            Name, Enrollment, Class, Session, Mother's Name, Father's Name,
            Gender, Category, Nationality, DOB, Phone, Email
          </span>
          . Use the template for all optional columns.
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
        Flexible column names are accepted (e.g. <em>Name / Student Name / Full Name</em>,
        <em> Enrollment / Roll No / Admission No</em>, <em>Class</em>, <em>Section</em>,
        Father's Name, Mother's Name, DOB, Phone, Email, Address). A single{" "}
        <em>DOB</em> column is automatically split into day / month / year. Extra columns are ignored.
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

      {missingColumns.length > 0 && (
        <p className="mt-4 bg-orange-50 text-orange-800 border border-orange-300 rounded-md px-4 py-2 text-sm font-semibold">
          ⚠️ Required column(s) not found in this file:{" "}
          <span className="font-bold">{missingColumns.join(", ")}</span>. Add these columns -
          otherwise the affected rows are rejected below.
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
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="px-4 py-2">Enrollment</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Class</th>
                <th className="px-4 py-2">Section</th>
                <th className="px-4 py-2">Father's Name</th>
                <th className="px-4 py-2">Mother's Name</th>
                <th className="px-4 py-2">DOB</th>
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
                  <td className="px-4 py-2">{s.motherName || "-"}</td>
                  <td className="px-4 py-2">{s.dob || "-"}</td>
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
            ⚠️ {errors.length} row(s) skipped - missing required field(s) or invalid data:
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