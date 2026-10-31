import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { InputHTMLAttributes } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

/**
 * Admission-form style "boxed cells" input — OTP-style behaviour.
 *
 * Reproduces the paper form's ruled box made of N cells (e.g. the student
 * name strip) using the shadcn/ui InputOTP: typing fills one box at a time
 * and auto-advances to the next, Backspace / arrow keys / paste work across
 * boxes. The whole strip is a single string value in react-hook-form.
 *
 * `cells` ab sirf minimum/starting cell count hai. Agar user isse zyada
 * type karta hai to naye boxes automatically ban jaate hain, aur agar
 * ek row mein space khatam ho jaye to wrap hoke agli line mein box
 * banna shuru ho jaata hai (do row-strips ke beech gap rehta hai).
 *
 * `singleInputBox`: true pass karne par yeh ek hi single box (shadcn Input)
 * render karega (multi-cell OTP logic bypass ho jaayega) — text usi ek box
 * mein type hoga, koi naya box nahi banega.
 */
interface AdmissionBoxedInputProps<T extends FieldValues = FieldValues>
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "name" | "value" | "onChange" | "onPaste" | "onKeyDown" | "maxLength" | "pattern"
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
  /** Extra classes for each cell (or the single input). */
  inputClassName?: string;
  /** Text alignment inside each cell. */
  align?: "left" | "center";
  /** When true, renders ONE single box/input instead of multiple per-character cells. */
  singleInputBox?: boolean;
}

/** Upper bound for the cell count when no maxLength is given. */
const DEFAULT_MAX_CELLS = 100;

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
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const errorMessage = fieldState.error && (
          <p className="text-xs font-medium text-red-600">
            {fieldState.error.message}
          </p>
        );

        // ---------- SINGLE BOX MODE ----------
        if (singleInputBox) {
          return (
            <div className="flex w-full flex-col gap-1">
              <div className={`flex border ${borderColor} ${wrapperClassName || "w-full"}`}>
                <Input
                  id={name}
                  ref={field.ref}
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
                  className={cn(
                    cellHeightClassName,
                    "flex-1 rounded-none border-0 bg-transparent py-0 text-sm font-semibold text-slate-900 shadow-none focus-visible:bg-sky-50 focus-visible:ring-0 md:text-sm",
                    align === "center" ? "px-1 text-center" : "pl-2 pr-1",
                    inputClassName
                  )}
                  {...rest}
                />
              </div>
              {errorMessage}
            </div>
          );
        }

        // ---------- MULTI-CELL (OTP-style) MODE ----------
        const value: string = String(field.value ?? "");
        const limit = maxLength ?? DEFAULT_MAX_CELLS;

        // cells ab sirf minimum hai — jitna text hai usse ek extra
        // khaali cell hamesha aage available rahega taaki typing continue ho sake.
        const totalCells = Math.min(Math.max(cells, value.length + 1), limit);

        return (
          <div className="flex w-full flex-col gap-1">
            <InputOTP
              {...rest}
              id={name}
              ref={field.ref}
              maxLength={limit}
              pattern={numeric ? REGEXP_ONLY_DIGITS : undefined}
              {...(numeric ? { inputMode: "numeric" as const } : {})}
              pushPasswordManagerStrategy="none"
              aria-invalid={Boolean(fieldState.error)}
              value={value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              containerClassName={cn(
                "flex-wrap gap-0 gap-y-2",
                wrapperClassName || "w-full"
              )}
            >
              {/* Each cell is its own group so the strip can wrap onto a new row. */}
              {Array.from({ length: totalCells }, (_, i) => (
                <InputOTPGroup key={i}>
                  <InputOTPSlot
                    index={i}
                    className={cn(
                      cellHeightClassName,
                      "w-10 shrink-0 rounded-none border font-semibold text-slate-900 shadow-none ring-sky-500 first:rounded-none last:rounded-none",
                      borderColor,
                      i !== 0 && "-ml-px",
                      align === "center" ? "justify-center" : "justify-start pl-2 pr-1",
                      inputClassName
                    )}
                  />
                </InputOTPGroup>
              ))}
            </InputOTP>
            {errorMessage}
          </div>
        );
      }}
    />
  );
}

export default AdmissionBoxedInput;
