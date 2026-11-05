import { Ban, Check, Lock, RotateCcw, Tag, Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { formatRupees, monthLabel } from "../../../utils/feeStructure";
import {
  accountMonths,
  blockingLine,
  blockingMonth,
  isLineClosed,
  lineDue,
  lineMonthLabel,
  maxDiscount as maxDiscountOf,
  monthDue,
  monthYear,
  sessionMonthRank,
  tickMonth,
  untickLine,
} from "../../../utils/feeAccount";
import type { FeeAccount, FeeLine } from "../../../utils/type";

interface FeeAccountCardsProps {
  account: FeeAccount;
  /** Ticked line ids (what is being paid now). */
  selected: string[];
  onSelectedChange: (lineIds: string[]) => void;
  /** Months picked to see their fees. */
  selectedMonths: number[];
  onSelectedMonthsChange: (months: number[]) => void;
  onDiscount: (line: FeeLine) => void;
  onWaive: (line: FeeLine, waived: boolean) => void;
  onRemove: (line: FeeLine) => void;
  disabled?: boolean;
}

const actionClass =
  "rounded-full p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30";

const shortMonth = (month: number) => monthLabel(month).slice(0, 3);

/** Paid in full (not waived): ticked for good; undone only by cancelling the receipt. */
const isPaidLine = (line: FeeLine) => !isLineClosed(line) && lineDue(line) === 0;

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

/** Discount / waive / remove buttons of one line. */
function LineActions({
  line,
  fullName,
  disabled,
  onDiscount,
  onWaive,
  onRemove,
}: {
  line: FeeLine;
  fullName: string;
  disabled?: boolean;
  onDiscount: (line: FeeLine) => void;
  onWaive: (line: FeeLine, waived: boolean) => void;
  onRemove: (line: FeeLine) => void;
}) {
  const due = lineDue(line);
  return (
    <div className="flex justify-end gap-0.5">
      {!isLineClosed(line) && (
        <button
          type="button"
          disabled={disabled || (maxDiscountOf(line) === 0 && line.discount === 0)}
          onClick={() => onDiscount(line)}
          title="Discount"
          aria-label={`Discount on ${fullName}`}
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
        aria-label={`${line.waived ? "Undo waive of" : "Waive"} ${fullName}`}
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
          aria-label={`Remove ${fullName}`}
          className={`${actionClass} text-red-600 hover:bg-red-50`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * The fee account to pay from:
 * - Months: pick one or more months (in order - a month opens once every
 *   earlier month is cleared or picked). A month paid in full stays ticked.
 * - Fee info: every fee of the picked months as a row, each with its own
 *   tick (a parent may pay the monthly fee and leave transport due) and its
 *   discount / waive actions. The same fee is paid month after month.
 * - Other fees: fees without a month (admission, previous dues ...).
 */
function FeeAccountCards({
  account,
  selected,
  onSelectedChange,
  selectedMonths,
  onSelectedMonthsChange,
  onDiscount,
  onWaive,
  onRemove,
  disabled,
}: FeeAccountCardsProps) {
  const { lines, session } = account;
  const ticked = new Set(selected);
  const months = accountMonths(lines);
  const pickedMonths = [...selectedMonths].sort((a, b) => sessionMonthRank(a) - sessionMonthRank(b));
  const otherLines = lines.filter((line) => line.month === null);

  // Keeps the ticked lines in account order, which is the order they are paid in.
  const setTicked = (ids: Set<string>) =>
    onSelectedChange(lines.filter((line) => ids.has(line.id)).map((line) => line.id));

  const toggleMonth = (month: number) => {
    if (selectedMonths.includes(month)) {
      // Dropping a month drops every later month too, so the order holds.
      const rank = sessionMonthRank(month);
      const keep = selectedMonths.filter((item) => sessionMonthRank(item) < rank);
      const next = new Set(ticked);
      lines.forEach((line) => {
        if (line.month !== null && sessionMonthRank(line.month) >= rank) next.delete(line.id);
      });
      onSelectedMonthsChange(keep);
      setTicked(next);
      return;
    }
    if (blockingMonth(lines, month, selectedMonths) !== null) return;
    onSelectedMonthsChange([...selectedMonths, month]);
    setTicked(tickMonth(lines, month, ticked));
  };

  const toggleLine = (line: FeeLine, checked: boolean) => {
    if (checked) {
      if (blockingLine(lines, line, ticked)) return;
      setTicked(new Set(ticked).add(line.id));
    } else {
      setTicked(untickLine(lines, line, ticked));
    }
  };

  const otherDueIds = otherLines.filter((line) => lineDue(line) > 0).map((line) => line.id);
  const allOtherTicked = otherDueIds.length > 0 && otherDueIds.every((id) => ticked.has(id));
  const tickedInMonths = lines
    .filter((line) => line.month !== null && ticked.has(line.id))
    .reduce((sum, line) => sum + lineDue(line), 0);

  return (
    <>
      {months.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold text-gray-800">Months</h2>
            <span className="text-xs text-gray-500">
              Pick one or more months · paid in order, April first
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
            {months.map((month) => {
              const monthLines = lines.filter((line) => line.month === month);
              const due = monthDue(lines, month);
              const picked = selectedMonths.includes(month);
              const locked = due === 0 && !monthLines.some((line) => line.waived);
              const blocker = picked ? null : blockingMonth(lines, month, selectedMonths);
              const partPaid = due > 0 && monthLines.some((line) => line.paid > 0 || isLineClosed(line));
              const year = monthYear(session, month);

              const tone = locked
                ? "border-green-300 bg-green-50 cursor-default"
                : picked
                  ? "border-primaryBlue bg-indigo-50 ring-1 ring-primaryBlue"
                  : blocker !== null
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                    : "border-gray-200 bg-white hover:border-primaryBlue/50 hover:bg-indigo-50/40";

              return (
                <button
                  key={month}
                  type="button"
                  aria-pressed={picked || locked}
                  disabled={disabled || locked || blocker !== null}
                  onClick={() => toggleMonth(month)}
                  title={
                    locked
                      ? "Paid. Cancel the receipt to undo."
                      : blocker !== null
                        ? `Clear ${monthLabel(blocker)} first`
                        : undefined
                  }
                  className={`flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors disabled:cursor-not-allowed ${tone}`}
                >
                  <span className="flex w-full items-center justify-between gap-1">
                    <span className="text-sm font-bold text-gray-800">
                      {shortMonth(month)} <span className="text-[11px] font-medium text-gray-400">{year}</span>
                    </span>
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                        locked
                          ? "border-green-600 bg-green-600 text-white"
                          : picked
                            ? "border-primaryBlue bg-primaryBlue text-white"
                            : "border-gray-300 bg-white text-gray-400"
                      }`}
                    >
                      {locked || picked ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : blocker !== null ? (
                        <Lock className="h-2.5 w-2.5" />
                      ) : null}
                    </span>
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${due ? "text-gray-800" : "text-green-700"}`}
                  >
                    {due ? formatRupees(due) : "Paid"}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {monthLines.length} fee{monthLines.length === 1 ? "" : "s"}
                    {partPaid && <span className="ml-1 font-semibold text-amber-700">· part due</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {months.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 p-4">
            <h2 className="font-bold text-gray-800">Fee info</h2>
            {pickedMonths.length > 0 && (
              <span className="text-xs text-gray-500">
                Untick a fee to leave it due · ticked{" "}
                <span className="font-semibold text-primaryBlue">{formatRupees(tickedInMonths)}</span>
              </span>
            )}
          </div>
          {pickedMonths.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              Pick a month above to see its fees.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 font-semibold">Fee</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                    <th className="px-3 py-2 text-right font-semibold">Discount</th>
                    <th className="px-3 py-2 text-right font-semibold">Paid</th>
                    <th className="px-3 py-2 text-right font-semibold">Due</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                {pickedMonths.map((month) => (
                  <tbody key={month} className="divide-y divide-gray-100 border-t border-gray-200">
                    <tr className="bg-indigo-50/50">
                      <td colSpan={8} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primaryBlue">
                        {monthLabel(month)} {monthYear(session, month)}
                        <span className="ml-2 font-semibold normal-case tracking-normal text-gray-500">
                          due {formatRupees(monthDue(lines, month))}
                        </span>
                      </td>
                    </tr>
                    {lines
                      .filter((line) => line.month === month)
                      .map((line) => {
                        const due = lineDue(line);
                        const closed = isLineClosed(line);
                        const paid = isPaidLine(line);
                        const checked = paid || ticked.has(line.id);
                        const blocker = checked || closed ? null : blockingLine(lines, line, ticked);
                        const status = lineStatus(line);
                        const fullName = `${line.label} ${lineMonthLabel(line, session)}`;
                        return (
                          <tr
                            key={line.id}
                            className={`${ticked.has(line.id) ? "bg-blue-50/60" : ""} ${closed ? "text-gray-400" : ""}`}
                          >
                            <td className="px-3 py-2">
                              <Checkbox
                                aria-label={`Pay ${fullName}`}
                                checked={checked}
                                disabled={disabled || paid || closed || blocker !== null}
                                title={
                                  paid
                                    ? "Paid. Cancel the receipt to undo."
                                    : blocker?.month
                                      ? `Pay ${blocker.label} of ${monthLabel(blocker.month)} first`
                                      : undefined
                                }
                                onCheckedChange={(value) => toggleLine(line, value === true)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <p className={`font-medium ${closed ? "text-gray-500" : "text-gray-800"}`}>
                                {line.label}
                              </p>
                              {line.discountReason && !line.waived && (
                                <p className="text-xs text-blue-700">Discount: {line.discountReason}</p>
                              )}
                              {line.waived && line.waiveReason && (
                                <p className="text-xs text-gray-500">Waived: {line.waiveReason}</p>
                              )}
                              {blocker?.month && (
                                <p className="text-xs text-amber-700">
                                  {monthLabel(blocker.month)} {blocker.label.toLowerCase()} is due first
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatRupees(line.amount)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {line.discount ? formatRupees(line.discount) : "-"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {line.paid ? formatRupees(line.paid) : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">
                              {due ? formatRupees(due) : "-"}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <LineActions
                                line={line}
                                fullName={fullName}
                                disabled={disabled}
                                onDiscount={onDiscount}
                                onWaive={onWaive}
                                onRemove={onRemove}
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </section>
      )}

      {otherLines.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold text-gray-800">Other fees</h2>
            <div className="flex items-baseline gap-3 text-xs">
              <span className="text-gray-500">One time</span>
              {otherDueIds.length > 1 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const next = new Set(ticked);
                    otherDueIds.forEach((id) => (allOtherTicked ? next.delete(id) : next.add(id)));
                    setTicked(next);
                  }}
                  className="font-semibold text-primaryBlue hover:underline disabled:opacity-50"
                >
                  {allOtherTicked ? "Untick all" : "Tick all due"}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {otherLines.map((line) => {
              const due = lineDue(line);
              const closed = isLineClosed(line);
              const paid = isPaidLine(line);
              const checked = paid || ticked.has(line.id);
              const status = lineStatus(line);
              const checkboxId = `fee-line-${line.id}`;

              return (
                <div
                  key={line.id}
                  className={`flex flex-col rounded-lg border p-2.5 transition-colors ${
                    ticked.has(line.id)
                      ? "border-primaryBlue bg-indigo-50"
                      : paid
                        ? "border-green-200 bg-green-50/60"
                        : closed
                          ? "border-gray-200 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <label
                    htmlFor={checkboxId}
                    className={`flex flex-1 flex-col gap-1 ${due > 0 && !disabled ? "cursor-pointer" : ""}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words text-xs font-semibold leading-snug text-gray-600">
                        {line.label}
                      </span>
                      <Checkbox
                        id={checkboxId}
                        aria-label={`Pay ${line.label}`}
                        checked={checked}
                        disabled={disabled || paid || closed}
                        title={paid ? "Paid. Cancel the receipt to undo." : undefined}
                        onCheckedChange={(value) => toggleLine(line, value === true)}
                      />
                    </span>
                    <span
                      className={`text-base font-bold tabular-nums ${closed ? "text-gray-400 line-through" : "text-gray-800"}`}
                    >
                      {formatRupees(line.amount - (closed ? 0 : line.discount))}
                    </span>
                    {line.discount > 0 && !closed && (
                      <span className="truncate text-[11px] text-blue-700" title={line.discountReason || undefined}>
                        Disc. {formatRupees(line.discount)}
                      </span>
                    )}
                    <span>
                      <span
                        className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-semibold ${status.className}`}
                        title={line.waived ? line.waiveReason || undefined : undefined}
                      >
                        {line.paid > 0 && due > 0 ? `Due ${formatRupees(due)}` : status.label}
                      </span>
                    </span>
                  </label>
                  <div className="mt-1.5 border-t border-gray-100 pt-1">
                    <LineActions
                      line={line}
                      fullName={line.label}
                      disabled={disabled}
                      onDiscount={onDiscount}
                      onWaive={onWaive}
                      onRemove={onRemove}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

export default FeeAccountCards;
