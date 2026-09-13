import { useState, FormEvent } from "react";
import IdCardPreview, { IdCardPerson } from "./IdCardPreview";
import { DesignPicker, DemoBadge } from "./IdCardControls";
import { DEMO_TEACHERS } from "./demoData";

/** Shape of a stored/demo teacher row read from localStorage. */
interface TeacherSource {
  id: number | string;
  employeeId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  subject?: string;
  qualification?: string;
  validTill?: string;
}

function IdCardTeachers() {
  const [teachers] = useState<TeacherSource[]>(() =>
    JSON.parse(localStorage.getItem("cves_teachers") || "[]")
  );
  const [design, setDesign] = useState("modern");
  const [source, setSource] = useState("demo");
  const [selectedId, setSelectedId] = useState("");
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [person, setPerson] = useState<IdCardPerson | null>(null);

  const buildPerson = (t: TeacherSource, isDemoRow = false): IdCardPerson => ({
    id: t.employeeId || `TCH-${String(t.id).slice(-6)}`,
    name: t.name || `${t.firstName} ${t.lastName}`.trim() || "Teacher",
    role: "TEACHER",
    detailLabel: "Subject",
    detail: t.subject || "-",
    extraLabel: "Qualification",
    extra: t.qualification || "-",
    validTill: t.validTill || "31 Mar 2027",
    isDemo: isDemoRow,
  });

  const handleGenerate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (source === "demo") {
      const found = DEMO_TEACHERS.find((d) => d.id === selectedDemoId);
      setPerson(found ? buildPerson(found, true) : null);
      return;
    }
    const found = teachers.find((t) => String(t.id) === selectedId);
    setPerson(found ? buildPerson(found) : null);
  };

  const quickDemo = (id: string) => {
    const f = DEMO_TEACHERS.find((d) => d.id === id);
    if (f) setPerson(buildPerson(f, true));
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
        Teacher ID Card <DemoBadge />
      </h2>
      <p className="text-gray-600 mt-1 mb-6">
        Pick a design and generate a card — demo data is frontend-only.
      </p>

      <DesignPicker value={design} onChange={setDesign} />

      <div className="mb-4 inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => { setSource("real"); setPerson(null); }}
          className={`px-4 py-1.5 text-sm font-bold transition-colors ${
            source === "real" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Added Teachers ({teachers.length})
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
        teachers.length === 0 ? (
          <div className="mb-6 max-w-xl bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-6 text-center text-gray-500 font-semibold">
            No teachers added yet. Try the demo data instead.
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="mb-6 flex flex-col sm:flex-row gap-3 max-w-md">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select teacher</option>
              {teachers.map((t, i) => (
                <option key={t.id || i} value={t.id}>
                  {t.firstName} {t.lastName} {t.subject ? `(${t.subject})` : ""}
                </option>
              ))}
            </select>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-6 py-2 text-sm transition-colors">
              Generate
            </button>
          </form>
        )
      ) : (
        <>
          <form onSubmit={handleGenerate} className="mb-4 flex flex-col sm:flex-row gap-3 max-w-md">
            <select
              value={selectedDemoId}
              onChange={(e) => setSelectedDemoId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select demo teacher</option>
              {DEMO_TEACHERS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.subject})
                </option>
              ))}
            </select>
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-md px-6 py-2 text-sm transition-colors">
              Generate
            </button>
          </form>
          <div className="mb-5 flex flex-wrap gap-2 max-w-xl">
            {DEMO_TEACHERS.map((t) => (
              <button
                key={t.id}
                onClick={() => quickDemo(t.id)}
                className="text-xs font-semibold bg-blue-50 border border-blue-300 text-blue-800 rounded-full px-3 py-1 hover:bg-blue-100 transition-colors"
              >
                {t.name}
              </button>
            ))}
          </div>
        </>
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

export default IdCardTeachers;