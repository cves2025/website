/**
 * Designer: the settings of the selected element - place, size, angle and
 * look, its text or data field, colours, gradient, border and corners.
 * A form over the element: every change goes straight onto the card.
 */
import { useEffect } from "react";
import { Controller, useController, useForm, type Control, type FieldPath } from "react-hook-form";
import { RotateCcw } from "lucide-react";

import {
  ID_CARD_ALIGN_OPTIONS,
  ID_CARD_FIT_OPTIONS,
  ID_CARD_FONT_OPTIONS,
  ID_CARD_OVERFLOW_OPTIONS,
  ID_CARD_VALIGN_OPTIONS,
} from "../../../../constants";
import CircleCheckbox from "../../../../custom-components/CircleCheckbox";
import CustomInput from "../../../../custom-components/CustomInput";
import CustomSelect from "../../../../custom-components/CustomSelect";
import CustomTextarea from "../../../../custom-components/CustomTextarea";
import type { IdCardElement } from "../../../../utils/type";

type Path = FieldPath<IdCardElement>;

const heading = "mb-1.5 mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500";
const small = "py-1 text-xs";

/** Colour picker, with "none" when the colour may be left empty. */
function ColorField({
  control,
  name,
  label,
  clearable = true,
  fallback = "#000000",
}: {
  control: Control<IdCardElement>;
  name: Path;
  label: string;
  clearable?: boolean;
  fallback?: string;
}) {
  const { field } = useController({ control, name });
  const value = typeof field.value === "string" ? field.value : "";
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-gray-700">
      {label}
      <span className="flex items-center gap-1">
        <input
          type="color"
          value={value || fallback}
          onChange={(event) => field.onChange(event.target.value)}
          className={`h-8 w-10 cursor-pointer rounded-md border border-gray-300 bg-white p-0.5 ${value ? "" : "opacity-40"}`}
          aria-label={label}
        />
        {clearable && value && (
          <button
            type="button"
            title="None"
            aria-label={`No ${label.toLowerCase()}`}
            onClick={() => field.onChange("")}
            className="grid h-8 w-8 place-items-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        {!value && <span className="text-[11px] font-normal text-gray-400">None</span>}
      </span>
    </label>
  );
}

/** B / I / U / AA. */
function StyleToggle({ control, name, label, title, className }: { control: Control<IdCardElement>; name: Path; label: string; title: string; className: string }) {
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

function Check({ control, name, label, id }: { control: Control<IdCardElement>; name: Path; label: string; id: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <CircleCheckbox id={id} label={label} checked={field.value === true} onCheckedChange={(on) => field.onChange(on)} className="text-xs" />
      )}
    />
  );
}

interface EditorPropertiesProps {
  element: IdCardElement;
  /** Data the card can show: [key, label]. */
  fields: [string, string][];
  onChange: (values: Partial<IdCardElement>) => void;
  onReplaceImage: () => void;
}

function EditorProperties({ element, fields, onChange, onReplaceImage }: EditorPropertiesProps) {
  // One form per element (keyed by the parent); changes go to the card.
  const { control, watch, getValues, setValue } = useForm<IdCardElement>({ defaultValues: element });
  useEffect(() => {
    const subscription = watch((values, { name, type }) => {
      // Only what the admin changed here, not the form catching up (setValue).
      if (name && type === "change") onChange(values as Partial<IdCardElement>);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  // Moved or resized on the card: catch up, but leave a number being typed
  // ("1." is still 1) as it is.
  useEffect(() => {
    (Object.keys(element) as (keyof IdCardElement)[]).forEach((key) => {
      const current = getValues(key);
      const next = element[key];
      const same = typeof next === "number" ? Number(current) === next : current === next;
      if (!same) setValue(key, next as never);
    });
  }, [element, getValues, setValue]);

  const isText = element.type === "text" || element.type === "field";
  const isPicture = ["photo", "sign", "stamp", "image"].includes(element.type);
  const id = (key: string) => `${element.id}-${key}`;

  return (
    <div className="flex flex-col gap-2">
      <CustomInput control={control} name="name" label="Layer name" className={small} />

      <p className={heading}>Position & size (mm)</p>
      <div className="grid grid-cols-2 gap-2">
        <CustomInput control={control} name="x" label="X" type="number" step={0.1} className={small} />
        <CustomInput control={control} name="y" label="Y" type="number" step={0.1} className={small} />
        <CustomInput control={control} name="w" label="Width" type="number" step={0.1} min={0.1} className={small} />
        <CustomInput control={control} name="h" label="Height" type="number" step={0.1} min={0.1} className={small} />
        <CustomInput control={control} name="rotation" label="Angle (°)" type="number" step={1} className={small} />
        <CustomInput control={control} name="opacity" label="Opacity (0-1)" type="number" step={0.05} min={0} max={1} className={small} />
      </div>

      {element.type === "text" && (
        <>
          <p className={heading}>Text</p>
          <CustomTextarea control={control} name="text" rows={2} className="text-xs" />
          <p className="text-[11px] text-gray-500">Or double-click the text on the card to type there.</p>
        </>
      )}

      {element.type === "field" && (
        <>
          <p className={heading}>Data</p>
          <CustomSelect control={control} name="field" label="Shows" placeholder={null} options={fields.map(([value, label]) => ({ value, label }))} className={small} />
          <CustomInput control={control} name="label" label="Label" className={small} />
          <Check control={control} name="showLabel" label="Show the label before the value" id={id("showLabel")} />
          {element.showLabel && <ColorField control={control} name="labelColor" label="Label colour" fallback={element.color} />}
        </>
      )}

      {isText && (
        <>
          <p className={heading}>Font</p>
          <CustomSelect control={control} name="fontFamily" placeholder={null} options={ID_CARD_FONT_OPTIONS} className={small} />
          <div className="grid grid-cols-2 gap-2">
            <CustomInput control={control} name="fontSize" label="Size (pt)" type="number" step={0.5} min={1} className={small} />
            <ColorField control={control} name="color" label="Colour" clearable={false} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StyleToggle control={control} name="bold" label="B" title="Bold" className="font-bold" />
            <StyleToggle control={control} name="italic" label="I" title="Italic" className="italic" />
            <StyleToggle control={control} name="underline" label="U" title="Underline" className="underline" />
            <StyleToggle control={control} name="uppercase" label="AA" title="Capital letters" className="text-xs font-semibold" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CustomSelect control={control} name="align" label="Align" placeholder={null} options={ID_CARD_ALIGN_OPTIONS} className={small} />
            <CustomSelect control={control} name="valign" label="Vertical" placeholder={null} options={ID_CARD_VALIGN_OPTIONS} className={small} />
            <CustomInput control={control} name="lineHeight" label="Line height" type="number" step={0.05} min={0.5} className={small} />
            <CustomInput control={control} name="letterSpacing" label="Spacing (em)" type="number" step={0.01} className={small} />
          </div>
          <CustomSelect control={control} name="overflow" label="Long text" placeholder={null} options={ID_CARD_OVERFLOW_OPTIONS} className={small} />
        </>
      )}

      {isPicture && (
        <>
          <p className={heading}>Picture</p>
          <CustomSelect control={control} name="fit" placeholder={null} options={ID_CARD_FIT_OPTIONS} className={small} />
          {element.type === "image" && (
            <button type="button" onClick={onReplaceImage} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Replace image
            </button>
          )}
          {(element.type === "sign" || element.type === "stamp") && (
            <p className="text-[11px] text-gray-500">Uploaded with the admit card settings (Principal's sign / school stamp).</p>
          )}
        </>
      )}

      <p className={heading}>Fill & border</p>
      <div className="grid grid-cols-2 gap-2">
        <ColorField control={control} name="fill" label="Fill" fallback="#ffffff" />
        <ColorField control={control} name="fill2" label="Gradient to" fallback="#ffffff" />
        {element.fill2 && (
          <CustomInput control={control} name="gradientAngle" label="Gradient angle" type="number" step={5} className={small} wrapperClassName="col-span-2" />
        )}
        <ColorField control={control} name="stroke" label="Border" />
        <CustomInput control={control} name="strokeWidth" label="Border (mm)" type="number" step={0.1} min={0} className={small} />
        {element.type !== "ellipse" && (
          <CustomInput control={control} name="radius" label="Corners (mm)" type="number" step={0.2} min={0} className={small} wrapperClassName="col-span-2" />
        )}
      </div>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
        <Check control={control} name="locked" label="Lock" id={id("locked")} />
        <Check control={control} name="hidden" label="Hide" id={id("hidden")} />
      </div>
    </div>
  );
}

export default EditorProperties;
