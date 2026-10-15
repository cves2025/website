import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../../firebase/config";
import Button from "../../../../../custom-components/Button";
import SearchableMultiSelect, { SearchableOption } from "../../../../../custom-components/SearchableMultiSelect";
import { useAdmitCardGenerator } from "../../useAdmitCardGenerator";

type RemarkRange = {
  id: string;
  from: string;
  to: string;
  remark: string;
};

const newRow = (): RemarkRange => ({
  id: crypto.randomUUID(),
  from: "",
  to: "",
  remark: "",
});

function SuggestedRemarks() {
  const [rows, setRows] = useState<RemarkRange[]>([newRow()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [examIds, setExamIds] = useState<string[]>([]);

  const gen = useAdmitCardGenerator({});

const examOptions: SearchableOption[] = gen.yearExams
    .filter(
      (exam) =>
        !gen.selectedClass ||
        exam.applicableClasses.length === 0 ||
        exam.applicableClasses.includes(gen.selectedClass)
    )
    .map((exam) => ({
      value: exam.id,
      label: exam.examName,
      hint: exam.academicYear,
    }));

    const validExamIds = examIds.filter((id) =>
    examOptions.some((option) => option.value === id)
  );

  useEffect(() => {
    if (!exam) {
      setRows([newRow()]);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const snap = await getDoc(doc(db, "suggestedRemarks", exam));
        const saved = snap.exists()
          ? (snap.data().ranges as RemarkRange[])
          : [];
        setRows(saved.length ? saved : [newRow()]);
      } catch {
        setError("Saved remarks load nahi ho paye.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [exam]);

  const updateRow = (id: string, field: keyof RemarkRange, value: string) => {
    setSuccess("");
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = (id: string) =>
    setRows((prev) =>
      prev.length === 1 ? [newRow()] : prev.filter((r) => r.id !== id),
    );

  const validate = (): string => {
    if (!exam) return "Pehle exam select karein.";
    const filled = rows.filter(
      (r) => r.from !== "" || r.to !== "" || r.remark.trim() !== "",
    );
    if (!filled.length) return "Kam se kam ek remark add karein.";

    for (const r of filled) {
      const from = Number(r.from);
      const to = Number(r.to);
      if (r.from === "" || r.to === "" || !r.remark.trim()) {
        return "Har row mein From, To aur Remark bharna zaroori hai.";
      }
      if (from < 0 || to > 100)
        return "Percentage 0 se 100 ke beech hona chahiye.";
      if (from > to) return "'From' percentage 'To' se bada nahi ho sakta.";
    }

    // Overlap check
    const sorted = [...filled].sort((a, b) => Number(a.from) - Number(b.from));
    for (let i = 1; i < sorted.length; i++) {
      if (Number(sorted[i].from) <= Number(sorted[i - 1].to)) {
        return `Ranges overlap ho rahi hain: ${sorted[i - 1].from}-${sorted[i - 1].to} aur ${sorted[i].from}-${sorted[i].to}.`;
      }
    }
    return "";
  };

  const handleSave = async () => {
    setSuccess("");
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const cleaned = rows
        .filter((r) => r.from !== "" && r.to !== "" && r.remark.trim() !== "")
        .map((r) => ({
          id: r.id,
          from: String(Number(r.from)),
          to: String(Number(r.to)),
          remark: r.remark.trim(),
        }))
        .sort((a, b) => Number(a.from) - Number(b.from));

      await setDoc(doc(db, "suggestedRemarks", exam), {
        exam,
        ranges: cleaned,
        updatedAt: new Date().toISOString(),
      });
      setRows(cleaned);
      setSuccess("Suggested remarks save ho gaye.");
    } catch {
      setError("Save nahi ho paya. Dobara try karein.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <div className="rounded-md border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-bold tracking-tight text-primaryBlue sm:text-2xl">
          Suggested Remarks
        </h1>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Exam
        </label>
        <SearchableMultiSelect
          label="Exams"
          required
          options={examOptions}
          values={validExamIds}
          onChange={setExamIds}
          placeholder="Select one or more exams"
          searchPlaceholder="Search exam..."
          emptyMessage="No exam found for this year and class"
          maxChips={2}
        />
      </div>

      {exam && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="hidden grid-cols-[110px_110px_1fr_40px] gap-3 text-xs font-semibold uppercase text-gray-500 md:grid">
                <span>From %</span>
                <span>To %</span>
                <span>Suggested Remark</span>
                <span />
              </div>

              {rows.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-2 items-start gap-3 md:grid-cols-[110px_110px_1fr_40px]"
                >
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="From"
                    value={r.from}
                    onChange={(e) => updateRow(r.id, "from", e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="To"
                    value={r.to}
                    onChange={(e) => updateRow(r.id, "to", e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <textarea
                    rows={2}
                    placeholder="e.g. Excellent performance. Keep it up!"
                    value={r.remark}
                    onChange={(e) => updateRow(r.id, "remark", e.target.value)}
                    className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 md:col-span-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="col-span-2 rounded-md px-2 py-2 text-sm text-red-500 hover:bg-red-50 md:col-span-1"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addRow}
                className="w-fit rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                + Add Range
              </button>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              <div className="flex justify-end">
                <Button
                  buttonName={saving ? "Saving..." : "Save"}
                  variant="success"
                  size="md"
                  buttonStyle="rounded-md"
                  onClick={handleSave}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SuggestedRemarks;
