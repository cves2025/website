import {
  useController,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

export interface CheckboxOption {
  label: string;
  value: string;
}

interface CustomCheckboxGroupProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  options: CheckboxOption[];
  required?: boolean;
  rules?: RegisterOptions<T, FieldPath<T>>;
  wrapperClassName?: string;
  className?: string;
  gridClassName?: string;
  optionClassName?: string;
  /** Called with the next selected value array after every change. */
  onChange?: (next: string[]) => void;
}

/**
 * Reusable checkbox group (shadcn/ui Checkbox) for an array-of-strings field,
 * built on react-hook-form's useController. The field is registered so validation
 * rules run on submit (empty array fails `required`). Value writes are
 * delegated to the parent form via `onChange(next)` because the public
 * Control API does not expose setValue.
 */
function CustomCheckboxGroup<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  options = [],
  required = false,
  rules = {},
  wrapperClassName = "",
  className = "",
  gridClassName = "",
  optionClassName = "",
  onChange,
}: CustomCheckboxGroupProps<T>) {
  const { field, fieldState } = useController<T, FieldPath<T>>({
    control,
    name,
    rules,
  });

  const selected = Array.isArray(field.value)
    ? (field.value as string[])
    : ([] as string[]);
  const isRequired = required || Boolean(rules.required);
  const allSelected =
    options.length > 0 &&
    options.every((option) => selected.includes(option.value));

  const commit = (next: string[]) => onChange?.(next);

  const toggleOption = (value: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...selected, value]))
      : selected.filter((item) => item !== value);
    commit(next);
  };

  const toggleAll = (checked: boolean) => {
    commit(checked ? options.map((option) => option.value) : []);
  };

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
      <div className={`rounded-lg border border-gray-200 bg-gray-50 p-4 ${className}`}>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
          Select All
          <span className="text-xs font-medium text-gray-500">
            ({selected.length} of {options.length} selected)
          </span>
        </label>
        <div
          className={`mt-3 ${
            gridClassName || "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
          }`}
        >
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:border-primaryPink has-[[data-state=checked]]:border-primaryPink has-[[data-state=checked]]:bg-pink-50 ${optionClassName}`}
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={(checked) =>
                  toggleOption(option.value, checked === true)
                }
              />
              {option.label}
            </label>
          ))}
        </div>
        {fieldState.error && (
          <p className="mt-2 text-xs font-medium text-red-600">
            {fieldState.error.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default CustomCheckboxGroup;