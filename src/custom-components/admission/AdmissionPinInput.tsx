import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { useRef, KeyboardEvent, ClipboardEvent } from "react";

/**
 * Admission-form style 6-cell PIN CODE input.
 *
 * Reproduces the exact "6 boxes" look from the paper form, but now each box
 * is its own real single-digit input (OTP-style, same pattern as
 * AdmissionBoxedInput / MobileNumberInputBox) instead of one invisible
 * overlay input — so digits actually land inside their own box and typing
 * works correctly. Only numeric (0-9) digits are accepted.
 */
interface AdmissionPinInputProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  rules?: RegisterOptions<T, FieldPath<T>>;
  className?: string;
}

const PIN_CELLS = 6;

function AdmissionPinInput<T extends FieldValues = FieldValues>({
  control,
  name,
  rules = {},
  className = "",
}: AdmissionPinInputProps<T>) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const value: string = field.value ?? "";
        const chars = Array.from({ length: PIN_CELLS }, (_, i) => value[i] ?? "");

        const commitValue = (nextChars: string[]) => {
          field.onChange(nextChars.join("").slice(0, PIN_CELLS));
        };

        const focusCell = (index: number) => {
          const el = inputsRef.current[index];
          if (el) el.focus();
        };

        const handleChange = (index: number, raw: string) => {
          // Sirf numeric digit allow karo, aur sirf last typed character rakho.
          const digit = raw.replace(/\D/g, "").slice(-1);
          if (!digit && raw !== "") return; // non-numeric ignore, box waisa hi rahega

          const nextChars = [...chars];
          nextChars[index] = digit;
          commitValue(nextChars);

          if (digit && index < PIN_CELLS - 1) {
            focusCell(index + 1);
          }
        };

        const handleKeyDown = (
          index: number,
          e: KeyboardEvent<HTMLInputElement>
        ) => {
          if (e.key === "Backspace") {
            if (chars[index]) {
              const nextChars = [...chars];
              nextChars[index] = "";
              commitValue(nextChars);
            } else if (index > 0) {
              const nextChars = [...chars];
              nextChars[index - 1] = "";
              commitValue(nextChars);
              focusCell(index - 1);
            }
            e.preventDefault();
          } else if (e.key === "ArrowLeft" && index > 0) {
            focusCell(index - 1);
            e.preventDefault();
          } else if (e.key === "ArrowRight" && index < PIN_CELLS - 1) {
            focusCell(index + 1);
            e.preventDefault();
          }
        };

        const handlePaste = (
          index: number,
          e: ClipboardEvent<HTMLInputElement>
        ) => {
          e.preventDefault();
          const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
          const nextChars = [...chars];
          let cursor = index;
          for (const ch of pasted) {
            if (cursor >= PIN_CELLS) break;
            nextChars[cursor] = ch;
            cursor += 1;
          }
          commitValue(nextChars);
          focusCell(Math.min(cursor, PIN_CELLS - 1));
        };

        return (
          <div className={`flex flex-col gap-1 ${className}`}>
            <div className="flex border border-slate-400">
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
                  className={`h-8 w-7 border-0 bg-transparent text-center text-sm font-semibold text-slate-900 placeholder-gray-400 focus:outline-none focus:bg-sky-50 ${
                    i !== PIN_CELLS - 1 ? "border-r border-slate-400" : ""
                  }`}
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

export default AdmissionPinInput;