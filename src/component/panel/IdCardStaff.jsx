import React, { useState } from "react";
import IdCardPreview from "./IdCardPreview";
import { DesignPicker, DemoBadge } from "./IdCardControls";
import { DEMO_STAFF } from "./demoData";

function IdCardStaff() {
  const [design, setDesign] = useState("premium");
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [person, setPerson] = useState(null);
  const [error, setError] = useState("");

  const buildPerson = (s) => ({
    id: s.employeeId,
    name: s.name,
    role: "STAFF",
    detailLabel: "Department",
    detail: s.department,
    extraLabel: "Designation",
    extra: s.designation,
    validTill: s.validTill,
    isDemo: true,
  });

  const handleGenerate = (e) => {
    e.preventDefault();
    setError("");
    const found = DEMO_STAFF.find((d) => d.id === selectedDemoId);
    if (found) {
      setPerson(buildPerson(found));
    } else {
      setError("Select a demo staff member first.");
      setPerson(null);
    }
  };

  const quickDemo = (id) => {
    const f = DEMO_STAFF.find((d) => d.id === id);
    if (f) setPerson(buildPerson(f));
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
        Staff ID Card <DemoBadge />
      </h2>
      <p className="text-gray-600 mt-1 mb-6">
        Premium design by default — demo data is frontend-only.
      </p>

      <DesignPicker value={design} onChange={setDesign} />

      <form onSubmit={handleGenerate} className="mb-4 flex flex-col sm:flex-row gap-3 max-w-md">
        <select
          value={selectedDemoId}
          onChange={(e) => setSelectedDemoId(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Select demo staff</option>
          {DEMO_STAFF.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.department})
            </option>
          ))}
        </select>
        <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-md px-6 py-2 text-sm transition-colors">
          Generate
        </button>
      </form>

      <div className="mb-5 flex flex-wrap gap-2 max-w-xl">
        {DEMO_STAFF.map((s) => (
          <button
            key={s.id}
            onClick={() => quickDemo(s.id)}
            className="text-xs font-semibold bg-teal-50 border border-teal-300 text-teal-800 rounded-full px-3 py-1 hover:bg-teal-100 transition-colors"
          >
            {s.name}
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

export default IdCardStaff;