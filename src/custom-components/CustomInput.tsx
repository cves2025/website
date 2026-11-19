import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const INPUT_CLASS =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100";

function fieldBorder(invalid: boolean): string {
  return invalid
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/40"
    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/50";
}

interface CustomInputProps<T extends FieldValues = FieldValues>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "type"> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  type?: string;
  rules?: RegisterOptions<T, FieldPath<T>>;
  required?: boolean;
  wrapperClassName?: string;
  className?: string;
}

/**
 * Reusable text/number/email/date input built on react-hook-form's Controller.
 * Props: control, name, label, placeholder, type, rules, required, disabled,
 * wrapperClassName (applied to the wrapping div), className (applied to the input).
 * type="password" gets a show / hide (eye) button, as on the Login page.
 */
function CustomInput<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  placeholder = "",
  type = "text",
  rules = {},
  required = false,
  disabled = false,
  wrapperClassName = "",
  className = "",
  ...rest
}: CustomInputProps<T>) {
  const isRequired = required || Boolean(rules.required);
  const isPassword = type === "password";
  const [shown, setShown] = useState(false);

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
            <div className="relative">
              <input
                id={name}
                type={isPassword && shown ? "text" : type}
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={invalid}
                className={`${INPUT_CLASS} ${fieldBorder(invalid)} ${isPassword ? "pr-10" : ""} ${className}`}
                {...field}
                {...rest}
              />
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShown((value) => !value)}
                  tabIndex={-1}
                  disabled={disabled}
                  aria-label={shown ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-navy disabled:opacity-50"
                >
                  {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
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

export default CustomInput;