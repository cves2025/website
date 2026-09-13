import { Controller } from "react-hook-form";

const TEXTAREA_CLASS =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100";

function fieldBorder(invalid) {
  return invalid
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/40"
    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/50";
}

/**
 * Reusable textarea built on react-hook-form's Controller.
 */
function CustomTextarea({
  control,
  name,
  label,
  placeholder = "",
  rows = 3,
  rules = {},
  required = false,
  disabled = false,
  wrapperClassName = "",
  className = "",
  ...rest
}) {
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
            <textarea
              id={name}
              placeholder={placeholder}
              rows={rows}
              disabled={disabled}
              aria-invalid={invalid}
              className={`${TEXTAREA_CLASS} ${fieldBorder(invalid)} ${className}`}
              {...field}
              {...rest}
            />
            {invalid && (
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

export default CustomTextarea;