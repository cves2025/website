import { useEffect, useMemo, useRef, useState } from "react";
import { deleteField, doc, setDoc, type FieldValue } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../../../../../firebase/config";
// TODO: set the correct import path for these constants
import { COLLECTION, PRE_DEFINED_DOC_ID } from "../../../../../constants";
import Button from "../../../../../custom-components/Button";
import DatePicker from "../../../../../custom-components/DatePicker";
import Modal from "../../../../../custom-components/Modal";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button as UIButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // Remark row waiting for the "remove this range?" confirmation.
  const [rowToRemove, setRowToRemove] = useState<RemarkRow | null>(null);

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

  // True once the valid From-To ranges cover every percentage from 0 to 100,
  // so no further range can be added ("Add Range" is hidden).
  const coversFullScale = (() => {
    const covered = new Array<boolean>(101).fill(false);
    for (const r of rows) {
      if (r.from.trim() === "" || r.to.trim() === "") continue;
      const from = Number(r.from);
      const to = Number(r.to);
      if (!Number.isInteger(from) || !Number.isInteger(to)) continue;
      if (from < 0 || to > 100 || from > to) continue;
      for (let p = from; p <= to; p++) covered[p] = true;
    }
    return covered.every(Boolean);
  })();

  const filledRows = () =>
    rows.filter(
      (r) => r.from.trim() !== "" || r.to.trim() !== "" || r.remark.trim() !== "",
    );

  // Remarks as (from, to, remark) sorted by From, so the form and the saved
  // value compare equal regardless of row order or whitespace.
  const formRangesSignature = JSON.stringify(
    filledRows()
      .map((r) => [Number(r.from), Number(r.to), r.remark.trim()] as const)
      .sort((a, b) => a[0] - b[0]),
  );
  const savedRangesSignature = (id: string) =>
    JSON.stringify(
      (savedRemarks[id]?.ranges ?? [])
        .map((r) => [r.from, r.to, r.remark] as const)
        .sort((a, b) => a[0] - b[0]),
    );

  // "Update" stays disabled until the form differs from what is saved. With
  // several exams whose saved data differ, saving always changes something.
  const isDirty =
    !hasSavedForSelection ||
    mismatch ||
    formRangesSignature !== savedRangesSignature(validExamIds[0]) ||
    date !== (savedDates[validExamIds[0]]?.date ?? "");

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
      setConfirmDeleteOpen(false);
      toast.success("Saved settings deleted successfully.");
    } catch {
      toast.error("Failed to delete. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Overrides for the shadcn Input of a remark row (red when the row is invalid).
  const inputClass = (id: string) =>
    cn(
      "h-auto bg-white py-2 text-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/50 md:text-sm",
      errorIds.includes(id) ? "border-red-500 bg-red-50" : "border-gray-300",
    );

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
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              isOpen ? "rotate-180" : "rotate-0",
            )}
          />
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
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      placeholder="From"
                      value={r.from}
                      onChange={(e) => updateRow(r.id, "from", e.target.value)}
                      className={inputClass(r.id)}
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      placeholder="To"
                      value={r.to}
                      onChange={(e) => updateRow(r.id, "to", e.target.value)}
                      className={inputClass(r.id)}
                    />
                    <Input
                      type="text"
                      maxLength={200}
                      placeholder="e.g. Excellent performance. Keep it up!"
                      value={r.remark}
                      onChange={(e) => updateRow(r.id, "remark", e.target.value)}
                      className={`col-span-2 md:col-span-1 ${inputClass(r.id)}`}
                    />
                    <UIButton
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={() => setRowToRemove(r)}
                      title="Remove"
                      aria-label="Remove this range"
                      className="col-span-2 h-8 w-8 justify-self-end bg-red-600 text-white hover:bg-red-700 md:col-span-1 md:justify-self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </UIButton>
                  </div>
                ))}

                {coversFullScale ? (
                  <p className="text-xs font-medium text-green-700">
                    All percentages from 0 to 100 are covered.
                  </p>
                ) : (
                  <UIButton
                    type="button"
                    variant="outline"
                    onClick={addRow}
                    className="w-fit border-dashed border-primaryPink text-primaryPink hover:bg-pink-50 hover:text-primaryPink"
                  >
                    <Plus className="h-4 w-4" /> Add Range
                  </UIButton>
                )}
              </div>

              {/* Distribution date */}
              <div className="flex flex-col gap-1 border-t border-gray-200 pt-4">
                <Label
                  htmlFor="distribution-date"
                  className="font-semibold text-gray-800"
                >
                  Report Card Distribution Date{" "}
                  <span className="font-normal text-gray-500">(optional)</span>
                </Label>
                <DatePicker
                  id="distribution-date"
                  value={date}
                  onChange={(value) => {
                    setDate(value);
                    setDateInvalid(false);
                  }}
                  aria-invalid={dateInvalid}
                  className={cn(
                    "md:w-60",
                    dateInvalid && "border-red-500 bg-red-50 hover:bg-red-50",
                  )}
                />
                <p className="text-xs text-gray-500">
                  Shown as the date on the result card. If it is empty, today's date is shown.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {hasSavedForSelection && (
                  <UIButton
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={saving}
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Saved
                  </UIButton>
                )}
                <Button
                  buttonName={saving ? "Saving..." : hasSavedForSelection ? "Update" : "Save"}
                  variant="success"
                  size="md"
                  buttonStyle="rounded-md"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  title={
                    isDirty ? undefined : "Change the remarks or date to update"
                  }
                />
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete Saved Settings"
        description={`Delete the saved remarks and distribution date of the ${
          validExamIds.length > 1
            ? `${validExamIds.length} selected exams`
            : "selected exam"
        }? This cannot be undone.`}
        submitText="Delete"
        submitClassName="bg-red-600 hover:bg-red-700"
        loading={saving}
        onSubmit={() => void handleClearSaved()}
      />

      <Modal
        isOpen={rowToRemove !== null}
        onClose={() => setRowToRemove(null)}
        title="Remove Remark Range"
        description={
          rowToRemove &&
          (rowToRemove.from.trim() || rowToRemove.to.trim())
            ? `Remove the range ${rowToRemove.from.trim() || "?"}% - ${
                rowToRemove.to.trim() || "?"
              }%${
                rowToRemove.remark.trim()
                  ? ` ("${rowToRemove.remark.trim()}")`
                  : ""
              }? It is removed from the form; click Save / Update to apply it.`
            : "Remove this empty range from the form?"
        }
        submitText="Remove"
        submitClassName="bg-red-600 hover:bg-red-700"
        onSubmit={() => {
          if (rowToRemove) removeRow(rowToRemove.id);
          setRowToRemove(null);
        }}
      />
    </div>
  );
}

export default ResultCardSettings;