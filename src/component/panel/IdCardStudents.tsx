import { useState, FormEvent } from "react";
import IdCardPreview, { IdCardPerson } from "./IdCardPreview";
import { DesignPicker, DemoBadge } from "./IdCardControls";
import { DEMO_STUDENTS } from "./demoData";

/** Shape of a stored/demo student row read from localStorage. */
interface StudentSource {
  enrollment: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  className: string;
  section?: string;
  fatherName?: string;
  validTill?: string;
}

function IdCardStudents() {
  const [students] = useState<StudentSource[]>(() =>
    JSON.parse(localStorage.getItem("cves_students") || "[]")
  );
  const [design, setDesign] = useState("classic");
  const [source, setSource] = useState("demo");
  const [enrollmentQuery, setEnrollmentQuery] = useState("");
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [person, setPerson] = useState<IdCardPerson | null>(null);
  const [error, setError] = useState("");

  const buildPerson = (s: StudentSource, isDemoRow = false): IdCardPerson => ({
    id: s.enrollment,
    name: s.name || `${s.firstName} ${s.lastName}`.trim() || "Student",
    role: "STUDENT",
    detailLabel: "Class",
    detail: `${s.className} - ${s.section || "A"}`,
    extraLabel: "Father's Name",
    extra: s.fatherName || "-",
    validTill: s.validTill || "31 Mar 2027",
    isDemo: isDemoRow,
  });

  const handleGenerate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (source === "demo") {
      const found = DEMO_STUDENTS.find((d) => d.id === selectedDemoId);
      if (found) {
        setPerson(buildPerson(found, true));
      } else {
        setError("Select a demo student first.");
        setPerson(null);
      }
      return;
    }
    const query = enrollmentQuery.trim();
    const found = students.find((s) => s.enrollment === query);
    if (found) {
      setPerson(buildPerson(found));
    } else {
      setError(
        students.length
          ? "Student not found with this enrollment number."
          : "No students added yet. Try the demo data below."
      );
      setPerson(null);
    }
  };

  const quickDemo = (demoId: string) => {
    const found = DEMO_STUDENTS.find((d) => d.id === demoId);
    if (found) setPerson(buildPerson(found, true));
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
        Student ID Card <DemoBadge />
      </h2>
      <p className="text-gray-600 mt-1 mb-6">
        Pick a design and generate a card — demo data is frontend-only.
      </p>

      <DesignPicker value={design} onChange={setDesign} />

      {/* Data source tabs */}
      <div className="mb-4 inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => { setSource("real"); setPerson(null); }}
          className={`px-4 py-1.5 text-sm font-bold transition-colors ${
            source === "real" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Added Students ({students.length})
        </button>
        <button
          type="button"
          onClick={() => { setSource("demo"); setPerson(null); }}
          className={`px-4 py-1.5 text-sm font-bold transition-colors ${
            source === "demo" ? "bg-amber-500 text-white" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Demo Data
        </button>
      </div>

      {source === "real" ? (
        <form onSubmit={handleGenerate} className="mb-6 flex flex-col sm:flex-row gap-3 max-w-md">
          <input
            value={enrollmentQuery}
            onChange={(e) => setEnrollmentQuery(e.target.value)}
            placeholder="Enrollment number"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-6 py-2 text-sm transition-colors">
            Generate
          </button>
        </form>
      ) : (
        <form onSubmit={handleGenerate} className="mb-6 flex flex-col sm:flex-row gap-3 max-w-md">
          <select
            value={selectedDemoId}
            onChange={(e) => setSelectedDemoId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select demo student</option>
            {DEMO_STUDENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.enrollment})
              </option>
            ))}
          </select>
          <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-md px-6 py-2 text-sm transition-colors">
            Generate
          </button>
        </form>
      )}

      {/* Quick demo chips */}
      {source === "demo" && (
        <div className="mb-5 flex flex-wrap gap-2 max-w-xl">
          {DEMO_STUDENTS.map((d) => (
            <button
              key={d.id}
              onClick={() => quickDemo(d.id)}
              className="text-xs font-semibold bg-amber-50 border border-amber-300 text-amber-800 rounded-full px-3 py-1 hover:bg-amber-100 transition-colors"
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-4 bg-red-100 text-red-700 border border-red-300 rounded-md px-4 py-2 font-semibold max-w-md">
          {error}
        </p>
      )}

      {person && (
        <div className="relative">
          {person.isDemo && (
            <p className="mb-2 inline-block text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-3 py-1">
              Demo card — frontend only
            </p>
          )}
          <IdCardPreview person={person} design={design} />
        </div>
      )}
    </div>
  );
}

export default IdCardStudents;