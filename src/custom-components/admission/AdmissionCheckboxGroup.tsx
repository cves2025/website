import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface AdmissionCheckboxOption {
  value: string;
  label: string;
}

/**
 * Admission-form style radio/check rows (e.g. the GENDER / CATEGORY /
 * NATIONALITY boxes). Each row keeps the exact "red label + green bordered
 * square" design; a shadcn/ui Checkbox draws the square and its check mark.
 * Only one option can be selected at a time (radio behaviour): clicking the
 * selected box again keeps it selected.
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
          <div className="flex flex-col gap-1">
            <div className={className}>
              {options.map((option) => {
                const checked = selected === option.value;
                const id = `${name}-${option.value}`;
                return (
                  <Label
                    key={option.value}
                    htmlFor={id}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 transition-opacity hover:opacity-80"
                  >
                    <span className="text-red-700 font-semibold text-sm">
                      {option.label}
                    </span>
                    <Checkbox
                      id={id}
                      checked={checked}
                      aria-invalid={Boolean(fieldState.error)}
                      onCheckedChange={(next) => {
                        if (next) field.onChange(option.value);
                      }}
                      onBlur={field.onBlur}
                      className="h-5 w-5 rounded-none border-2 border-green-700 text-green-700 shadow-none data-[state=checked]:bg-green-50 data-[state=checked]:text-green-700"
                    />
                  </Label>
                );
              })}
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

export default AdmissionCheckboxGroup;