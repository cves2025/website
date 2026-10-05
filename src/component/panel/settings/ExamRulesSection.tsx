import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../../custom-components/Button";
import Modal from "../../../custom-components/Modal";
import { useExamRules } from "../../../hooks/useExamRules";
import {
  type ExamRules,
  validateExamRules,
} from "../../../utils/examRules";
import { saveExamRules } from "../../../utils/examRulesService";

/** Warning shown before the rules are saved (applies to past exams too). */
const SAVE_WARNING =
  "These rules apply to all exams, including past ones. Results and ranks will be recalculated everywhere.";

/** Simple switch button matching the CustomToggle look used in the Exams module. */
function SwitchRow({
  checked,
  onChange,
  label,
  helper,
  onLabel,
  offLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  helper: string;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{helper}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`text-xs font-semibold ${
            checked ? "text-green-700" : "text-gray-500"
          }`}
        >
          {checked ? onLabel : offLabel}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

/** Percentage field with inline validation (0-100, up to two decimals). */
function PercentageField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const parsed = parsePercentage(value);
  const invalid = parsed === null;
  return (
    <div className="py-3">
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-semibold text-gray-700"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-32 rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          invalid
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/40"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/50"
        }`}
      />
      {invalid && value.trim() !== "" && (
        <p className="mt-1 text-xs text-red-600">
          Enter a number between 0 and 100.
        </p>
      )}
    </div>
  );
}

/** Parses a percentage draft: digits with an optional 1-2 decimal fraction. */
function parsePercentage(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 100
    ? numeric
    : null;
}
/** "Exam" section of the Settings page: rank scope + pass rule of all exams. */
function ExamRulesSection() {
  const { rules, loading, error, reload } = useExamRules();

  const [rankClass, setRankClass] = useState(rules.rankScope === "class");
  const [passSubject, setPassSubject] = useState(rules.passMode === "subject");
  const [totalPassText, setTotalPassText] = useState(
    String(rules.totalPassPercentage)
  );
  const [subjectPassText, setSubjectPassText] = useState(
    String(rules.subjectPassPercentage)
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Sync the draft whenever rules arrive or are replaced by another screen.
  useEffect(() => {
    setRankClass(rules.rankScope === "class");
    setPassSubject(rules.passMode === "subject");
    setTotalPassText(String(rules.totalPassPercentage));
    setSubjectPassText(String(rules.subjectPassPercentage));
  }, [rules]);

  const totalPass = parsePercentage(totalPassText);
  const subjectPass = parsePercentage(subjectPassText);
  const formValid = totalPass !== null && subjectPass !== null;

  const buildDraft = (): ExamRules => ({
    rankScope: rankClass ? "class" : "section",
    passMode: passSubject ? "subject" : "total",
    totalPassPercentage: totalPass ?? 0,
    subjectPassPercentage: subjectPass ?? 0,
  });

  const handleSave = async () => {
    if (saving) return;
    const draft = buildDraft();
    const validationError = validateExamRules(draft);
    if (validationError) {
      setSaveError(validationError);
      setConfirmOpen(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveExamRules(draft);
      setConfirmOpen(false);
      setJustSaved(true);
      toast.success("Exam rules saved.");
      window.setTimeout(() => setJustSaved(false), 2500);
    } catch (error) {
      console.error("Failed to save exam rules:", error);
      setSaveError("Failed to save the exam rules. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-gray-800">Exam</h2>
      <p className="mt-0.5 text-sm text-gray-500">
        How results and ranks are calculated. These rules apply to every exam,
        including past ones.
      </p>

      {loading ? (
        <p className="py-4 text-sm text-gray-500">Loading exam rules...</p>
      ) : error ? (
        <div
          className="mt-2 flex items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>
            {error} Saves are disabled until the settings load - defaults are
            never saved over real settings by accident.
          </span>
          <Button
            buttonName="Retry"
            variant="outline"
            size="sm"
            onClick={reload}
          />
        </div>
      ) : (
        <>
          <div className="mt-2 divide-y divide-gray-100">
            <SwitchRow
              checked={rankClass}
              onChange={setRankClass}
              label="Rank across the whole class (all sections together)"
              helper="ON = one rank list for the entire class with every section; OFF = each class-section is ranked separately."
              onLabel="Class-wise"
              offLabel="Section-wise"
            />

            <SwitchRow
              checked={passSubject}
              onChange={setPassSubject}
              label="Subject-wise pass marks"
              helper="ON = the student must pass every subject; OFF = pass is decided on the total percentage only."
              onLabel="Every subject"
              offLabel="Total only"
            />

            {passSubject ? (
              <PercentageField
                id="subjectPassPercentage"
                label="Subject pass percentage"
                value={subjectPassText}
                onChange={setSubjectPassText}
              />
            ) : (
              <PercentageField
                id="totalPassPercentage"
                label="Total pass percentage"
                value={totalPassText}
                onChange={setTotalPassText}
              />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              buttonName={
                saving ? "Saving..." : justSaved ? "Saved" : "Save rules"
              }
              variant={justSaved ? "success" : "primary"}
              disabled={!formValid || saving}
              onClick={() => setConfirmOpen(true)}
              size="md"
            />
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          </div>
        </>
      )}

      <Modal
        isOpen={confirmOpen}
        onClose={() => {
          if (!saving) setConfirmOpen(false);
        }}
        title="Save exam rules?"
        cancelText="Cancel"
        submitText="Save"
        loading={saving}
        submitDisabled={!formValid}
        onSubmit={() => void handleSave()}
      >
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-800">
          {SAVE_WARNING}
        </p>
      </Modal>
    </div>
  );
}

export default ExamRulesSection;