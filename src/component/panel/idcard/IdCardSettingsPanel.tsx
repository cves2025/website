/**
 * ID Settings (admin): the card size for every tab, and for the open tab
 * which face prints (horizontal / vertical), until when it is valid, and
 * the designer where the card itself is made. Works on the page's form, so
 * the preview follows every change; nothing is saved until Save.
 */
import {
  useController,
  type Control,
  type UseFormGetValues,
  type UseFormReset,
} from "react-hook-form";
import { Palette, X } from "lucide-react";

import {
  ID_CARD_KIND_OPTIONS,
  ID_CARD_ORIENTATION_OPTIONS,
  ID_CARD_SIZE_LIMITS,
  ID_CARD_STANDARD_SIZE,
  ID_CARD_VALIDITY_OPTIONS,
} from "../../../constants";
import CustomButton from "../../../custom-components/CustomButton";
import CustomInput from "../../../custom-components/CustomInput";
import CustomSelect from "../../../custom-components/CustomSelect";
import { applyTabToAll, defaultTab } from "../../../utils/idCardSettings";
import type { IdCardKind, IdCardSettings } from "../../../utils/type";

interface IdCardSettingsPanelProps {
  kind: IdCardKind;
  control: Control<IdCardSettings>;
  getValues: UseFormGetValues<IdCardSettings>;
  reset: UseFormReset<IdCardSettings>;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onOpenDesigner: () => void;
  onClose: () => void;
}

const sectionTitle = "mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500";

function IdCardSettingsPanel({ kind, control, getValues, reset, dirty, saving, onSave, onOpenDesigner, onClose }: IdCardSettingsPanelProps) {
  const tabLabel = ID_CARD_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "";
  const orientation = useController({ control, name: `tabs.${kind}.orientation` }).field;
  const validityMode = useController({ control, name: `tabs.${kind}.validity.mode` }).field.value;
  const { min, max } = ID_CARD_SIZE_LIMITS;
  // Changes stay unsaved (dirty) until Save.
  const keepDefaults = { keepDefaultValues: true } as const;

  const sizeRules = {
    validate: (value: unknown) => {
      const number = Number(value);
      return (Number.isFinite(number) && number >= min && number <= max) || `Between ${min} and ${max} mm.`;
    },
  };

  return (
    <aside className="flex flex-col gap-5 rounded-lg bg-white p-4 shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">ID Settings</h2>
          <p className="text-xs text-gray-500">{tabLabel} tab · the preview follows every change</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ID settings"
          className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <section>
        <h3 className={sectionTitle}>Design</h3>
        <button
          type="button"
          onClick={onOpenDesigner}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-cves px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-110"
        >
          <Palette className="h-4 w-4" />
          Open the card designer
        </button>
        <p className="mt-1.5 text-xs text-gray-500">
          Drag, resize and style everything on the {tabLabel.toLowerCase()} card, horizontal and vertical.
        </p>
      </section>

      <section>
        <h3 className={sectionTitle}>Print</h3>
        <div className="grid grid-cols-2 gap-2">
          {ID_CARD_ORIENTATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={orientation.value === option.value}
              onClick={() => orientation.onChange(option.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                orientation.value === option.value
                  ? "border-[#ad1a6f] bg-[#fdf2f7] text-[#ad1a6f] ring-1 ring-[#ad1a6f]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-[#ad1a6f]/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>Card size (all tabs)</h3>
        <div className="grid grid-cols-2 gap-2">
          <CustomInput control={control} name="width" label="Width (mm)" type="number" step={0.1} min={min} max={max} rules={sizeRules} className="py-1.5" />
          <CustomInput control={control} name="height" label="Height (mm)" type="number" step={0.1} min={min} max={max} rules={sizeRules} className="py-1.5" />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Of a horizontal card; a vertical one turns it round. The design stretches to fit. Standard card:{" "}
          <button
            type="button"
            className="font-semibold text-[#ad1a6f] hover:underline"
            onClick={() => reset({ ...getValues(), ...ID_CARD_STANDARD_SIZE }, keepDefaults)}
          >
            {ID_CARD_STANDARD_SIZE.width} x {ID_CARD_STANDARD_SIZE.height} mm
          </button>
        </p>
      </section>

      <section>
        <h3 className={sectionTitle}>Valid till</h3>
        <CustomSelect control={control} name={`tabs.${kind}.validity.mode`} placeholder={null} options={ID_CARD_VALIDITY_OPTIONS} className="py-1.5" />
        {validityMode === "date" && (
          <CustomInput control={control} name={`tabs.${kind}.validity.date`} type="date" wrapperClassName="mt-2" className="py-1.5" />
        )}
        <p className="mt-1.5 text-xs text-gray-500">Shown wherever the card has the Valid Till field.</p>
      </section>

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
        <CustomButton type="button" variant="cves" disabled={!dirty || saving} onClick={onSave}>
          {saving ? "Saving..." : dirty ? "Save settings" : "Saved"}
        </CustomButton>
        <div className="grid grid-cols-2 gap-2">
          <CustomButton
            type="button"
            variant="outline"
            title="Use this tab's designs, print side and validity on every tab"
            onClick={() => reset(applyTabToAll(getValues(), kind), keepDefaults)}
          >
            Apply to all tabs
          </CustomButton>
          <CustomButton
            type="button"
            variant="outline"
            onClick={() =>
              reset({ ...getValues(), tabs: { ...getValues().tabs, [kind]: defaultTab(kind) } }, keepDefaults)
            }
          >
            Reset this tab
          </CustomButton>
        </div>
      </div>
    </aside>
  );
}

export default IdCardSettingsPanel;
