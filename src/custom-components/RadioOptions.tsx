import { ReactNode } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: ReactNode;
  /** Extra text shown after the label, rendered as given. */
  hint?: ReactNode;
  disabled?: boolean;
}

interface RadioOptionsProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly RadioOption[];
  /** Used for the radio group name and the option ids. */
  name: string;
  disabled?: boolean;
  /** Layout classes for the group (default a vertical list). */
  className?: string;
}

/**
 * App-wide radio buttons built on the shadcn/ui RadioGroup — pink dot and
 * border when selected. Use it everywhere a single choice is made from a
 * short list.
 */
function RadioOptions({
  value,
  onValueChange,
  options,
  name,
  disabled,
  className,
}: RadioOptionsProps) {
  return (
    <RadioGroup
      name={name}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      className={cn("flex flex-col gap-2", className)}
    >
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700",
              option.disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <RadioGroupItem
              id={id}
              value={option.value}
              disabled={option.disabled}
              className="border-gray-400 text-primaryPink focus-visible:ring-primaryPink data-[state=checked]:border-primaryPink [&_svg]:fill-primaryPink"
            />
            <span>{option.label}</span>
            {option.hint}
          </label>
        );
      })}
    </RadioGroup>
  );
}

export default RadioOptions;
