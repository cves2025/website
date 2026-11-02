import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface CircleCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Round shadcn/ui Checkbox (pink circle when checked) with its label. */
function CircleCheckbox({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  className,
}: CircleCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2 text-sm text-gray-700",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="h-5 w-5 rounded-full [&_svg]:h-3.5 [&_svg]:w-3.5"
      />
      {label}
    </label>
  );
}

export default CircleCheckbox;
