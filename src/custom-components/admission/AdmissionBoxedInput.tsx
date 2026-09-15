import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { InputHTMLAttributes, useRef, KeyboardEvent, ClipboardEvent } from "react";

/**
 * Admission-form style "boxed cells" input — OTP-style behaviour.
 *
 * Reproduces the paper form's ruled box made of N cells (e.g. the student
 * name strip). Each cell is its own single-character input, so typing fills
 * one box at a time and auto-advances to the next — exactly like an OTP
 * input. All cells stay in sync with a single string value in react-hook-form.
 *
 * `cells` ab sirf minimum/starting cell count hai. Agar user isse zyada
 * type karta hai to naye boxes automatically ban jaate hain, aur agar
 * ek row mein space khatam ho jaye to wrap hoke agli line mein box
 * banna shuru ho jaata hai (do row-strips ke beech gap rehta hai).
 *
 * `singleInputBox`: true pass karne par yeh ek hi single box render karega
 * (multi-cell OTP logic bypass ho jaayega) — text usi ek box mein type
 * hoga, koi naya box nahi banega.
 */
interface AdmissionBoxedInputProps<T extends FieldValues = FieldValues>
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "name" | "value" | "onChange" | "onPaste" | "onKeyDown" | "maxLength"
  > {
  control: Control<T>;
  name: FieldPath<T>;
  /** Minimum / initial number of ruled cells shown. Grows automatically as user types. */
  cells: number;
  /** Maximum number of characters accepted (caps the boxes / single-box value). */
  maxLength?: number;
  /** When true, only digits (0-9) are accepted; everything else is dropped. */
  numeric?: boolean;
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
  /** Text alignment inside each cell. */
  align?: "left" | "center";
  /** When true, renders ONE single box/input instead of multiple per-character cells. */
  singleInputBox?: boolean;
}

function AdmissionBoxedInput<T extends FieldValues = FieldValues>({
  control,
  name,
  cells,
  rules = {},
  borderColor = "border-sky-500",
  dividerColor = "border-sky-500",
  cellHeightClassName = "h-9",
  wrapperClassName = "w-full",
  inputClassName = "",
  align = "center",
  singleInputBox = false,
  maxLength,
  numeric = false,
  ...rest
}: AdmissionBoxedInputProps<T>) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        // ---------- SINGLE BOX MODE ----------
        if (singleInputBox) {
          return (
            <div className="flex w-full flex-col gap-1">
              <div className={`flex border ${borderColor} ${wrapperClassName || "w-full"}`}>
                <input
                  id={name}
                  aria-invalid={Boolean(fieldState.error)}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    let next = e.target.value;
                    if (numeric) next = next.replace(/\D/g, "");
                    if (maxLength) next = next.slice(0, maxLength);
                    field.onChange(next);
                  }}
                  onBlur={field.onBlur}
                  maxLength={maxLength}
                  {...(numeric ? { inputMode: "numeric" } : {})}
                  className={`${cellHeightClassName} w-full flex-1 border-0 bg-transparent text-sm font-semibold text-slate-900 focus:outline-none focus:bg-sky-50 ${
                    align === "center" ? "text-center" : "pl-2 pr-1"
                  } ${inputClassName}`}
                  {...rest}
                />
              </div>
              {fieldState.error && (
                <p className="text-xs font-medium text-red-600">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          );
        }

        // ---------- MULTI-CELL (OTP-style) MODE — existing code, unchanged ----------
        const value: string = String(field.value ?? "");

        // cells ab sirf minimum hai — jitna text hai usse ek extra
        // khaali cell hamesha aage available rahega taaki typing continue ho sake.
        const totalCells = Math.min(
          Math.max(cells, value.length + 1),
          maxLength ?? Number.MAX_SAFE_INTEGER
        );
        const chars = Array.from({ length: totalCells }, (_, i) => value[i] ?? "");

        const commitValue = (nextChars: string[]) => {
          field.onChange(nextChars.join("").slice(0, maxLength));
        };

        const focusCell = (index: number) => {
          // Naya cell abhi-abhi render hua ho sakta hai (agla render abhi commit
          // nahi hua), isliye ek tick baad focus karo taaki DOM element exist kare.
          setTimeout(() => {
            const el = inputsRef.current[index];
            if (el) el.focus();
          }, 0);
        };

        const handleChange = (index: number, raw: string) => {
          // Only ever keep the last typed character in this cell.
          const char = raw.slice(-1);
          if (numeric && !/\d/.test(char)) return;
          const nextChars = [...chars];
          nextChars[index] = char;
          commitValue(nextChars);

          if (char) {
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
          } else if (e.key === "ArrowRight" && index < totalCells - 1) {
            focusCell(index + 1);
            e.preventDefault();
          }
        };

        const handlePaste = (
          index: number,
          e: ClipboardEvent<HTMLInputElement>
        ) => {
          e.preventDefault();
          const pasted = numeric
            ? e.clipboardData.getData("text").replace(/\D/g, "")
            : e.clipboardData.getData("text");
          const nextChars = [...chars];
          let cursor = index;
          for (const ch of pasted) {
            if (cursor >= totalCells) break;
            nextChars[cursor] = ch;
            cursor += 1;
          }
          commitValue(nextChars);
          focusCell(Math.max(cursor - 1, 0));
        };

        return (
          <div className="flex w-full flex-col gap-1">
            <div
              className={`flex flex-wrap gap-y-2 ${wrapperClassName || "w-full"}`}
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
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={(e) => handlePaste(i, e)}
                  onBlur={field.onBlur}
                  className={`${cellHeightClassName} w-10 flex-shrink-0 border ${borderColor} ${
                    i !== 0 ? "-ml-px" : ""
                  } bg-transparent text-sm font-semibold text-slate-900 focus:outline-none focus:bg-sky-50 focus:relative focus:z-10 ${
                    align === "center" ? "text-center" : "pl-2 pr-1"
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

export default AdmissionBoxedInput;