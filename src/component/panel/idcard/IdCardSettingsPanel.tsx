/**
 * ID Settings (admin): the card size for every tab, and for the open tab its
 * template, orientation, extras, validity and fields - which ones show, in
 * what order, and how each looks. Works on the page's form, so the preview
 * follows every change; nothing is saved until Save.
 */
import { useState } from "react";
import {
  Controller,
  useController,
  useFieldArray,
  useWatch,
  type Control,
  type FieldPath,
  type UseFormGetValues,
  type UseFormReset,
} from "react-hook-form";
import { ArrowDown, ArrowUp, ChevronDown, RotateCcw, X } from "lucide-react";

import {
  ID_CARD_ALIGN_OPTIONS,
  ID_CARD_DESIGN_OPTIONS,
  ID_CARD_KIND_OPTIONS,
  ID_CARD_ORIENTATION_OPTIONS,
  ID_CARD_OVERFLOW_OPTIONS,
  ID_CARD_SIZE_LIMITS,
  ID_CARD_STANDARD_SIZE,
  ID_CARD_VALIDITY_OPTIONS,
} from "../../../constants";
import CircleCheckbox from "../../../custom-components/CircleCheckbox";
import CustomButton from "../../../custom-components/CustomButton";
import CustomInput from "../../../custom-components/CustomInput";
import CustomSelect from "../../../custom-components/CustomSelect";
import { applyTabToAll, defaultTab } from "../../../utils/idCardSettings";
import type { IdCardKind, IdCardSettings } from "../../../utils/type";

type Path = FieldPath<IdCardSettings>;

interface IdCardSettingsPanelProps {
  kind: IdCardKind;
  control: Control<IdCardSettings>;
  getValues: UseFormGetValues<IdCardSettings>;
  reset: UseFormReset<IdCardSettings>;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

const sectionTitle = "mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500";

const choiceClass = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-left text-sm transition ${
    active
      ? "border-[#ad1a6f] bg-[#fdf2f7] text-[#ad1a6f] ring-1 ring-[#ad1a6f]"
      : "border-gray-200 bg-white text-gray-700 hover:border-[#ad1a6f]/50 hover:bg-[#fdf2f7]/50"
  }`;

/** A set of buttons that picks one value of a field. */
function ChoiceButtons({
  control,
  name,
  options,
  columns = 2,
}: {
  control: Control<IdCardSettings>;
  name: Path;
  options: { value: string; label: string; hint?: string }[];
  columns?: number;
}) {
  const { field } = useController({ control, name });
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={field.value === option.value}
          onClick={() => field.onChange(option.value)}
          className={choiceClass(field.value === option.value)}
        >
          <span className="block font-semibold">{option.label}</span>
          {option.hint && <span className="block text-xs leading-snug text-gray-500">{option.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/** Round checkbox bound to a true / false field. */
function FlagBox({ control, name, label }: { control: Control<IdCardSettings>; name: Path; label: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <CircleCheckbox
          id={name}
          label={label}
          checked={field.value === true}
          onCheckedChange={(checked) => field.onChange(checked)}
        />
      )}
    />
  );
}

/** B / I / U / Aa: a small on / off style button. */
function StyleToggle({
  control,
  name,
  label,
  title,
  className = "",
}: {
  control: Control<IdCardSettings>;
  name: Path;
  label: string;
  title: string;
  className?: string;
}) {
  const { field } = useController({ control, name });
  const on = field.value === true;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      onClick={() => field.onChange(!on)}
      className={`grid h-8 w-8 place-items-center rounded-md border text-sm transition ${className} ${
        on ? "border-[#ad1a6f] bg-[#ad1a6f] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

/** Text colour: a picker, plus going back to the template's colour. */
function ColorPick({ control, name }: { control: Control<IdCardSettings>; name: Path }) {
  const { field } = useController({ control, name });
  const value = typeof field.value === "string" ? field.value : "";
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        aria-label="Text colour"
        title="Text colour"
        value={value || "#111827"}
        onChange={(event) => field.onChange(event.target.value)}
        className="h-8 w-9 cursor-pointer rounded-md border border-gray-300 bg-white p-0.5"
      />
      {value && (
        <button
          type="button"
          title="Use the template's colour"
          aria-label="Use the template's colour"
          onClick={() => field.onChange("")}
          className="grid h-8 w-8 place-items-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** A field's label as typed (the field array itself only updates on move). */
function FieldName({ control, name, fallback }: { control: Control<IdCardSettings>; name: Path; fallback: string }) {
  const label = useWatch({ control, name });
  return <span className="truncate">{(typeof label === "string" && label) || fallback}</span>;
}

function FieldsEditor({ kind, control }: { kind: IdCardKind; control: Control<IdCardSettings> }) {
  const { fields, move } = useFieldArray({ control, name: `tabs.${kind}.fields` });
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-2">
      {fields.map((item, index) => {
        const base = `tabs.${kind}.fields.${index}` as const;
        const expanded = open === item.key;
        return (
          <li key={item.id} className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Controller
                control={control}
                name={`${base}.show`}
                render={({ field }) => (
                  <CircleCheckbox
                    id={`${kind}-${item.key}-show`}
                    label=""
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                )}
              />
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : item.key)}
                aria-expanded={expanded}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left text-sm font-semibold text-gray-800"
              >
                <FieldName control={control} name={`${base}.label`} fallback={item.key} />
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition ${expanded ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                title="Move up"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                className="grid h-7 w-7 place-items-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Move down"
                aria-label="Move down"
                disabled={index === fields.length - 1}
                onClick={() => move(index, index + 1)}
                className="grid h-7 w-7 place-items-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {expanded && (
              <div className="flex flex-col gap-3 border-t border-gray-100 px-3 py-3">
                <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                  <CustomInput control={control} name={`${base}.label`} label="Label" className="py-1.5" />
                  <CustomInput
                    control={control}
                    name={`${base}.size`}
                    label="Size (pt)"
                    type="number"
                    min={3}
                    max={40}
                    step={0.5}
                    className="py-1.5"
                  />
                </div>
                <FlagBox control={control} name={`${base}.showLabel`} label="Show the label before the value" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <StyleToggle control={control} name={`${base}.bold`} label="B" title="Bold" className="font-bold" />
                  <StyleToggle control={control} name={`${base}.italic`} label="I" title="Italic" className="italic" />
                  <StyleToggle control={control} name={`${base}.underline`} label="U" title="Underline" className="underline" />
                  <StyleToggle control={control} name={`${base}.uppercase`} label="AA" title="Capital letters" className="text-xs font-semibold" />
                  <ColorPick control={control} name={`${base}.color`} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <CustomSelect control={control} name={`${base}.align`} label="Align" placeholder={null} options={ID_CARD_ALIGN_OPTIONS} className="py-1.5" />
                  <CustomSelect control={control} name={`${base}.overflow`} label="Long text" placeholder={null} options={ID_CARD_OVERFLOW_OPTIONS} className="py-1.5" />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function IdCardSettingsPanel({ kind, control, getValues, reset, dirty, saving, onSave, onClose }: IdCardSettingsPanelProps) {
  const tabLabel = ID_CARD_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "";
  const validityMode = useController({ control, name: `tabs.${kind}.validity.mode` }).field.value;
  const { min, max } = ID_CARD_SIZE_LIMITS;
  // Changes stay unsaved (dirty) until Save, so the defaults are kept.
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
        <h3 className={sectionTitle}>Card size (all tabs)</h3>
        <div className="grid grid-cols-2 gap-2">
          <CustomInput control={control} name="width" label="Width (mm)" type="number" step={0.1} min={min} max={max} rules={sizeRules} className="py-1.5" />
          <CustomInput control={control} name="height" label="Height (mm)" type="number" step={0.1} min={min} max={max} rules={sizeRules} className="py-1.5" />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Width x height of a horizontal card; a vertical card turns it round. Standard card:{" "}
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
        <h3 className={sectionTitle}>Template</h3>
        <ChoiceButtons control={control} name={`tabs.${kind}.design`} options={ID_CARD_DESIGN_OPTIONS} />
        <div className="mt-2">
          <ChoiceButtons control={control} name={`tabs.${kind}.orientation`} options={ID_CARD_ORIENTATION_OPTIONS} />
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>On the card</h3>
        <div className="grid grid-cols-2 gap-2">
          <FlagBox control={control} name={`tabs.${kind}.showPhoto`} label="Photo" />
          <FlagBox control={control} name={`tabs.${kind}.showQr`} label="QR code" />
          <FlagBox control={control} name={`tabs.${kind}.showSign`} label="Principal's sign" />
          <FlagBox control={control} name={`tabs.${kind}.showStamp`} label="School stamp" />
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>Valid till</h3>
        <CustomSelect control={control} name={`tabs.${kind}.validity.mode`} placeholder={null} options={ID_CARD_VALIDITY_OPTIONS} className="py-1.5" />
        {validityMode === "date" && (
          <CustomInput control={control} name={`tabs.${kind}.validity.date`} type="date" wrapperClassName="mt-2" className="py-1.5" />
        )}
      </section>

      <section>
        <h3 className={sectionTitle}>Fields</h3>
        <p className="mb-2 text-xs text-gray-500">
          Tick what shows on the card, move it up or down, and open a field for its size and style.
        </p>
        <FieldsEditor key={kind} kind={kind} control={control} />
      </section>

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
        <CustomButton type="button" variant="cves" disabled={!dirty || saving} onClick={onSave}>
          {saving ? "Saving..." : dirty ? "Save settings" : "Saved"}
        </CustomButton>
        <div className="grid grid-cols-2 gap-2">
          <CustomButton
            type="button"
            variant="outline"
            title="Use this tab's template, extras and field styles on every tab"
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
