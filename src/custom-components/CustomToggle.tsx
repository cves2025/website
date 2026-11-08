import { useController, Control, FieldValues, FieldPath } from "react-hook-form";
import { Switch } from "@/components/ui/switch";

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
  disabled?: boolean;
  /** Name for screen readers when there is no visible label. */
  ariaLabel?: string;
}

/**
 * Reusable toggle/switch (shadcn/ui Switch, pink when on) built on
 * react-hook-form's useController. The field is
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
  disabled = false,
  ariaLabel,
}: CustomToggleProps<T>) {
  const { field } = useController<T, FieldPath<T>>({ control, name });

  const isActive = String(field.value) === activeValue;
  const stateLabel = isActive ? activeLabel : inactiveLabel;

  return (
    <div className={`flex w-full flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-semibold text-gray-700"
        >
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        {/* Keeps the RHF field ref registered for validation purposes. */}
        <input ref={field.ref} type="hidden" aria-hidden="true" tabIndex={-1} />
        <Switch
          id={name}
          checked={isActive}
          disabled={disabled}
          aria-label={ariaLabel}
          onCheckedChange={(checked) =>
            onChange?.(checked ? activeValue : inactiveValue)
          }
        />
        {/* Empty labels (e.g. in a table) draw nothing, so the switch stays centred. */}
        {stateLabel && (
          <span
            className={`text-sm font-semibold ${
              isActive ? "text-green-700" : "text-gray-600"
            }`}
          >
            {stateLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default CustomToggle;