import { useController, Control, FieldValues, FieldPath } from "react-hook-form";

interface CustomToggleProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  activeValue?: string;
  inactiveValue?: string;
  activeLabel?: string;
  inactiveLabel?: string;
  wrapperClassName?: string;
  /** Called with the next value (activeValue/inactiveValue). */
  onChange?: (value: string) => void;
}

/**
 * Reusable toggle/switch built on react-hook-form's useController. The field is
 * registered so its value is part of submit values. Value writes are delegated
 * to the parent form via `onChange(value)` because the public Control API does
 * not expose setValue.
 */
function CustomToggle<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  activeValue = "active",
  inactiveValue = "archived",
  activeLabel = "Active",
  inactiveLabel = "Archived",
  wrapperClassName = "",
  onChange,
}: CustomToggleProps<T>) {
  const { field } = useController<T, FieldPath<T>>({ control, name });

  const isActive = String(field.value) === activeValue;
  const toggle = () => onChange?.(isActive ? inactiveValue : activeValue);

  return (
    <div className={`flex w-full flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <span className="block text-sm font-semibold text-gray-700">{label}</span>
      )}
      <div className="flex items-center gap-3">
        {/* Keeps the RHF field ref registered for validation purposes. */}
        <input ref={field.ref} type="hidden" aria-hidden="true" tabIndex={-1} />
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`text-sm font-semibold ${
            isActive ? "text-green-700" : "text-gray-600"
          }`}
        >
          {isActive ? activeLabel : inactiveLabel}
        </span>
      </div>
    </div>
  );
}

export default CustomToggle;