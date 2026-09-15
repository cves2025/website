import {
  Controller,
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
  useFormState,
} from "react-hook-form";
import { KeyboardEvent, ClipboardEvent, MutableRefObject } from "react";

interface DatePartProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: "DATE" | "MONTH" | "YEAR";
  cells: number;
  maxLength: number;
  rules?: RegisterOptions<T, FieldPath<T>>;
  startIndex: number;
  totalCells: number;
  inputsRef: MutableRefObject<Array<HTMLInputElement | null>>;
}

function DatePart<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  cells,
  maxLength,
  rules = {},
  startIndex,
  totalCells,
  inputsRef,
}: DatePartProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const invalid = Boolean(fieldState.error);
        const value: string = field.value ?? "";
        const chars = Array.from({ length: cells }, (_, i) => value[i] ?? "");

        const commitValue = (nextChars: string[]) => {
          field.onChange(nextChars.join("").slice(0, maxLength));
        };

        const focusGlobal = (globalIndex: number) => {
          if (globalIndex < 0 || globalIndex >= totalCells) return;
          const el = inputsRef.current[globalIndex];
          if (el) el.focus();
        };

        const handleChange = (i: number, raw: string) => {
          const digit = raw.replace(/\D/g, "").slice(-1);
          if (!digit && raw !== "") return; // non-numeric key press ignore

          const nextChars = [...chars];
          nextChars[i] = digit;
          commitValue(nextChars);

          if (digit) {
            if (i < cells - 1) {
              focusGlobal(startIndex + i + 1);
            } else {
              focusGlobal(startIndex + cells);
            }
          }
        };

        const handleKeyDown = (
          i: number,
          e: KeyboardEvent<HTMLInputElement>,
        ) => {
          if (e.key === "Backspace") {
            if (chars[i]) {
              const nextChars = [...chars];
              nextChars[i] = "";
              commitValue(nextChars);
            } else if (i > 0) {
              const nextChars = [...chars];
              nextChars[i - 1] = "";
              commitValue(nextChars);
              focusGlobal(startIndex + i - 1);
            } else {
              focusGlobal(startIndex - 1);
            }
            e.preventDefault();
          } else if (e.key === "ArrowLeft") {
            focusGlobal(startIndex + i - 1);
            e.preventDefault();
          } else if (e.key === "ArrowRight") {
            focusGlobal(startIndex + i + 1);
            e.preventDefault();
          }
        };

        const handlePaste = (
          i: number,
          e: ClipboardEvent<HTMLInputElement>,
        ) => {
          e.preventDefault();
          const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
          const nextChars = [...chars];
          let cursor = i;
          for (const ch of pasted) {
            if (cursor >= cells) break;
            nextChars[cursor] = ch;
            cursor += 1;
          }
          commitValue(nextChars);
          if (cursor >= cells) {
            focusGlobal(startIndex + cells);
          } else {
            focusGlobal(startIndex + cursor);
          }
        };

        return (
          <div className="flex-1">
            <p className="text-xs text-center mb-1">{label}</p>
            <div className="flex border border-sky-500">
              {chars.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[startIndex + i] = el;
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  value={char}
                  aria-invalid={invalid}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={(e) => handlePaste(i, e)}
                  onBlur={field.onBlur}
                  className={`h-9 w-5 flex-1 border-0 bg-transparent text-center text-sm font-semibold text-slate-900 placeholder-gray-400 focus:outline-none focus:bg-sky-50 ${
                    i !== cells - 1 ? "border-r border-sky-500" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}

interface AdmissionDateOfBirthProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  dayName: FieldPath<T>;
  monthName: FieldPath<T>;
  yearName: FieldPath<T>;
  /** Validation rules (applied to the YEAR box, the composite's key part). */
  rules?: RegisterOptions<T, FieldPath<T>>;
  className?: string;
}

function AdmissionDateOfBirth<T extends FieldValues = FieldValues>({
  control,
  dayName,
  monthName,
  yearName,
  rules = {},
  className = "",
}: AdmissionDateOfBirthProps<T>) {
  const DAY_CELLS = 2;
  const MONTH_CELLS = 2;
  const YEAR_CELLS = 4;
  const totalCells = DAY_CELLS + MONTH_CELLS + YEAR_CELLS;
  const inputsRef = {
    current: Array(totalCells).fill(null),
  } as unknown as import("react").MutableRefObject<
    Array<HTMLInputElement | null>
  >;

  // YEAR field ka error state seedha yahan (parent mein) nikala — DatePart ke
  // andar nahi — taaki error message poore row ke neeche, DATE se shuru
  // hoke, ek hi line mein render ho sake.
  const { errors } = useFormState({ control, name: yearName });
  const yearError = errors[yearName as unknown as keyof typeof errors];

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex gap-2 items-start">
        <DatePart
          control={control}
          name={dayName}
          label="DATE"
          cells={DAY_CELLS}
          maxLength={DAY_CELLS}
          startIndex={0}
          totalCells={totalCells}
          inputsRef={inputsRef}
        />
        <DatePart
          control={control}
          name={monthName}
          label="MONTH"
          cells={MONTH_CELLS}
          maxLength={MONTH_CELLS}
          startIndex={DAY_CELLS}
          totalCells={totalCells}
          inputsRef={inputsRef}
        />
        <DatePart
          control={control}
          name={yearName}
          label="YEAR"
          cells={YEAR_CELLS}
          maxLength={YEAR_CELLS}
          startIndex={DAY_CELLS + MONTH_CELLS}
          totalCells={totalCells}
          rules={rules}
          inputsRef={inputsRef}
        />
      </div>
      {yearError?.message && (
        <p className="text-xs font-medium text-red-600">
          {String(yearError.message)}
        </p>
      )}
    </div>
  );
}

export default AdmissionDateOfBirth;
