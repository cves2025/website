import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import SelectDropdown, { SelectDropdownOption } from "../SelectDropdown";
import { cn } from "@/lib/utils";

/**
 * Admission-form style "underline" select/dropdown input.
 *
 * Same visual language as AdmissionLineInput — a label (prefix) followed by
 * a bottom-border field, matching the paper form's "write on the line"
 * look — built on the app-wide SelectDropdown (shadcn/ui Select), driven by an
 * `options` array of { label, value } objects.
 */

interface AdmissionSelectInputProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  rules?: RegisterOptions<T, FieldPath<T>>;
  /** List of selectable options — array of { label, value } objects. */
  options: SelectDropdownOption[];
  /** Label shown left of the underline (e.g. "Gender :"). */
  prefix?: string;
  prefixClassName?: string;
  /** Applied to the outer wrapper (e.g. "flex-1 min-w-[160px]"). */
  wrapperClassName?: string;
  /** Applied to the select trigger itself (default "flex-1"). */
  className?: string;
  /** Underline colour classes (default matches page-1 sections). */
  underlineClassName?: string;
  /** Placeholder shown while nothing is selected (default "Select"). */
  placeholder?: string;
  disabled?: boolean;
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
  placeholder = "Select",
  disabled,
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
              <SelectDropdown
                id={name}
                ref={field.ref}
                name={field.name}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onOpenChange={(open) => {
                  if (!open) field.onBlur();
                }}
                options={options}
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={invalid}
                className={cn(
                  "h-auto gap-1 rounded-none border-0 border-b bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-900 shadow-none focus:ring-0 data-[placeholder]:font-normal data-[placeholder]:text-gray-400",
                  invalid ? "border-red-500" : underlineClassName,
                  className || "flex-1"
                )}
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

export default AdmissionSelectInput;
