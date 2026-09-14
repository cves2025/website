import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { SelectHTMLAttributes } from "react";

/**
 * Admission-form style "underline" select/dropdown input.
 *
 * Same visual language as AdmissionLineInput — a label (prefix) followed by
 * a bottom-border field, matching the paper form's "write on the line"
 * look — but renders a native <select> instead of a text <input>, driven by
 * an `options` array of { label, value } objects.
 */
interface AdmissionSelectOption {
  /** Text shown to the user in the dropdown (e.g. "Male"). */
  label: string;
  /** Actual value stored in the form (e.g. "male"). */
  value: string;
}

interface AdmissionSelectInputProps<T extends FieldValues = FieldValues>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> {
  control: Control<T>;
  name: FieldPath<T>;
  rules?: RegisterOptions<T, FieldPath<T>>;
  /** List of selectable options — array of { label, value } objects. */
  options: AdmissionSelectOption[];
  /** Label shown left of the underline (e.g. "Gender :"). */
  prefix?: string;
  prefixClassName?: string;
  /** Applied to the outer wrapper (e.g. "flex-1 min-w-[160px]"). */
  wrapperClassName?: string;
  /** Applied to the select element itself (default "flex-1"). */
  className?: string;
  /** Underline colour classes (default matches page-1 sections). */
  underlineClassName?: string;
  /** Placeholder shown as the first, disabled option (e.g. "Select"). */
  placeholder?: string;
}

function AdmissionSelectInput<T extends FieldValues = FieldValues>({
  control,
  name,
  rules = {},
  options,
  prefix,
  prefixClassName = "",
  wrapperClassName = "",
  className = "",
  underlineClassName = "border-slate-500",
  placeholder,
  ...rest
}: AdmissionSelectInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const invalid = Boolean(fieldState.error);
        return (
          <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
            <div className="flex items-end gap-2">
              {prefix && (
                <span className={`whitespace-nowrap ${prefixClassName}`}>
                  {prefix}
                </span>
              )}
              <select
                id={name}
                aria-invalid={invalid}
                className={`border-0 border-b bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-900 transition-colors focus:outline-none ${
                  invalid ? "border-red-500" : underlineClassName
                } ${className || "flex-1"}`}
                {...field}
                value={field.value ?? ""}
                {...rest}
              >
                {placeholder && (
                  <option value="" disabled hidden>
                    {placeholder}
                  </option>
                )}
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
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

export default AdmissionSelectInput;