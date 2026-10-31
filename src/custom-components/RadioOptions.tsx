import { ReactNode } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface RadioOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /**
   * Extra text: shown after the label in the "list" variant (rendered as
   * given), or as the description line under the title in the "card" variant.
   */
  hint?: ReactNode;
  disabled?: boolean;
}

interface RadioOptionsProps<T extends string = string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly RadioOption<T>[];
  /** Used for the radio group name and the option ids. */
  name: string;
  disabled?: boolean;
  /**
   * "list" (default): a small radio + label per row.
   * "card": a bordered box per option with a title and description,
   * highlighted in pink when selected (e.g. picking a template).
   */
  variant?: "list" | "card";
  /** Layout classes for the group (default a vertical list). */
  className?: string;
}

/**
 * App-wide radio buttons built on the shadcn/ui RadioGroup — pink dot and
 * border when selected. Use it everywhere a single choice is made from a
 * short list.
 */
function RadioOptions<T extends string = string>({
  value,
  onValueChange,
  options,
  name,
  disabled,
  variant = "list",
  className,
}: RadioOptionsProps<T>) {
  const isCard = variant === "card";

  return (
    <RadioGroup
      name={name}
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      disabled={disabled}
      className={cn(isCard ? "grid gap-3" : "flex flex-col gap-2", className)}
    >
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer text-sm",
              isCard
                ? cn(
                    "items-start gap-3 rounded-lg border p-4 transition-colors",
                    selected
                      ? "border-primaryPink bg-pink-50"
                      : "border-gray-200 hover:bg-gray-50"
                  )
                : "items-center gap-2 font-medium text-gray-700",
              option.disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <RadioGroupItem
              id={id}
              value={option.value}
              disabled={option.disabled}
              className={cn(
                "border-gray-400 text-primaryPink focus-visible:ring-primaryPink data-[state=checked]:border-primaryPink [&_svg]:fill-primaryPink",
                isCard && "mt-0.5 shrink-0"
              )}
            />
            {isCard ? (
              <div className="min-w-0">
                <p className="font-medium text-gray-800">{option.label}</p>
                {option.hint && (
                  <p className="mt-1 text-sm text-gray-500">{option.hint}</p>
                )}
              </div>
            ) : (
              <>
                <span>{option.label}</span>
                {option.hint}
              </>
            )}
          </label>
        );
      })}
    </RadioGroup>
  );
}

export default RadioOptions;
