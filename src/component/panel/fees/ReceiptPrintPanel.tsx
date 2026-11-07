import { CheckCircle2, Info } from "lucide-react";

import {
  RECEIPT_COPIES_OPTIONS,
  RECEIPT_DESIGN_OPTIONS,
  RECEIPT_PAPER_OPTIONS,
} from "../../../constants";
import { Spinner } from "../../../custom-components/Loader";
import type { ReceiptPaper, ReceiptPrintSettings } from "../../../utils/type";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface ReceiptPrintPanelProps {
  settings: ReceiptPrintSettings;
  onChange: (next: ReceiptPrintSettings) => void;
  loading: boolean;
  saveState: SaveState;
}

/** Small drawing of the paper: a full A4 page, or two half sheets. */
function PaperIcon({ paper }: { paper: ReceiptPaper }) {
  return paper === "a4" ? (
    <span className="flex h-11 w-8 shrink-0 flex-col rounded-sm border border-current p-0.5">
      <span className="flex-1 rounded-[1px] bg-current opacity-30" />
      <span className="my-0.5 border-t border-dashed border-current" />
      <span className="flex-1 rounded-[1px] bg-current opacity-30" />
    </span>
  ) : (
    <span className="flex h-11 w-8 shrink-0 flex-col gap-1">
      <span className="flex-1 rounded-sm border border-current p-0.5">
        <span className="block h-full rounded-[1px] bg-current opacity-30" />
      </span>
      <span className="flex-1 rounded-sm border border-current p-0.5">
        <span className="block h-full rounded-[1px] bg-current opacity-30" />
      </span>
    </span>
  );
}

const choiceClass = (active: boolean) =>
  `flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
    active
      ? "border-[#ad1a6f] bg-[#fdf2f7] text-[#ad1a6f] ring-1 ring-[#ad1a6f]"
      : "border-gray-200 bg-white text-gray-700 hover:border-[#ad1a6f]/50 hover:bg-[#fdf2f7]/50"
  }`;

/**
 * Print settings of the receipt page: the design, the paper (full A4 or
 * half sheets) and the copies. Saved for the whole school; the preview
 * follows them.
 */
function ReceiptPrintPanel({ settings, onChange, loading, saveState }: ReceiptPrintPanelProps) {
  return (
    <aside className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900">Print settings</h2>
        <span className="flex min-h-5 items-center gap-1 text-xs text-gray-500" aria-live="polite">
          {loading ? (
            <Spinner size="xs" label="Loading print settings" />
          ) : saveState === "saving" ? (
            <>
              <Spinner size="xs" label="" /> Saving
            </>
          ) : saveState === "saved" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Saved
            </>
          ) : saveState === "error" ? (
            <span className="text-red-600">Not saved</span>
          ) : null}
        </span>
      </div>

      <fieldset disabled={loading}>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Design</legend>
        <div className="grid grid-cols-2 gap-2">
          {RECEIPT_DESIGN_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={settings.design === option.value}
              onClick={() => onChange({ ...settings, design: option.value })}
              className={`${choiceClass(settings.design === option.value)} !items-start`}
            >
              <span className="min-w-0">
                <span className="block font-semibold">{option.label}</span>
                <span className="block text-xs leading-snug text-gray-500">{option.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={loading} className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Paper</legend>
        {RECEIPT_PAPER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={settings.paper === option.value}
            onClick={() => onChange({ ...settings, paper: option.value })}
            className={choiceClass(settings.paper === option.value)}
          >
            <PaperIcon paper={option.value} />
            <span className="min-w-0">
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-xs text-gray-500">{option.hint}</span>
            </span>
          </button>
        ))}
      </fieldset>

      <fieldset disabled={loading} className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Copies</legend>
        {RECEIPT_COPIES_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={settings.copies === option.value}
            onClick={() => onChange({ ...settings, copies: option.value })}
            className={choiceClass(settings.copies === option.value)}
          >
            <span
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                settings.copies === option.value ? "border-[#ad1a6f]" : "border-gray-400"
              }`}
            >
              {settings.copies === option.value && <span className="h-2 w-2 rounded-full bg-[#ad1a6f]" />}
            </span>
            <span className="font-semibold">{option.label}</span>
          </button>
        ))}
      </fieldset>

      {settings.paper === "half" && (
        <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Each copy prints on the top half of its own A4 page. Keep paper size <b>A4</b> and
            margins <b>None</b> in the print dialog, and put the half sheets in the tray one by one,
            the same way as a full A4 sheet. Try one test print first.
          </span>
        </p>
      )}
    </aside>
  );
}

export default ReceiptPrintPanel;
