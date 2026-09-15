import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { ChangeEvent, InputHTMLAttributes } from "react";

/**
 * Admission-form style "underline" input.
 *
 * Renders a label (prefix) followed by a bottom-border field, matching the
 * paper form's "write on the line" look. The prefix span inherits the text
 * colour of the surrounding section (green / pink / indigo) so the original
 * design is preserved.
 */
interface AdmissionLineInputProps<T extends FieldValues = FieldValues>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "name"> {
  control: Control<T>;
  name: FieldPath<T>;
  rules?: RegisterOptions<T, FieldPath<T>>;
  /** When true, only digits (0-9) are accepted; everything else is dropped. */
  numeric?: boolean;
  /** Label shown left of the underline (e.g. "School Name :"). */
  prefix?: string;
  prefixClassName?: string;
  /** Applied to the outer wrapper (e.g. "flex-1 min-w-[160px]"). */
  wrapperClassName?: string;
  /** Applied to the input element itself (default "flex-1"). */
  className?: string;
  /** Underline colour classes (default matches page-1 sections). */
  underlineClassName?: string;
}

function AdmissionLineInput<T extends FieldValues = FieldValues>({
  control,
  name,
  rules = {},
  numeric = false,
  prefix,
  prefixClassName = "",
  wrapperClassName = "",
  className = "",
  underlineClassName = "border-slate-500",
  ...rest
}: AdmissionLineInputProps<T>) {
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
              <input
                id={name}
                aria-invalid={invalid}
                className={`border-0 border-b bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-900 placeholder-gray-400 transition-colors focus:outline-none ${
                  invalid ? "border-red-500" : underlineClassName
                } ${className || "flex-1"}`}
                {...field}
                onChange={
                  numeric
                    ? (e: ChangeEvent<HTMLInputElement>) =>
                        field.onChange(e.target.value.replace(/\D/g, ""))
                    : field.onChange
                }
                {...(numeric ? { inputMode: "numeric" } : {})}
                {...rest}
              />
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

export default AdmissionLineInput;