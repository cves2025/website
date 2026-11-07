import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import SelectDropdown from "./SelectDropdown";
import { cn } from "@/lib/utils";

function fieldBorder(invalid: boolean): string {
  return invalid
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/40"
    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/50";
}

export type SelectOption = string | { value: string; label: string; disabled?: boolean };

interface CustomSelectProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string | null;
  options?: SelectOption[];
  rules?: RegisterOptions<T, FieldPath<T>>;
  required?: boolean;
  disabled?: boolean;
  wrapperClassName?: string;
  className?: string;
  optionValue?: string;
  optionLabel?: string;
  /** Show a search box on top of the list (filters as you type). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * Extra change handler invoked AFTER the react-hook-form controller handler,
   * so the form value is already updated when this runs.
   */
  onValueChange?: (value: string) => void;
  /** Called when the list opens or closes (e.g. to load options on open). */
  onOpenChange?: (open: boolean) => void;
  /** Text in the list when there is no option (e.g. "Loading..."). */
  emptyMessage?: string;
  /** Extra classes for the opened list. */
  contentClassName?: string;
}

/**
 * Reusable react-hook-form select/dropdown, built on the app-wide
 * SelectDropdown (shadcn/ui Select).
 * options can be an array of strings OR objects like { value, label }.
 * Pass placeholder={null} to show no placeholder text.
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
  searchable = false,
  searchPlaceholder,
  onValueChange,
  onOpenChange,
  emptyMessage,
  contentClassName,
}: CustomSelectProps<T>) {
  const isRequired = required || Boolean(rules.required);

  const normalizedOptions = options.map((option) => {
    if (typeof option === "object" && option !== null) {
      const obj = option as Record<string, unknown>;
      return {
        value: String(obj[optionValue] ?? ""),
        label: String(obj[optionLabel] ?? ""),
        disabled: obj.disabled === true,
      };
    }
    return { value: option, label: option };
  });

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
            <SelectDropdown
              id={name}
              ref={field.ref}
              name={field.name}
              value={field.value ?? ""}
              onValueChange={(value) => {
                field.onChange(value);
                onValueChange?.(value);
              }}
              onOpenChange={(open) => {
                if (!open) field.onBlur();
                onOpenChange?.(open);
              }}
              options={normalizedOptions}
              emptyMessage={emptyMessage}
              contentClassName={contentClassName}
              placeholder={placeholder ?? ""}
              disabled={disabled}
              searchable={searchable}
              searchPlaceholder={searchPlaceholder}
              aria-invalid={invalid}
              className={cn(fieldBorder(invalid), className)}
            />
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
