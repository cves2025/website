import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Copy, Plus, Trash2 } from "lucide-react";

import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import Loader from "../../../custom-components/Loader";
import Modal from "../../../custom-components/Modal";
import { myContext } from "../../context/MyContextProvider";
import {
  AMOUNT_INPUT_CLASS,
  CLASSES,
  EMPTY_CLASS_FEE,
  SESSION_MONTH_OPTIONS,
} from "../../../constants";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import {
  generateAcademicYears,
  nextAcademicYear,
  previousAcademicYear,
} from "../../../utils/generateAcademicYears";
import {
  emptyFeeStructure,
  formatRupees,
  monthLabel,
  toAmount,
} from "../../../utils/feeStructure";
import { saveFeeStructure } from "../../../utils/feeService";
import useFeeStructure from "../../../hooks/useFeeStructure";
import type { ClassFee, ExamFeeItem, FeeStructure as Structure } from "../../../utils/type";
import { inputClass, labelClass } from "../attendance/attendanceShared";

// The next session is offered too, so its fees can be set before April.
const currentSessions = generateAcademicYears();
const upcoming = nextAcademicYear(currentSessions[0]?.value ?? "");
const sessions = upcoming
  ? [{ value: upcoming, label: `${upcoming} (next)` }, ...currentSessions]
  : currentSessions;

const sameStructure = (a: Structure, b: Structure) =>
  JSON.stringify([a.classes, a.examFees]) === JSON.stringify([b.classes, b.examFees]);

/**
 * Fees of a session (admin only): admission and monthly fee of every class,
 * and the exam fees - as many as the admin needs, each in its own month
 * with an amount per class. Student fee accounts are built from this.
 */
function FeeStructure() {
  const { user } = useContext(myContext);
  const [session, setSession] = useState(currentSessions[0]?.value ?? "");
  const { structure, loading, error } = useFeeStructure(session);
  const fromSession = previousAcademicYear(session);
  const previous = useFeeStructure(fromSession);
  const [saved, setSaved] = useState<Structure>(() => emptyFeeStructure(session));
  const [draft, setDraft] = useState<Structure>(saved);
  const [saving, setSaving] = useState(false);
  const [pendingSession, setPendingSession] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<ExamFeeItem | null>(null);

  const dirty = !sameStructure(saved, draft);

  // A newly loaded session replaces the page.
  useEffect(() => {
    setSaved(structure);
    setDraft(structure);
  }, [structure]);

  const classFee = (className: string): ClassFee =>
    draft.classes[className] ?? EMPTY_CLASS_FEE;

  const setClassFee = (className: string, field: keyof ClassFee, value: string) =>
    setDraft((prev) => ({
      ...prev,
      classes: {
        ...prev.classes,
        [className]: { ...(prev.classes[className] ?? EMPTY_CLASS_FEE), [field]: toAmount(value) },
      },
    }));

  const updateExamFee = (id: string, patch: Partial<ExamFeeItem>) =>
    setDraft((prev) => ({
      ...prev,
      examFees: prev.examFees.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));

  const addExamFee = () =>
    setDraft((prev) => ({
      ...prev,
      examFees: [
        ...prev.examFees,
        { id: `${Date.now()}`, name: "", month: 9, amounts: {} },
      ],
    }));

  const changeSession = (value: string) => {
    if (value === session) return;
    if (dirty) setPendingSession(value);
    else setSession(value);
  };

  const handleCopy = () => {
    setDraft({
      session,
      classes: previous.structure.classes,
      // New ids, so the copied exam fees are not linked to the old session.
      examFees: previous.structure.examFees.map((item, index) => ({
        ...item,
        id: `${Date.now()}${index}`,
      })),
    });
    setCopyOpen(false);
    toast.success(`Copied from ${fromSession}. Check the amounts and save.`);
  };

  const handleSave = async () => {
    if (!user) return;
    const examFees = draft.examFees.map((item) => ({ ...item, name: item.name.trim() }));
    const unnamed = examFees.findIndex((item) => !item.name);
    if (unnamed !== -1) {
      toast.error(`Enter a name for exam fee ${unnamed + 1}.`);
      document.getElementById(`examFeeName-${examFees[unnamed].id}`)?.focus();
      return;
    }
    const next: Structure = { ...draft, examFees };
    setSaving(true);
    try {
      await saveFeeStructure(next, user.uid);
      setSaved(next);
      setDraft(next);
      toast.success(`Fee structure of ${session} saved.`);
    } catch (cause) {
      console.error("Failed to save fee structure:", cause);
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 pb-20">
      <PageHeader
        title="Fee Structure"
        titleStyle="text-primaryBlue"
        description="Admission fee, monthly fee and exam fees of every class for a session."
        descriptionStyle="text-gray-500"
      />

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-64">
          <label htmlFor="feeSession" className={labelClass}>
            Session
          </label>
          <SelectDropdown
            id="feeSession"
            value={session}
            onValueChange={changeSession}
            options={sessions}
          />
        </div>
        <button
          type="button"
          disabled={loading || saving || previous.loading || !previous.saved}
          title={previous.saved ? undefined : `No fee structure saved for ${fromSession}`}
          onClick={() => setCopyOpen(true)}
          className="flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Copy className="h-4 w-4" />
          Copy from {fromSession}
        </button>
      </div>

      {loading ? (
        <Loader label="Loading fee structure..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <>
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-4">
              <h2 className="font-bold text-gray-800">Class-wise fees</h2>
              <p className="text-sm text-gray-500">
                Admission fee is charged once, when a student is admitted. Monthly
                fee is charged for every month from April to March.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Class</th>
                    <th className="px-4 py-2 font-semibold">Admission Fee (₹)</th>
                    <th className="px-4 py-2 font-semibold">Monthly Fee (₹)</th>
                    <th className="px-4 py-2 text-right font-semibold">Yearly Monthly Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {CLASSES.map((className) => {
                    const fee = classFee(className);
                    return (
                      <tr key={className}>
                        <td className="px-4 py-2 font-semibold text-gray-800">
                          {toOrdinalLabel(className)}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            aria-label={`Admission fee of class ${className}`}
                            className={AMOUNT_INPUT_CLASS}
                            value={fee.admission || ""}
                            placeholder="0"
                            onChange={(event) =>
                              setClassFee(className, "admission", event.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            aria-label={`Monthly fee of class ${className}`}
                            className={AMOUNT_INPUT_CLASS}
                            value={fee.monthly || ""}
                            placeholder="0"
                            onChange={(event) =>
                              setClassFee(className, "monthly", event.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {formatRupees(fee.monthly * 12)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-gray-800">
                  Exam fees ({draft.examFees.length})
                </h2>
                <p className="text-sm text-gray-500">
                  Add each exam fee with the month it is charged in.
                </p>
              </div>
              <button
                type="button"
                onClick={addExamFee}
                className="flex items-center justify-center gap-2 rounded-md bg-cves px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Add Exam Fee
              </button>
            </div>

            {draft.examFees.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No exam fees added yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {draft.examFees.map((item, index) => (
                  <ExamFeeCard
                    key={item.id}
                    item={item}
                    index={index}
                    onChange={(patch) => updateExamFee(item.id, patch)}
                    onDelete={() => setExamToDelete(item)}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        {dirty && <span className="text-sm font-medium text-amber-600">Unsaved changes</span>}
        {dirty && (
          <button
            type="button"
            disabled={saving}
            onClick={() => setDraft(saved)}
            className="rounded-md border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Discard
          </button>
        )}
        <button
          type="button"
          disabled={!dirty || saving || loading}
          onClick={() => void handleSave()}
          className="rounded-md bg-cves px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {saving ? "Saving..." : "Save Fee Structure"}
        </button>
      </div>

      <Modal
        isOpen={pendingSession !== null}
        onClose={() => setPendingSession(null)}
        title="Discard Changes"
        description={`The changes to ${session} are not saved. Open ${pendingSession ?? ""} and discard them?`}
        cancelText="Stay"
        submitText="Discard"
        onSubmit={() => {
          if (pendingSession) setSession(pendingSession);
          setPendingSession(null);
        }}
      />

      <Modal
        isOpen={copyOpen}
        onClose={() => setCopyOpen(false)}
        title="Copy Fee Structure"
        description={`Replace the fees on this page with the fee structure of ${fromSession}? Nothing is saved until you click Save.`}
        cancelText="Cancel"
        submitText="Copy"
        onSubmit={handleCopy}
      />

      <Modal
        isOpen={examToDelete !== null}
        onClose={() => setExamToDelete(null)}
        title="Remove Exam Fee"
        description={`Remove "${examToDelete?.name || "this exam fee"}"? It is removed for good when you click Save.`}
        cancelText="Cancel"
        submitText="Remove"
        submitClassName="bg-cves shadow-sm transition hover:shadow-md hover:brightness-110"
        onSubmit={() => {
          const target = examToDelete;
          if (target) {
            setDraft((prev) => ({
              ...prev,
              examFees: prev.examFees.filter((item) => item.id !== target.id),
            }));
          }
          setExamToDelete(null);
        }}
      />
    </div>
  );
}

interface ExamFeeCardProps {
  item: ExamFeeItem;
  index: number;
  onChange: (patch: Partial<ExamFeeItem>) => void;
  onDelete: () => void;
}

/** One exam fee: name, month and an amount per class. */
function ExamFeeCard({ item, index, onChange, onDelete }: ExamFeeCardProps) {
  const [sameAmount, setSameAmount] = useState("");

  const applyToAll = () => {
    const amount = toAmount(sameAmount);
    onChange({ amounts: Object.fromEntries(CLASSES.map((className) => [className, amount])) });
  };

  return (
    <li className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="font-semibold text-gray-800">
          {index + 1}. {item.name.trim() || "New exam fee"}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({monthLabel(item.month)})
          </span>
        </p>
        <button
          type="button"
          onClick={onDelete}
          title="Remove exam fee"
          aria-label={`Remove ${item.name || "exam fee"}`}
          className="rounded-full p-2 text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`examFeeName-${item.id}`} className={labelClass}>
            Name <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id={`examFeeName-${item.id}`}
            className={inputClass}
            placeholder="e.g. Half-Yearly Exam"
            value={item.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`examFeeMonth-${item.id}`} className={labelClass}>
            Month
          </label>
          <SelectDropdown
            id={`examFeeMonth-${item.id}`}
            value={String(item.month)}
            onValueChange={(value) => onChange({ month: Number(value) })}
            options={SESSION_MONTH_OPTIONS}
          />
        </div>
        <div>
          <label htmlFor={`examFeeSame-${item.id}`} className={labelClass}>
            Same amount for all classes
          </label>
          <div className="flex gap-2">
            <input
              id={`examFeeSame-${item.id}`}
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass}
              placeholder="₹"
              value={sameAmount}
              onChange={(event) => setSameAmount(event.target.value)}
            />
            <button
              type="button"
              onClick={applyToAll}
              className="shrink-0 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {CLASSES.map((className) => (
          <div key={className}>
            <label htmlFor={`examFee-${item.id}-${className}`} className="mb-1 block text-xs font-semibold text-gray-600">
              Class {toOrdinalLabel(className)}
            </label>
            <input
              id={`examFee-${item.id}-${className}`}
              type="number"
              min={0}
              inputMode="numeric"
              className={AMOUNT_INPUT_CLASS}
              placeholder="0"
              value={item.amounts[className] || ""}
              onChange={(event) =>
                onChange({ amounts: { ...item.amounts, [className]: toAmount(event.target.value) } })
              }
            />
          </div>
        ))}
      </div>
    </li>
  );
}

export default FeeStructure;
