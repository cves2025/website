import type { Control, UseFormSetValue } from "react-hook-form";

import { UDISE_NONE } from "../../../constants";
import CustomCheckboxGroup from "../../../custom-components/CustomCheckboxGroup";
import CustomInput from "../../../custom-components/CustomInput";
import CustomSelect from "../../../custom-components/CustomSelect";
import type { UdiseFieldDef, UdiseForm } from "../../../utils/type";

const YES_NO = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

interface Props {
  field: UdiseFieldDef;
  control: Control<UdiseForm>;
  setValue: UseFormSetValue<UdiseForm>;
  /** Text of the "not set" choice, e.g. "Use records (Yes)". */
  noneLabel: string;
  /** Placeholder of a text / number field. */
  placeholder?: string;
}

/** One UDISE field as an input. */
function UdiseFieldInput({ field, control, setValue, noneLabel, placeholder }: Props) {
  const label = `${field.no ? `${field.no} ` : ""}${field.label}`;
  if (field.kind === "multi") {
    return (
      <CustomCheckboxGroup
        control={control}
        name={`multi.${field.key}`}
        label={label}
        options={field.options ?? []}
        gridClassName="grid gap-1.5 sm:grid-cols-2"
        onChange={(next) => setValue(`multi.${field.key}`, next, { shouldDirty: true })}
      />
    );
  }
  if (field.kind === "select" || field.kind === "yesno") {
    const options = field.kind === "yesno" ? YES_NO : field.options ?? [];
    return (
      <CustomSelect
        control={control}
        name={`values.${field.key}`}
        label={label}
        placeholder={null}
        options={[{ value: UDISE_NONE, label: noneLabel }, ...options]}
        searchable={options.length > 8}
      />
    );
  }
  return (
    <CustomInput
      control={control}
      name={`values.${field.key}`}
      label={label}
      placeholder={placeholder}
      maxLength={field.maxLength}
      inputMode={field.kind === "number" ? "numeric" : undefined}
    />
  );
}

export default UdiseFieldInput;
