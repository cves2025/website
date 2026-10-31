import {
  useController,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import RadioOptions from "./RadioOptions";

interface RadioOption {
  value: string;
  label: string;
  hint?: string;
}

interface CustomRadioGroupProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  options: RadioOption[];
  required?: boolean;
  rules?: RegisterOptions<T, FieldPath<T>>;
  wrapperClassName?: string;
  className?: string;
  /** Called with the selected option value after every change. */
  onChange?: (value: string) => void;
}

/**
 * Reusable react-hook-form radio group, rendered with the app-wide
 * RadioOptions (shadcn/ui RadioGroup). Built on react-hook-form's useController. The field is
 * registered so it participates in validation and submit values. Value writes
 * are delegated to the parent form via `onChange(value)` because the public
 * Control API does not expose setValue.
 */
function CustomRadioGroup<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  options = [],
  required = false,
  rules = {},
  wrapperClassName = "",
  className = "",
  onChange,
}: CustomRadioGroupProps<T>) {
  const { field, fieldState } = useController<T, FieldPath<T>>({
    control,
    name,
    rules,
  });

  const current = typeof field.value === "string" ? field.value : "";
  const isRequired = required || Boolean(rules.required);

  return (
    <div className={`flex w-full flex-col gap-1.5 ${wrapperClassName}`}>
      {/* Keeps the RHF field ref registered for validation purposes. */}
      <input ref={field.ref} type="hidden" aria-hidden="true" tabIndex={-1} />
      {label && (
        <span className="block text-sm font-semibold text-gray-700">
          {label}
          {isRequired && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      )}
      <RadioOptions
        name={name}
        value={current}
        onValueChange={(value) => onChange?.(value)}
        options={options.map((option) => ({
          value: option.value,
          label: option.label,
          hint: option.hint && (
            <span className="text-xs text-gray-500">({option.hint})</span>
          ),
        }))}
        className={className}
      />
      {fieldState.error && (
        <p className="text-xs font-medium text-red-600">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}

export default CustomRadioGroup;