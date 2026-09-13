import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { SelectHTMLAttributes } from "react";

const SELECT_CLASS =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100";

function fieldBorder(invalid: boolean): string {
  return invalid
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/40"
    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/50";
}

export type SelectOption = string | { value: string; label: string };

interface CustomSelectProps<T extends FieldValues = FieldValues>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string | null;
  options?: SelectOption[];
  rules?: RegisterOptions<T, FieldPath<T>>;
  required?: boolean;
  wrapperClassName?: string;
  className?: string;
  optionValue?: string;
  optionLabel?: string;
}

/**
 * Reusable select/dropdown built on react-hook-form's Controller.
 * options can be an array of strings OR objects like { value, label }.
 * Pass placeholder={null} to render no placeholder option.
 */
function CustomSelect<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  placeholder = "Select",
  options = [],
  rules = {},
  required = false,
  disabled = false,
  wrapperClassName = "",
  className = "",
  optionValue = "value",
  optionLabel = "label",
  ...rest
}: CustomSelectProps<T>) {
  const isRequired = required || Boolean(rules.required);

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const invalid = Boolean(fieldState.error);
        return (
          <div className={`flex w-full flex-col gap-1.5 ${wrapperClassName}`}>
            {label && (
              <label
                htmlFor={name}
                className="block text-sm font-semibold text-gray-700"
              >
                {label}
                {isRequired && <span className="ml-0.5 text-red-500">*</span>}
              </label>
            )}
            <select
              id={name}
              disabled={disabled}
              aria-invalid={invalid}
              className={`${SELECT_CLASS} ${fieldBorder(invalid)} ${className}`}
              {...field}
              {...rest}
            >
              {placeholder !== null && placeholder !== "" && (
                <option value="">{placeholder}</option>
              )}
              {options.map((option, index) => {
                const isObject = typeof option === "object" && option !== null;
                const obj = option as Record<string, string>;
                const value = isObject ? obj[optionValue] : option;
                const text = isObject ? obj[optionLabel] : option;
                return (
                  <option key={`${value}-${index}`} value={value}>
                    {text}
                  </option>
                );
              })}
            </select>
            {fieldState.error && (
              <p className="text-xs font-medium text-red-600">
                {fieldState.error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

export default CustomSelect;