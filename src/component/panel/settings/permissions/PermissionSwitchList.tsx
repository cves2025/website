import { Switch } from "@/components/ui/switch";
import {
  TEACHER_PERMISSION_GROUPS,
  type Permission,
} from "../../../../permissions";

export interface PermissionTag {
  label: string;
  className: string;
}

export const TAG_DEFAULT: PermissionTag = {
  label: "Default",
  className: "bg-gray-100 text-gray-600",
};
export const TAG_CLASS_TEACHER: PermissionTag = {
  label: "Class teacher",
  className: "bg-blue-100 text-blue-700",
};
export const TAG_CUSTOM: PermissionTag = {
  label: "Custom",
  className: "bg-amber-100 text-amber-800",
};

interface PermissionSwitchListProps {
  isOn: (permission: Permission) => boolean;
  onToggle: (permission: Permission, next: boolean) => void;
  /** Small tag next to the label (e.g. "Default" / "Custom"). */
  tagFor?: (permission: Permission) => PermissionTag | null;
  /** A reason string disables the switch and is shown under the label. */
  lockedReason?: (permission: Permission) => string | null;
  disabled?: boolean;
}

/** Every teacher permission of the catalog, grouped, with an ON / OFF switch. */
function PermissionSwitchList({
  isOn,
  onToggle,
  tagFor,
  lockedReason,
  disabled = false,
}: PermissionSwitchListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {TEACHER_PERMISSION_GROUPS.map((group) => (
        <div key={group.label} className="rounded-lg border border-gray-200">
          <h3 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700">
            {group.label}
          </h3>
          <div className="divide-y divide-gray-100 px-4">
            {group.items.map((item) => {
              const checked = isOn(item.permission);
              const tag = tagFor?.(item.permission) ?? null;
              const locked = lockedReason?.(item.permission) ?? null;
              return (
                <div
                  key={item.permission}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-700">
                      {item.label}
                      {tag && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.className}`}
                        >
                          {tag.label}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {locked ?? item.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`text-xs font-semibold ${
                        checked ? "text-green-700" : "text-gray-500"
                      }`}
                    >
                      {checked ? "ON" : "OFF"}
                    </span>
                    <Switch
                      checked={checked}
                      onCheckedChange={(next) => onToggle(item.permission, next)}
                      disabled={disabled || locked !== null}
                      aria-label={item.label}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PermissionSwitchList;
