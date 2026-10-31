import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
} from "react-hook-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

/**
 * Admission-form style 6-cell PIN CODE input.
 *
 * Reproduces the exact "6 boxes" look from the paper form using the
 * shadcn/ui InputOTP — typing fills one box at a time, Backspace / arrow
 * keys / paste work across boxes. Only numeric (0-9) digits are accepted.
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
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <div className={`flex flex-col gap-1 ${className}`}>
          <InputOTP
            id={name}
            ref={field.ref}
            maxLength={PIN_CELLS}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            pushPasswordManagerStrategy="none"
            aria-invalid={Boolean(fieldState.error)}
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
          >
            <InputOTPGroup>
              {Array.from({ length: PIN_CELLS }, (_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="h-8 w-7 rounded-none border-slate-400 font-semibold text-slate-900 shadow-none ring-sky-500 first:rounded-none last:rounded-none"
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

export default AdmissionPinInput;
