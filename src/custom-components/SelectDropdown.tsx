import { forwardRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectDropdownOption {
  /** Text shown to the user in the dropdown (e.g. "Male"). */
  label: string;
  /** Actual value (e.g. "male"). May be "" (e.g. an "All Classes" option). */
  value: string;
}

interface SelectDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectDropdownOption[];
  /** Shown while no option is selected (default "Select"). */
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Classes for the trigger (the closed dropdown box). */
  className?: string;
  /** Extra classes for the opened list. */
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}

// Radix Select items cannot use "" as a value, so an option with value ""
// is mapped to this sentinel internally; callers always see "".
const EMPTY_VALUE = "__empty__";

const toSelectValue = (value: string) => (value === "" ? EMPTY_VALUE : value);
const fromSelectValue = (value: string) => (value === EMPTY_VALUE ? "" : value);

/**
 * App-wide dropdown built on the shadcn/ui Select — white list with a pink
 * border, pink background on hover and on the selected option.
 */
const SelectDropdown = forwardRef<HTMLButtonElement, SelectDropdownProps>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "Select",
      id,
      name,
      disabled,
      className,
      contentClassName,
      onOpenChange,
      ...aria
    },
    ref
  ) => {
    const hasEmptyOption = options.some((opt) => opt.value === "");
    // With no "" option, "" means "nothing selected" → show the placeholder.
    const selectValue =
      value === "" && !hasEmptyOption ? "" : toSelectValue(value);

    return (
      <Select
        name={name}
        value={selectValue}
        onValueChange={(next) => onValueChange(fromSelectValue(next))}
        onOpenChange={onOpenChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} ref={ref} className={className} {...aria}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          className={cn(
            "border-primaryPink bg-white text-slate-900",
            contentClassName
          )}
        >
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={toSelectValue(opt.value)}
              className="cursor-pointer focus:bg-primaryPink focus:text-white data-[state=checked]:bg-primaryPink data-[state=checked]:font-semibold data-[state=checked]:text-white"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);
SelectDropdown.displayName = "SelectDropdown";

export default SelectDropdown;
