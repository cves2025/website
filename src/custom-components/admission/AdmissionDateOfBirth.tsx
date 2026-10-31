import {
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
  useController,
} from "react-hook-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const DAY_CELLS = 2;
const MONTH_CELLS = 2;
const YEAR_CELLS = 4;
const TOTAL_CELLS = DAY_CELLS + MONTH_CELLS + YEAR_CELLS;

const PARTS = [
  { label: "DATE", start: 0, cells: DAY_CELLS },
  { label: "MONTH", start: DAY_CELLS, cells: MONTH_CELLS },
  { label: "YEAR", start: DAY_CELLS + MONTH_CELLS, cells: YEAR_CELLS },
] as const;

interface AdmissionDateOfBirthProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  dayName: FieldPath<T>;
  monthName: FieldPath<T>;
  yearName: FieldPath<T>;
  /** Validation rules (applied to the YEAR box, the composite's key part). */
  rules?: RegisterOptions<T, FieldPath<T>>;
  className?: string;
}

/**
 * Admission-form style DATE / MONTH / YEAR boxes (DD MM YYYY).
 *
 * Ek hi shadcn/ui InputOTP (8 digits) teen groups mein dikhaya gaya hai, isliye
 * typing apne aap DATE se MONTH aur MONTH se YEAR mein chali jaati hai.
 * Value form mein ab bhi teen alag fields (day / month / year) mein store hoti hai.
 */
function AdmissionDateOfBirth<T extends FieldValues = FieldValues>({
  control,
  dayName,
  monthName,
  yearName,
  rules = {},
  className = "",
}: AdmissionDateOfBirthProps<T>) {
  const day = useController({ control, name: dayName });
  const month = useController({ control, name: monthName });
  const year = useController({ control, name: yearName, rules });

  const value = `${day.field.value ?? ""}${month.field.value ?? ""}${
    year.field.value ?? ""
  }`;

  const handleChange = (next: string) => {
    day.field.onChange(next.slice(0, DAY_CELLS));
    month.field.onChange(next.slice(DAY_CELLS, DAY_CELLS + MONTH_CELLS));
    year.field.onChange(next.slice(DAY_CELLS + MONTH_CELLS, TOTAL_CELLS));
  };

  const handleBlur = () => {
    day.field.onBlur();
    month.field.onBlur();
    year.field.onBlur();
  };

  // YEAR field ka error poore row ke neeche, DATE se shuru hoke, ek hi line
  // mein render hota hai.
  const yearError = year.fieldState.error;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <InputOTP
        id={yearName}
        ref={year.field.ref}
        maxLength={TOTAL_CELLS}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        pushPasswordManagerStrategy="none"
        aria-invalid={Boolean(yearError)}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        containerClassName="items-start gap-2"
      >
        {PARTS.map((part) => (
          <div key={part.label} className="flex-1">
            <p className="text-xs text-center mb-1">{part.label}</p>
            <InputOTPGroup>
              {Array.from({ length: part.cells }, (_, i) => (
                <InputOTPSlot
                  key={i}
                  index={part.start + i}
                  className="h-9 w-5 flex-1 rounded-none border-sky-500 font-semibold text-slate-900 shadow-none ring-sky-500 first:rounded-none last:rounded-none"
                />
              ))}
            </InputOTPGroup>
          </div>
        ))}
      </InputOTP>
      {yearError?.message && (
        <p className="text-xs font-medium text-red-600">
          {String(yearError.message)}
        </p>
      )}
    </div>
  );
}

export default AdmissionDateOfBirth;
