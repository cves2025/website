import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Admission-form style "underline" select/dropdown input.
 *
 * Same visual language as AdmissionLineInput — a label (prefix) followed by
 * a bottom-border field, matching the paper form's "write on the line"
 * look — built on the shadcn/ui Select, driven by an `options` array of
 * { label, value } objects.
 */
interface AdmissionSelectOption {
  /** Text shown to the user in the dropdown (e.g. "Male"). */
  label: string;
  /** Actual value stored in the form (e.g. "male"). */
  value: string;
}

interface AdmissionSelectInputProps<T extends FieldValues = FieldValues> {
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
              <Select
                name={field.name}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onOpenChange={(open) => {
                  if (!open) field.onBlur();
                }}
                disabled={disabled}
              >
                <SelectTrigger
                  id={name}
                  ref={field.ref}
                  aria-invalid={invalid}
                  className={cn(
                    "h-auto gap-1 rounded-none border-0 border-b bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-900 shadow-none focus:ring-0 data-[placeholder]:font-normal data-[placeholder]:text-gray-400",
                    invalid ? "border-red-500" : underlineClassName,
                    className || "flex-1"
                  )}
                >
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent className="border-primaryPink bg-white text-slate-900">
                  {options.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="cursor-pointer focus:bg-primaryPink focus:text-white data-[state=checked]:bg-primaryPink data-[state=checked]:font-semibold data-[state=checked]:text-white"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
