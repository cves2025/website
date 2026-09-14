import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";

export interface AdmissionCheckboxOption {
  value: string;
  label: string;
}

/**
 * Admission-form style radio/check rows (e.g. the GENDER / CATEGORY /
 * NATIONALITY boxes). Each row keeps the exact "red label + green bordered
 * square" design; a light check mark inside the square shows the selection.
 */
interface AdmissionCheckboxGroupProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  options: readonly AdmissionCheckboxOption[];
  rules?: RegisterOptions<T, FieldPath<T>>;
  /** Layout classes for the group (e.g. "space-y-2" / "grid grid-cols-2"). */
  className?: string;
}

function AdmissionCheckboxGroup<T extends FieldValues = FieldValues>({
  control,
  name,
  options,
  rules = {},
  className = "",
}: AdmissionCheckboxGroupProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const selected = field.value;
        return (
          <div className={className}>
            {options.map((option) => {
              const checked = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => field.onChange(option.value)}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 transition-opacity hover:opacity-80 focus:outline-none"
                >
                  <span className="text-red-700 font-semibold text-sm">
                    {option.label}
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 border-green-700 text-green-700 ${
                      checked ? "bg-green-50" : "bg-transparent"
                    }`}
                  >
                    {checked && <span className="text-xs font-bold">✓</span>}
                  </span>
                </button>
              );
            })}
            {fieldState.error && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldState.error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

export default AdmissionCheckboxGroup;