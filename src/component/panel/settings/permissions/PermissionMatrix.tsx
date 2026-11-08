import type { ReactNode } from "react";
import { useForm } from "react-hook-form";

import CustomToggle from "../../../../custom-components/CustomToggle";
import {
  TEACHER_PERMISSION_GROUPS,
  TEACHER_PERMISSION_ITEMS,
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

/** A grey pill in a column (e.g. "Included", "On", "Off"). */
export function Chip({ children, className = "bg-gray-100 text-gray-600" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export interface PermissionColumn {
  key: string;
  title: string;
  subtitle: string;
  isOn: (permission: Permission) => boolean;
  onToggle: (permission: Permission, on: boolean) => void;
  /** Something else instead of the switch for this row (e.g. an "Included" chip). */
  replace?: (permission: Permission) => ReactNode | null;
  /** How many rows are ON, shown under the title. */
  countOn?: boolean;
}

interface PermissionMatrixProps {
  columns: PermissionColumn[];
  /** Small tag after a permission's name (e.g. "Custom"). */
  tagFor?: (permission: Permission) => PermissionTag | null;
  disabled?: boolean;
}

/**
 * Every teacher permission of the catalog in one table, grouped like the
 * sidebar, with a switch per column (All teachers / Class teachers, or one
 * teacher). Scrolls sideways on a phone.
 */
/** Form field of one switch ("." would make a nested path). */
const fieldName = (column: string, permission: Permission) => `${column}__${permission.replace(/\./g, "_")}`;

function PermissionMatrix({ columns, tagFor, disabled = false }: PermissionMatrixProps) {
  const span = columns.length + 1;
  // The switches are CustomToggles (react-hook-form): this form mirrors what
  // is ON; a click goes to the column's onToggle, and the new state comes
  // back through `values`.
  const values: Record<string, string> = {};
  columns.forEach((column) =>
    TEACHER_PERMISSION_ITEMS.forEach((item) => {
      values[fieldName(column.key, item.permission)] = column.isOn(item.permission) ? "on" : "off";
    })
  );
  const { control } = useForm<Record<string, string>>({ values });
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e3e7f0] bg-white">
      <table className="w-full min-w-[620px] border-collapse">
        <thead>
          <tr>
            <th className="border-b border-[#e3e7f0] px-5 py-3.5 text-left align-bottom text-base font-bold text-[#1b2233]">
              Permission
            </th>
            {columns.map((column) => {
              const on = column.countOn
                ? TEACHER_PERMISSION_ITEMS.filter((item) => column.isOn(item.permission)).length
                : null;
              return (
                <th
                  key={column.key}
                  className="w-[200px] border-b border-[#e3e7f0] px-2 py-2 align-bottom"
                >
                  {/* Each column's title in its own small card. */}
                  <div className="flex flex-col items-center rounded-lg border border-[#e3e7f0] bg-[#f6f7fb] px-2.5 py-1.5 text-center">
                    <span className="text-base font-bold leading-tight text-[#1b2233]">{column.title}</span>
                    <span className="text-[13px] font-normal leading-tight text-[#566178]">{column.subtitle}</span>
                    {on !== null && (
                      // How many of the permissions are ON in this column.
                      // Bar and count on one line, so the card stays short.
                      <span className="mt-1 flex w-full items-center gap-2">
                        <span
                          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e3e7f0]"
                          role="progressbar"
                          aria-valuenow={on}
                          aria-valuemin={0}
                          aria-valuemax={TEACHER_PERMISSION_ITEMS.length}
                          aria-label={`${column.title}: ${on} of ${TEACHER_PERMISSION_ITEMS.length} on`}
                        >
                          <span
                            className="block h-full rounded-full bg-cves transition-all duration-300"
                            style={{ width: `${(on / TEACHER_PERMISSION_ITEMS.length) * 100}%` }}
                          />
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-[#c4125f]">
                          {on}/{TEACHER_PERMISSION_ITEMS.length}
                        </span>
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {TEACHER_PERMISSION_GROUPS.map((group) => [
            <tr key={`group-${group.label}`}>
              {/* Group rows (Account, School, Student ...) in navy blue. */}
              <td
                colSpan={span}
                className="bg-navy px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-white"
              >
                {group.label}
              </td>
            </tr>,
            ...group.items.map((item) => {
              const tag = tagFor?.(item.permission) ?? null;
              return (
                <tr key={item.permission} className="transition-colors hover:bg-[#fafbfd]">
                  <td className="border-b border-[#eef0f5] px-5 py-3 align-middle">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-[#1b2233]">
                      {item.label}
                      {tag && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.className}`}>
                          {tag.label}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#566178]">{item.description}</p>
                  </td>
                  {columns.map((column) => {
                    const replaced = column.replace?.(item.permission) ?? null;
                    return (
                      <td key={column.key} className="w-[200px] border-b border-[#eef0f5] px-5 py-3 text-center align-middle">
                        {replaced ?? (
                          <CustomToggle
                            control={control}
                            name={fieldName(column.key, item.permission)}
                            activeValue="on"
                            inactiveValue="off"
                            activeLabel=""
                            inactiveLabel=""
                            disabled={disabled}
                            ariaLabel={`${item.label} for ${column.title.toLowerCase()}`}
                            wrapperClassName="items-center"
                            onChange={(value) => column.onToggle(item.permission, value === "on")}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            }),
          ])}
        </tbody>
      </table>
    </div>
  );
}

export default PermissionMatrix;

/** The buttons under the table, with a note on the left. */
export function PermissionFooter({ note, children }: { note?: ReactNode; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2.5 rounded-xl bg-[#f3f5f9]/95 py-3 backdrop-blur">
      {note && <span className="mr-auto text-xs text-[#566178]">{note}</span>}
      {children}
    </div>
  );
}
