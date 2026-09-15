import {
  Control,
  FieldValues,
  FieldPath,
  RegisterOptions,
  useController,
} from "react-hook-form";

/**
 * Admission-form style session input ("Session : 20 ▁ - 20 ▁").
 *
 * startName holds the two-digit session start (e.g. "26"),
 * endName holds the two-digit session end (e.g. "27"). The full
 * academic year label ("2026-27") is composed at submit time.
 */
interface AdmissionSessionInputProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  startName: FieldPath<T>;
  endName: FieldPath<T>;
  rules?: RegisterOptions<T, FieldPath<T>>;
}

function AdmissionSessionInput<T extends FieldValues = FieldValues>({
  control,
  startName,
  endName,
  rules = {},
}: AdmissionSessionInputProps<T>) {
  const start = useController({ control, name: startName, rules });
  const end = useController({ control, name: endName, rules });

  const errorMessage =
    start.fieldState.error?.message ?? end.fieldState.error?.message;

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    start.field.onChange(digits);
    end.field.onChange(digits ? String(Number(digits) + 1).slice(-2) : "");
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <span>Session : 20</span>
        <input
          id={startName}
          maxLength={2}
          inputMode="numeric"
          aria-invalid={Boolean(start.fieldState.error)}
          className={`w-8 border-0 border-b bg-transparent px-0.5 py-0.5 text-center text-sm font-semibold text-slate-900 focus:outline-none ${
            start.fieldState.error ? "border-red-500" : "border-slate-500"
          }`}
          {...start.field}
          onChange={(e) => handleChange(e.target.value)}
        />
        <span>- 20</span>
        <input
          id={endName}
          maxLength={2}
          inputMode="numeric"
          readOnly
          aria-invalid={Boolean(end.fieldState.error)}
          className={`w-8 border-0 border-b bg-transparent px-0.5 py-0.5 text-center text-sm font-semibold text-slate-500 focus:outline-none ${
            end.fieldState.error ? "border-red-500" : "border-slate-500"
          }`}
          {...end.field}
        />
      </div>
      {errorMessage && (
        <p className="text-xs font-medium text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}

export default AdmissionSessionInput;