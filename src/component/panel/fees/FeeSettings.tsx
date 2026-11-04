import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import Loader from "../../../custom-components/Loader";
import { Switch } from "@/components/ui/switch";
import { myContext } from "../../context/MyContextProvider";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { DEFAULT_FEE_SETTINGS } from "../../../constants";
import { formatRupees, toAmount } from "../../../utils/feeStructure";
import { saveFeeSettings } from "../../../utils/feeService";
import useFeeSettings from "../../../hooks/useFeeSettings";
import type { FeeSettings as Settings } from "../../../utils/type";
import { inputClass, labelClass } from "../attendance/attendanceShared";

const DUE_DAY_OPTIONS = Array.from({ length: 28 }, (_, index) => ({
  value: String(index + 1),
  label: toOrdinalLabel(String(index + 1)),
}));

const currentSession = generateAcademicYears()[0]?.value ?? "2026-27";

/**
 * School-wide fee settings (admin only): the due day of the monthly fee,
 * the late fee (OFF by default) and the receipt number prefix.
 */
function FeeSettings() {
  const { user } = useContext(myContext);
  const { settings, loading, error } = useFeeSettings();
  const [saved, setSaved] = useState<Settings>(DEFAULT_FEE_SETTINGS);
  const [draft, setDraft] = useState<Settings>(DEFAULT_FEE_SETTINGS);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const prefix = draft.receiptPrefix.trim();

  useEffect(() => {
    setSaved(settings);
    setDraft(settings);
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    if (!prefix) {
      toast.error("Receipt prefix is required.");
      document.getElementById("receiptPrefix")?.focus();
      return;
    }
    if (prefix.includes("/")) {
      toast.error('Receipt prefix cannot contain "/".');
      document.getElementById("receiptPrefix")?.focus();
      return;
    }
    if (draft.lateFeeEnabled && draft.lateFeeAmount <= 0) {
      toast.error("Enter the late fee amount, or switch the late fee off.");
      document.getElementById("lateFeeAmount")?.focus();
      return;
    }
    const next: Settings = { ...draft, receiptPrefix: prefix };
    setSaving(true);
    try {
      await saveFeeSettings(next, user.uid);
      setSaved(next);
      setDraft(next);
      toast.success("Fee settings saved.");
    } catch (cause) {
      console.error("Failed to save fee settings:", cause);
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Fee Settings"
        titleStyle="text-primaryBlue"
        description="Due date, late fee and receipt number of the fee module."
        descriptionStyle="text-gray-500"
      />

      {loading ? (
        <Loader label="Loading fee settings..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-1 font-bold text-gray-800">Due date</h2>
            <p className="mb-3 text-sm text-gray-500">
              The monthly fee should be paid by this day of the month. The dues
              report and the late fee use it.
            </p>
            <div className="sm:w-48">
              <label htmlFor="dueDay" className={labelClass}>
                Due day
              </label>
              <SelectDropdown
                id="dueDay"
                value={String(draft.dueDay)}
                onValueChange={(value) => setDraft({ ...draft, dueDay: Number(value) })}
                options={DUE_DAY_OPTIONS}
              />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-1 font-bold text-gray-800">Late fee</h2>
                <p className="text-sm text-gray-500">
                  When ON, a fixed late fee is added for every month whose fee is
                  not paid by the {toOrdinalLabel(String(draft.dueDay))}.
                </p>
              </div>
              <Switch
                checked={draft.lateFeeEnabled}
                onCheckedChange={(lateFeeEnabled) => setDraft({ ...draft, lateFeeEnabled })}
                aria-label="Late fee"
              />
            </div>
            {draft.lateFeeEnabled && (
              <div className="mt-3 sm:w-48">
                <label htmlFor="lateFeeAmount" className={labelClass}>
                  Late fee per month (₹)
                </label>
                <input
                  id="lateFeeAmount"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className={inputClass}
                  placeholder="0"
                  value={draft.lateFeeAmount || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, lateFeeAmount: toAmount(event.target.value) })
                  }
                />
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-1 font-bold text-gray-800">Receipt number</h2>
            <p className="mb-3 text-sm text-gray-500">
              Receipt numbers restart at 0001 every session and are never repeated.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="receiptPrefix" className={labelClass}>
                  Prefix <span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  id="receiptPrefix"
                  className={inputClass}
                  maxLength={12}
                  value={draft.receiptPrefix}
                  onChange={(event) =>
                    setDraft({ ...draft, receiptPrefix: event.target.value.toUpperCase() })
                  }
                />
              </div>
              <div>
                <p className={labelClass}>Example</p>
                <p className="rounded-md bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800">
                  {prefix || "…"}/{currentSession}/0001
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
            {dirty && <span className="text-sm font-medium text-amber-600">Unsaved changes</span>}
            {draft.lateFeeEnabled && draft.lateFeeAmount > 0 && (
              <span className="mr-auto text-sm text-gray-500">
                Late fee: {formatRupees(draft.lateFeeAmount)} per month
              </span>
            )}
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
              className="rounded-md bg-primaryBlue px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default FeeSettings;
