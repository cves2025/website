import { useEffect, useMemo, useState, useRef } from "react";
import { doc, onSnapshot, setDoc, deleteField } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../../../../../firebase/config";
import { COLLECTION, PRE_DEFINED_DOC_ID } from "../../../../../constants";
import Button from "../../../../../custom-components/Button";
import SearchableMultiSelect, {
  SearchableOption,
} from "../../../../../custom-components/SearchableMultiSelect";
import { useAdmitCardGenerator } from "../../useAdmitCardGenerator";
import { RemarkRow, SavedMap, SavedRange } from "../../../../../utils/type";

const newRow = (): RemarkRow => ({
  id: crypto.randomUUID(),
  from: "",
  to: "",
  remark: "",
});

const toRows = (ranges: SavedRange[] | undefined): RemarkRow[] =>
  ranges?.length
    ? ranges.map((r) => ({
        id: r.id,
        from: String(r.from),
        to: String(r.to),
        remark: r.remark,
      }))
    : [newRow()];

const signature = (ranges: SavedRange[] | undefined) =>
  JSON.stringify((ranges ?? []).map((r) => [r.from, r.to, r.remark]));

// Returns the uncovered parts of 0-100 as readable strings, e.g. ["51-59", "91-100"]
const findGaps = (ranges: { from: number; to: number }[]): string[] => {
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const gaps: string[] = [];
  let nextExpected = 0;

  for (const r of sorted) {
    if (r.from > nextExpected) {
      gaps.push(
        r.from - 1 === nextExpected
          ? `${nextExpected}`
          : `${nextExpected}-${r.from - 1}`,
      );
    }
    nextExpected = Math.max(nextExpected, r.to + 1);
  }

  if (nextExpected <= 100) {
    gaps.push(nextExpected === 100 ? "100" : `${nextExpected}-100`);
  }
  return gaps;
};

function SuggestedRemarks() {
  const [isOpen, setIsOpen] = useState(true);
  const [saved, setSaved] = useState<SavedMap>({});
  const [loaded, setLoaded] = useState(false);
  const [examIds, setExamIds] = useState<string[]>([]);
  const [rows, setRows] = useState<RemarkRow[]>([newRow()]);
  const [errorIds, setErrorIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const hasAutoSelected = useRef(false);

  const gen = useAdmitCardGenerator({});

  const settingsRef = useMemo(
    () =>
      doc(db, COLLECTION.PANEL_SETTINGS, PRE_DEFINED_DOC_ID.SUGGESTED_REMARKS),
    [],
  );

  // Listen to saved remarks live so the exam dropdown can show each exam's status
  useEffect(() => {
    const unsub = onSnapshot(
      settingsRef,
      (snap) => {
        setSaved(
          snap.exists() ? ((snap.data().remarksByExam as SavedMap) ?? {}) : {},
        );
        setLoaded(true);
      },
      () => {
        toast.error("Failed to load saved remarks.");
        setLoaded(true);
      },
    );
    return unsub;
  }, [settingsRef]);

  const examOptions: SearchableOption[] = gen.yearExams
    .filter(
      (exam) =>
        !gen.selectedClass ||
        exam.applicableClasses.length === 0 ||
        exam.applicableClasses.includes(gen.selectedClass),
    )
    .map((exam) => {
      const count = saved[exam.id]?.ranges?.length ?? 0;
      return {
        value: exam.id,
        label: exam.examName,
        hint: `${exam.academicYear} • ${
          count > 0
            ? `✓ ${count} remark${count > 1 ? "s" : ""} saved`
            : "Not added"
        }`,
      };
    });

  const validExamIds = examIds.filter((id) =>
    examOptions.some((option) => option.value === id),
  );
  const examKey = validExamIds.join(",");

useEffect(() => {
  if (hasAutoSelected.current || !loaded || examOptions.length === 0) return;
  hasAutoSelected.current = true;

  const savedOptions = examOptions.filter(
    (option) => (saved[option.value]?.ranges?.length ?? 0) > 0,
  );
  if (!savedOptions.length) return;

  const firstSignature = signature(saved[savedOptions[0].value]?.ranges);
  setExamIds(
    savedOptions
      .filter((option) => signature(saved[option.value]?.ranges) === firstSignature)
      .map((option) => option.value),
  );
}, [loaded, examOptions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load rows when the exam selection changes or when the saved data first arrives
  useEffect(() => {
    setErrorIds([]);
    if (!validExamIds.length) {
      setRows([newRow()]);
      return;
    }
    setRows(toRows(saved[validExamIds[0]]?.ranges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examKey, loaded]);

  // True when the selected exams have different saved remarks
  const mismatch =
    validExamIds.length > 1 &&
    validExamIds.some(
      (id) =>
        signature(saved[id]?.ranges) !==
        signature(saved[validExamIds[0]]?.ranges),
    );

  const hasSavedForSelection = validExamIds.some(
    (id) => (saved[id]?.ranges?.length ?? 0) > 0,
  );

  const updateRow = (id: string, field: keyof RemarkRow, value: string) => {
    setErrorIds((prev) => prev.filter((x) => x !== id));
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = (id: string) =>
    setRows((prev) =>
      prev.length === 1 ? [newRow()] : prev.filter((r) => r.id !== id),
    );

  const validate = (): { message: string; ids: string[] } => {
    if (!validExamIds.length)
      return { message: "Please select at least one exam.", ids: [] };

    const filled = rows.filter(
      (r) =>
        r.from.trim() !== "" || r.to.trim() !== "" || r.remark.trim() !== "",
    );
    if (!filled.length)
      return { message: "Please add at least one remark.", ids: [] };

    // 1) Per-row checks
    for (const r of filled) {
      if (r.from.trim() === "" || r.to.trim() === "" || !r.remark.trim()) {
        return {
          message: "From, To and Remark are required in every row.",
          ids: [r.id],
        };
      }
      const from = Number(r.from);
      const to = Number(r.to);
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        return { message: "From and To must be whole numbers.", ids: [r.id] };
      }
      if (from < 0 || to < 0 || from > 100 || to > 100) {
        return {
          message: "Percentage must be between 0 and 100.",
          ids: [r.id],
        };
      }
      if (from > to) {
        return {
          message: `'From' (${from}) cannot be greater than 'To' (${to}).`,
          ids: [r.id],
        };
      }
    }

    // 2) Duplicate ranges (same From and To)
    const seen = new Map<string, string>();
    for (const r of filled) {
      const key = `${Number(r.from)}-${Number(r.to)}`;
      if (seen.has(key)) {
        return {
          message: `Duplicate range: ${Number(r.from)}% - ${Number(r.to)}% is added more than once.`,
          ids: [seen.get(key)!, r.id],
        };
      }
      seen.set(key, r.id);
    }

    // 3) Overlapping ranges
    const sorted = [...filled].sort((a, b) => Number(a.from) - Number(b.from));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (Number(curr.from) <= Number(prev.to)) {
        return {
          message: `Ranges overlap: ${Number(prev.from)}-${Number(prev.to)} and ${Number(curr.from)}-${Number(curr.to)}.`,
          ids: [prev.id, curr.id],
        };
      }
    }

    return { message: "", ids: [] };
  };

  const handleSave = async () => {
    const { message, ids } = validate();
    if (message) {
      setErrorIds(ids);
      toast.error(message);
      return;
    }
    setErrorIds([]);
    setSaving(true);
    try {
      const ranges: SavedRange[] = rows
        .filter(
          (r) =>
            r.from.trim() !== "" &&
            r.to.trim() !== "" &&
            r.remark.trim() !== "",
        )
        .map((r) => ({
          id: r.id,
          from: Number(r.from),
          to: Number(r.to),
          remark: r.remark.trim(),
        }))
        .sort((a, b) => a.from - b.from);

      const updatedAt = new Date().toISOString();
      const remarksByExam: SavedMap = {};
      validExamIds.forEach((id) => {
        const option = examOptions.find((o) => o.value === id);
        remarksByExam[id] = {
          examName: option?.label ?? "",
          ranges,
          updatedAt,
        };
      });

      // merge: true updates only the selected exams and keeps the others untouched
      await setDoc(settingsRef, { remarksByExam }, { merge: true });

      setRows(toRows(ranges));
      toast.success(
        hasSavedForSelection
          ? "Suggested remarks updated successfully."
          : "Suggested remarks saved successfully.",
      );

      const gaps = findGaps(ranges);
      if (gaps.length > 0) {
        toast(
          `No remark covers: ${gaps.join(", ")}%. Students in these ranges will have no suggested remark.`,
          {
            icon: "⚠️",
            duration: 6000,
          },
        );
      }
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearSaved = async () => {
    if (!hasSavedForSelection) return;
    if (!window.confirm("Delete the saved remarks of the selected exams?"))
      return;
    setSaving(true);
    try {
      const remarksByExam: Record<string, ReturnType<typeof deleteField>> = {};
      validExamIds.forEach((id) => {
        remarksByExam[id] = deleteField();
      });
      await setDoc(settingsRef, { remarksByExam }, { merge: true });
      setRows([newRow()]);
      toast.success("Saved remarks deleted successfully.");
    } catch {
      toast.error("Failed to delete. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (id: string) =>
    `rounded-md border px-3 py-2 text-sm outline-none focus:border-blue-500 ${
      errorIds.includes(id) ? "border-red-500 bg-red-50" : "border-gray-300"
    }`;

  return (
    <div className="mx-auto flex w-full flex-col gap-4 rounded-md border border-gray-200 bg-white p-4">
      {/* Accordion header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="flex cursor-pointer items-center justify-between gap-3"
      >
        <h1 className="text-xl font-bold tracking-tight text-primaryBlue sm:text-2xl">
          Suggested Remarks
        </h1>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          title={isOpen ? "Collapse" : "Expand"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>

      {isOpen && (
        <>
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

          {!loaded && validExamIds.length > 0 && (
            <p className="text-sm text-gray-500">Loading...</p>
          )}

          {loaded && validExamIds.length > 0 && (
            <div className="flex flex-col gap-3">
              {validExamIds.length > 1 && (
                <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  These remarks will apply to all {validExamIds.length} selected
                  exams.
                </p>
              )}
              {mismatch && (
                <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                  The selected exams have different saved remarks. The remarks
                  of the first selected exam are shown below, and saving will
                  replace the remarks of all selected exams with them.
                </p>
              )}

              <div className="hidden grid-cols-[110px_110px_1fr_40px] gap-3 text-xs font-semibold uppercase text-gray-500 md:grid">
                <span>From %</span>
                <span>To %</span>
                <span>Suggested Remark</span>
                <span />
              </div>

              {rows.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-2 items-center gap-3 md:grid-cols-[110px_110px_1fr_40px]"
                >
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="From"
                    value={r.from}
                    onChange={(e) => updateRow(r.id, "from", e.target.value)}
                    className={inputClass(r.id)}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="To"
                    value={r.to}
                    onChange={(e) => updateRow(r.id, "to", e.target.value)}
                    className={inputClass(r.id)}
                  />
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="e.g. Excellent performance. Keep it up!"
                    value={r.remark}
                    onChange={(e) => updateRow(r.id, "remark", e.target.value)}
                    className={`col-span-2 md:col-span-1 ${inputClass(r.id)}`}
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

              <div className="flex flex-wrap justify-end gap-2">
                {hasSavedForSelection && (
                  <button
                    type="button"
                    onClick={handleClearSaved}
                    disabled={saving}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete Saved
                  </button>
                )}
                <Button
                  buttonName={
                    saving
                      ? "Saving..."
                      : hasSavedForSelection
                        ? "Update"
                        : "Save"
                  }
                  variant="success"
                  size="md"
                  buttonStyle="rounded-md"
                  onClick={handleSave}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SuggestedRemarks;
