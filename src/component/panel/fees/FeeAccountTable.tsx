import { Ban, RotateCcw, Tag, Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { formatRupees } from "../../../utils/feeStructure";
import {
  feeTotals,
  isLineClosed,
  lineDue,
  lineMonthLabel,
  maxDiscount as maxDiscountOf,
} from "../../../utils/feeAccount";
import type { FeeAccount, FeeLine } from "../../../utils/type";

interface FeeAccountTableProps {
  account: FeeAccount;
  selected: string[];
  onSelectedChange: (lineIds: string[]) => void;
  onDiscount: (line: FeeLine) => void;
  onWaive: (line: FeeLine, waived: boolean) => void;
  onRemove: (line: FeeLine) => void;
  disabled?: boolean;
}

const actionClass =
  "rounded-full p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40";

function lineStatus(line: FeeLine): { label: string; className: string } {
  if (line.carriedTo) {
    return { label: `Carried to ${line.carriedTo}`, className: "bg-indigo-100 text-indigo-700" };
  }
  if (line.waived) return { label: "Waived", className: "bg-gray-100 text-gray-600" };
  const due = lineDue(line);
  if (due === 0) return { label: "Paid", className: "bg-green-100 text-green-700" };
  if (line.paid > 0) return { label: "Part paid", className: "bg-amber-100 text-amber-700" };
  return { label: "Due", className: "bg-red-100 text-red-700" };
}

/**
 * Summary tiles and every line of a fee account. Lines that still owe money
 * can be ticked to pay or waive them; each line has its discount / waive
 * actions (and remove, for an extra charge nothing was paid on).
 */
function FeeAccountTable({
  account,
  selected,
  onSelectedChange,
  onDiscount,
  onWaive,
  onRemove,
  disabled,
}: FeeAccountTableProps) {
  const totals = feeTotals(account.lines);
  const dueIds = account.lines.filter((line) => lineDue(line) > 0).map((line) => line.id);
  const allSelected = dueIds.length > 0 && dueIds.every((id) => selected.includes(id));

  const toggle = (lineId: string, checked: boolean) =>
    onSelectedChange(
      checked
        ? account.lines.filter((line) => line.id === lineId || selected.includes(line.id)).map((line) => line.id)
        : selected.filter((id) => id !== lineId)
    );

  const tiles = [
    { label: "Total Fee", value: totals.amount, className: "text-gray-800" },
    { label: "Discount", value: totals.discount, className: "text-blue-700" },
    { label: "Paid", value: totals.paid, className: "text-green-700" },
    { label: "Due", value: totals.due, className: "text-red-600" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tile.label}</p>
            <p className={`mt-1 text-xl font-bold ${tile.className}`}>{formatRupees(tile.value)}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="w-10 px-3 py-2">
                <Checkbox
                  aria-label="Select every due line"
                  checked={allSelected}
                  disabled={disabled || dueIds.length === 0}
                  onCheckedChange={(checked) => onSelectedChange(checked === true ? dueIds : [])}
                />
              </th>
              <th className="px-3 py-2 font-semibold">Fee</th>
              <th className="px-3 py-2 font-semibold">Month</th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
              <th className="px-3 py-2 text-right font-semibold">Discount</th>
              <th className="px-3 py-2 text-right font-semibold">Paid</th>
              <th className="px-3 py-2 text-right font-semibold">Due</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {account.lines.map((line) => {
              const due = lineDue(line);
              const status = lineStatus(line);
              const checked = selected.includes(line.id);
              return (
                <tr
                  key={line.id}
                  className={`${checked ? "bg-blue-50/60" : ""} ${isLineClosed(line) ? "text-gray-400" : ""}`}
                >
                  <td className="px-3 py-2">
                    <Checkbox
                      aria-label={`Pay ${line.label} ${lineMonthLabel(line, account.session)}`}
                      checked={checked}
                      disabled={disabled || due === 0}
                      onCheckedChange={(value) => toggle(line.id, value === true)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className={`font-medium ${isLineClosed(line) ? "text-gray-500" : "text-gray-800"}`}>{line.label}</p>
                    {line.discountReason && !line.waived && (
                      <p className="text-xs text-blue-700">Discount: {line.discountReason}</p>
                    )}
                    {line.waived && line.waiveReason && (
                      <p className="text-xs text-gray-500">Waived: {line.waiveReason}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{lineMonthLabel(line, account.session) || "-"}</td>
                  <td className="px-3 py-2 text-right">{formatRupees(line.amount)}</td>
                  <td className="px-3 py-2 text-right">{line.discount ? formatRupees(line.discount) : "-"}</td>
                  <td className="px-3 py-2 text-right">{line.paid ? formatRupees(line.paid) : "-"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{due ? formatRupees(due) : "-"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {!isLineClosed(line) && (
                        <button
                          type="button"
                          disabled={disabled || (maxDiscountOf(line) === 0 && line.discount === 0)}
                          onClick={() => onDiscount(line)}
                          title="Discount"
                          aria-label={`Discount on ${line.label}`}
                          className={`${actionClass} text-blue-600 hover:bg-blue-50`}
                        >
                          <Tag className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={disabled || Boolean(line.carriedTo) || (!line.waived && due === 0)}
                        onClick={() => onWaive(line, !line.waived)}
                        title={line.waived ? "Undo waive" : "Waive (fee maafi)"}
                        aria-label={`${line.waived ? "Undo waive of" : "Waive"} ${line.label}`}
                        className={`${actionClass} ${line.waived ? "text-green-600 hover:bg-green-50" : "text-amber-600 hover:bg-amber-50"}`}
                      >
                        {line.waived ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </button>
                      {line.head === "extra" && (
                        <button
                          type="button"
                          disabled={disabled || line.paid > 0}
                          onClick={() => onRemove(line)}
                          title={line.paid > 0 ? "Money is paid on this charge" : "Remove extra charge"}
                          aria-label={`Remove ${line.label}`}
                          className={`${actionClass} text-red-600 hover:bg-red-50`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FeeAccountTable;
