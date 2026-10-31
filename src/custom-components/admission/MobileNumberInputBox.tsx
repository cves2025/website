import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { InputHTMLAttributes } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

/**
 * Admission-form style "boxed cells" input for MOBILE NUMBER, built on the
 * shadcn/ui InputOTP — hard-locked to exactly 10 numeric digits.
 * Non-numeric characters are rejected on type/paste.
 */
interface MobileNumberInputBoxProps<T extends FieldValues = FieldValues>
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    | "name"
    | "value"
    | "onChange"
    | "onPaste"
    | "onKeyDown"
    | "maxLength"
    | "inputMode"
    | "pattern"
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
  /** Extra classes for each cell. */
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
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <div className="flex w-full flex-col gap-1">
          <InputOTP
            {...rest}
            id={name}
            ref={field.ref}
            maxLength={MOBILE_NUMBER_CELLS}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            pushPasswordManagerStrategy="none"
            aria-invalid={Boolean(fieldState.error)}
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            containerClassName={wrapperClassName || "w-full"}
          >
            <InputOTPGroup className="w-full">
              {Array.from({ length: MOBILE_NUMBER_CELLS }, (_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className={cn(
                    cellHeightClassName,
                    "w-5 flex-1 rounded-none font-semibold text-slate-900 shadow-none ring-sky-500 first:rounded-none last:rounded-none",
                    i === MOBILE_NUMBER_CELLS - 1 ? borderColor : dividerColor,
                    inputClassName
                  )}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {fieldState.error && (
            <p className="text-xs font-medium text-red-600">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}

export default MobileNumberInputBox;
