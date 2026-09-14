import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { InputHTMLAttributes, useRef, KeyboardEvent, ClipboardEvent } from "react";

/**
 * Admission-form style "boxed cells" input for MOBILE NUMBER — OTP-style
 * behaviour, same as AdmissionBoxedInput, but hard-locked to exactly 10
 * numeric digits. Non-numeric characters are rejected on type/paste.
 */
interface MobileNumberInputBoxProps<T extends FieldValues = FieldValues>
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "name" | "value" | "onChange" | "onPaste" | "onKeyDown" | "maxLength" | "inputMode"
  > {
  control: Control<T>;
  name: FieldPath<T>;
  rules?: RegisterOptions<T, FieldPath<T>>;
  /** Outer box border colour (default page-1 "border-sky-500"). */
  borderColor?: string;
  /** Cell divider colour (default page-1 "border-sky-500"). */
  dividerColor?: string;
  /** Height of each cell (default "h-9"). */
  cellHeightClassName?: string;
  /** Width / flex classes of the outer box (default "w-full"). */
  wrapperClassName?: string;
  /** Extra classes for each per-cell typing input. */
  inputClassName?: string;
}

const MOBILE_NUMBER_CELLS = 10;

function MobileNumberInputBox<T extends FieldValues = FieldValues>({
  control,
  name,
  rules = {},
  borderColor = "border-sky-500",
  dividerColor = "border-sky-500",
  cellHeightClassName = "h-9",
  wrapperClassName = "w-full",
  inputClassName = "",
  ...rest
}: MobileNumberInputBoxProps<T>) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const cells = MOBILE_NUMBER_CELLS;

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const value: string = field.value ?? "";
        const chars = Array.from({ length: cells }, (_, i) => value[i] ?? "");

        const commitValue = (nextChars: string[]) => {
          field.onChange(nextChars.join("").slice(0, cells));
        };

        const focusCell = (index: number) => {
          const el = inputsRef.current[index];
          if (el) el.focus();
        };

        const handleChange = (index: number, raw: string) => {
          // Sirf numeric digit allow karo, aur sirf last typed character rakho.
          const digit = raw.replace(/\D/g, "").slice(-1);
          if (!digit && raw !== "") return; // non-numeric key press ignore, box waisa hi rahega

          const nextChars = [...chars];
          nextChars[index] = digit;
          commitValue(nextChars);

          if (digit && index < cells - 1) {
            focusCell(index + 1);
          }
        };

        const handleKeyDown = (
          index: number,
          e: KeyboardEvent<HTMLInputElement>
        ) => {
          if (e.key === "Backspace") {
            if (chars[index]) {
              // Clear current cell, stay here.
              const nextChars = [...chars];
              nextChars[index] = "";
              commitValue(nextChars);
            } else if (index > 0) {
              // Already empty — clear previous cell and move back.
              const nextChars = [...chars];
              nextChars[index - 1] = "";
              commitValue(nextChars);
              focusCell(index - 1);
            }
            e.preventDefault();
          } else if (e.key === "ArrowLeft" && index > 0) {
            focusCell(index - 1);
            e.preventDefault();
          } else if (e.key === "ArrowRight" && index < cells - 1) {
            focusCell(index + 1);
            e.preventDefault();
          }
        };

        const handlePaste = (
          index: number,
          e: ClipboardEvent<HTMLInputElement>
        ) => {
          e.preventDefault();
          // Paste se bhi sirf digits hi liye jayenge, baaki characters chhod diye jayenge.
          const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
          const nextChars = [...chars];
          let cursor = index;
          for (const ch of pasted) {
            if (cursor >= cells) break;
            nextChars[cursor] = ch;
            cursor += 1;
          }
          commitValue(nextChars);
          focusCell(Math.min(cursor, cells - 1));
        };

        return (
          <div className="flex w-full flex-col gap-1">
            <div
              className={`flex border ${borderColor} ${
                wrapperClassName || "w-full"
              }`}
            >
              {chars.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  aria-invalid={Boolean(fieldState.error)}
                  value={char}
                  maxLength={1}
                  inputMode="numeric"
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={(e) => handlePaste(i, e)}
                  onBlur={field.onBlur}
                  className={`${cellHeightClassName} flex-1 w-5 border-0 bg-transparent text-center text-sm font-semibold text-slate-900 focus:outline-none focus:bg-sky-50 ${
                    i !== cells - 1 ? `border-r ${dividerColor}` : ""
                  } ${inputClassName}`}
                  {...rest}
                />
              ))}
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

export default MobileNumberInputBox;