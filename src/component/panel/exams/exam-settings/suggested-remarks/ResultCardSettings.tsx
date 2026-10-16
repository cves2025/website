import { useEffect, useMemo, useRef, useState } from "react";
import { deleteField, doc, setDoc, type FieldValue } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../../../../../firebase/config";
// TODO: set the correct import path for these constants
import { COLLECTION, PRE_DEFINED_DOC_ID } from "../../../../../constants";
import Button from "../../../../../custom-components/Button";
import SearchableMultiSelect, {
  SearchableOption,
} from "../../../../../custom-components/SearchableMultiSelect";
import {
  formatDistributionDate,
  useSuggestedRemarks,
} from "../../../../../hooks/useSuggestedRemarks";
import type {
  RemarkRow,
  SavedDistributionDate,
  SavedExamRemarks,
  SavedRange,
} from "../../../../../utils/type";
import { useAdmitCardGenerator } from "../../useAdmitCardGenerator";

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

function ResultCardSettings() {
  const [isOpen, setIsOpen] = useState(true);
  const [examIds, setExamIds] = useState<string[]>([]);
  const [rows, setRows] = useState<RemarkRow[]>([newRow()]);
  const [date, setDate] = useState("");
  const [errorIds, setErrorIds] = useState<string[]>([]);
  const [dateInvalid, setDateInvalid] = useState(false);
  const [saving, setSaving] = useState(false);

  // Makes sure the auto-select on first load runs only once
  const hasAutoSelected = useRef(false);

  const gen = useAdmitCardGenerator({});
  const { savedRemarks, savedDates, loading, error } = useSuggestedRemarks();

  const settingsRef = useMemo(
    () => doc(db, COLLECTION.PANEL_SETTINGS, PRE_DEFINED_DOC_ID.SUGGESTED_REMARKS),
    [],
  );

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const examOptions: SearchableOption[] = gen.yearExams
    .filter(
      (exam) =>
        !gen.selectedClass ||
        exam.applicableClasses.length === 0 ||
        exam.applicableClasses.includes(gen.selectedClass),
    )
    .map((exam) => {
      const count = savedRemarks[exam.id]?.ranges?.length ?? 0;
      const savedDate = formatDistributionDate(savedDates[exam.id]?.date);
      const status = [
        count > 0 ? `✓ ${count} remark${count > 1 ? "s" : ""}` : "",
        savedDate ? `✓ ${savedDate}` : "",
      ]
        .filter(Boolean)
        .join(" • ");
      return {
        value: exam.id,
        label: exam.examName,
        hint: `${exam.academicYear} • ${status || "Not added"}`,
      };
    });

  const validExamIds = examIds.filter((id) =>
    examOptions.some((option) => option.value === id),
  );
  const examKey = validExamIds.join(",");

  // One string that describes everything saved for an exam (remarks + date)
  const examSignature = (id: string) =>
    `${signature(savedRemarks[id]?.ranges)}|${savedDates[id]?.date ?? ""}`;

  const hasSavedData = (id: string) =>
    (savedRemarks[id]?.ranges?.length ?? 0) > 0 || Boolean(savedDates[id]?.date);

  // On first load, auto-select exams that already have saved data.
  // Only exams sharing the same saved data as the first one are selected,
  // so the mismatch warning does not appear on load.
  useEffect(() => {
    if (hasAutoSelected.current || loading || examOptions.length === 0) return;
    hasAutoSelected.current = true;

    const savedOptions = examOptions.filter((option) => hasSavedData(option.value));
    if (!savedOptions.length) return;

    const firstSignature = examSignature(savedOptions[0].value);
    setExamIds(
      savedOptions
        .filter((option) => examSignature(option.value) === firstSignature)
        .map((option) => option.value),
    );
  }, [loading, examOptions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the saved data of the first selected exam into the form
  useEffect(() => {
    setErrorIds([]);
    setDateInvalid(false);
    if (!validExamIds.length) {
      setRows([newRow()]);
      setDate("");
      return;
    }
    const first = validExamIds[0];
    setRows(toRows(savedRemarks[first]?.ranges));
    setDate(savedDates[first]?.date ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examKey, loading]);

  // True when the selected exams have different saved remarks or dates
  const mismatch =
    validExamIds.length > 1 &&
    validExamIds.some((id) => examSignature(id) !== examSignature(validExamIds[0]));

  const hasSavedForSelection = validExamIds.some(hasSavedData);

  const updateRow = (id: string, field: keyof RemarkRow, value: string) => {
    setErrorIds((prev) => prev.filter((x) => x !== id));
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = (id: string) =>
    setRows((prev) =>
      prev.length === 1 ? [newRow()] : prev.filter((r) => r.id !== id),
    );

  const filledRows = () =>
    rows.filter(
      (r) => r.from.trim() !== "" || r.to.trim() !== "" || r.remark.trim() !== "",
    );

  const validate = (): { message: string; ids: string[]; badDate: boolean } => {
    if (!validExamIds.length) {
      return { message: "Please select at least one exam.", ids: [], badDate: false };
    }

    const filled = filledRows();

    // 1) Date (optional, but must be valid when entered)
    if (date) {
      const [year, month, day] = date.split("-").map(Number);
      const parsed = new Date(year, month - 1, day);
      const isRealDate =
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day;
      if (!isRealDate) {
        return { message: "Distribution date is not valid.", ids: [], badDate: true };
      }
      if (year < 2000 || year > 2100) {
        return { message: "Year must be between 2000 and 2100.", ids: [], badDate: true };
      }
    }

    // 2) At least one of remarks or date is required
    if (!filled.length && !date) {
      return {
        message: "Add at least one remark or a distribution date.",
        ids: [],
        badDate: false,
      };
    }

    // 3) Per-row checks
    for (const r of filled) {
      if (r.from.trim() === "" || r.to.trim() === "" || !r.remark.trim()) {
        return {
          message: "From, To and Remark are required in every row.",
          ids: [r.id],
          badDate: false,
        };
      }
      const from = Number(r.from);
      const to = Number(r.to);
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        return { message: "From and To must be whole numbers.", ids: [r.id], badDate: false };
      }
      if (from < 0 || to < 0 || from > 100 || to > 100) {
        return {
          message: "Percentage must be between 0 and 100.",
          ids: [r.id],
          badDate: false,
        };
      }
      if (from > to) {
        return {
          message: `'From' (${from}) cannot be greater than 'To' (${to}).`,
          ids: [r.id],
          badDate: false,
        };
      }
    }

    // 4) Duplicate ranges (same From and To)
    const seen = new Map<string, string>();
    for (const r of filled) {
      const key = `${Number(r.from)}-${Number(r.to)}`;
      if (seen.has(key)) {
        return {
          message: `Duplicate range: ${Number(r.from)}% - ${Number(r.to)}% is added more than once.`,
          ids: [seen.get(key)!, r.id],
          badDate: false,
        };
      }
      seen.set(key, r.id);
    }

    // 5) Overlapping ranges
    const sorted = [...filled].sort((a, b) => Number(a.from) - Number(b.from));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (Number(curr.from) <= Number(prev.to)) {
        return {
          message: `Ranges overlap: ${Number(prev.from)}-${Number(prev.to)} and ${Number(curr.from)}-${Number(curr.to)}.`,
          ids: [prev.id, curr.id],
          badDate: false,
        };
      }
    }

    return { message: "", ids: [], badDate: false };
  };

  const handleSave = async () => {
    const { message, ids, badDate } = validate();
    if (message) {
      setErrorIds(ids);
      setDateInvalid(badDate);
      toast.error(message);
      return;
    }
    setErrorIds([]);
    setDateInvalid(false);
    setSaving(true);
    try {
      const ranges: SavedRange[] = filledRows()
        .map((r) => ({
          id: r.id,
          from: Number(r.from),
          to: Number(r.to),
          remark: r.remark.trim(),
        }))
        .sort((a, b) => a.from - b.from);

      const updatedAt = new Date().toISOString();
      const remarksByExam: Record<string, SavedExamRemarks | FieldValue> = {};
      const dateByExam: Record<string, SavedDistributionDate | FieldValue> = {};

      // The form is the source of truth: an empty remarks list or an empty date
      // removes the saved value of the selected exams.
      validExamIds.forEach((id) => {
        const examName = examOptions.find((o) => o.value === id)?.label ?? "";
        remarksByExam[id] = ranges.length ? { examName, ranges, updatedAt } : deleteField();
        dateByExam[id] = date ? { examName, date, updatedAt } : deleteField();
      });

      // merge: true updates only the selected exams and keeps the others untouched
      await setDoc(settingsRef, { remarksByExam, dateByExam }, { merge: true });

      setRows(toRows(ranges));
      toast.success(
        hasSavedForSelection
          ? "Result card settings updated successfully."
          : "Result card settings saved successfully.",
      );
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearSaved = async () => {
    if (!hasSavedForSelection) return;
    if (
      !window.confirm(
        "Delete the saved remarks and distribution date of the selected exams?",
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const remarksByExam: Record<string, FieldValue> = {};
      const dateByExam: Record<string, FieldValue> = {};
      validExamIds.forEach((id) => {
        remarksByExam[id] = deleteField();
        dateByExam[id] = deleteField();
      });
      await setDoc(settingsRef, { remarksByExam, dateByExam }, { merge: true });
      setRows([newRow()]);
      setDate("");
      toast.success("Saved settings deleted successfully.");
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
          Result Card Settings
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

          {loading && validExamIds.length > 0 && (
            <p className="text-sm text-gray-500">Loading...</p>
          )}

          {!loading && validExamIds.length > 0 && (
            <div className="flex flex-col gap-4">
              {validExamIds.length > 1 && (
                <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  These settings will apply to all {validExamIds.length} selected exams.
                </p>
              )}
              {mismatch && (
                <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                  The selected exams have different saved remarks or dates. The values of the
                  first selected exam are shown below, and saving will replace those of all
                  selected exams.
                </p>
              )}

              {/* Suggested remarks */}
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-gray-800">Suggested Remarks</h2>

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
              </div>

              {/* Distribution date */}
              <div className="flex flex-col gap-1 border-t border-gray-200 pt-4">
                <label
                  htmlFor="distribution-date"
                  className="text-sm font-semibold text-gray-800"
                >
                  Report Card Distribution Date{" "}
                  <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  id="distribution-date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setDateInvalid(false);
                  }}
                  className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-blue-500 md:w-60 ${
                    dateInvalid ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                />
                <p className="text-xs text-gray-500">
                  Shown as the date on the result card. If it is empty, today's date is shown.
                </p>
              </div>

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
                  buttonName={saving ? "Saving..." : hasSavedForSelection ? "Update" : "Save"}
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

export default ResultCardSettings;