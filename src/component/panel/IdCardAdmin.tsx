import { useState, FormEvent } from "react";
import IdCardPreview, { IdCardPerson } from "./IdCardPreview";
import { DesignPicker, DemoBadge } from "./IdCardControls";
import { DEMO_ADMINS, DemoTeamMember } from "./demoData";

function IdCardAdmin() {
  const [design, setDesign] = useState("vibrant");
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [person, setPerson] = useState<IdCardPerson | null>(null);
  const [error, setError] = useState("");

  const buildPerson = (a: DemoTeamMember): IdCardPerson => ({
    id: a.employeeId,
    name: a.name,
    role: "ADMIN",
    detailLabel: "Designation",
    detail: a.designation,
    extraLabel: "Email",
    extra: a.email,
    validTill: a.validTill,
    isDemo: true,
  });

  const handleGenerate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const found = DEMO_ADMINS.find((d) => d.id === selectedDemoId);
    if (found) {
      setPerson(buildPerson(found));
    } else {
      setError("Select a demo admin first.");
      setPerson(null);
    }
  };

  const quickDemo = (id: string) => {
    const f = DEMO_ADMINS.find((d) => d.id === id);
    if (f) setPerson(buildPerson(f));
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
        Admin ID Card <DemoBadge />
      </h2>
      <p className="text-gray-600 mt-1 mb-6">
        Vibrant design by default — demo data is frontend-only.
      </p>

      <DesignPicker value={design} onChange={setDesign} />

      <form onSubmit={handleGenerate} className="mb-4 flex flex-col sm:flex-row gap-3 max-w-md">
        <select
          value={selectedDemoId}
          onChange={(e) => setSelectedDemoId(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Select demo admin</option>
          {DEMO_ADMINS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.designation})
            </option>
          ))}
        </select>
        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md px-6 py-2 text-sm transition-colors">
          Generate
        </button>
      </form>

      <div className="mb-5 flex flex-wrap gap-2 max-w-xl">
        {DEMO_ADMINS.map((a) => (
          <button
            key={a.id}
            onClick={() => quickDemo(a.id)}
            className="text-xs font-semibold bg-purple-50 border border-purple-300 text-purple-800 rounded-full px-3 py-1 hover:bg-purple-100 transition-colors"
          >
            {a.name}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 bg-red-100 text-red-700 border border-red-300 rounded-md px-4 py-2 font-semibold max-w-md">
          {error}
        </p>
      )}

      {person && (
        <div className="relative">
          <p className="mb-2 inline-block text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-3 py-1">
            Demo card — frontend only
          </p>
          <IdCardPreview person={person} design={design} />
        </div>
      )}
    </div>
  );
}

export default IdCardAdmin;