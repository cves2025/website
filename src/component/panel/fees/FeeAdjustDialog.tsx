import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

import Modal from "../../../custom-components/Modal";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import { myContext } from "../../context/MyContextProvider";
import { CVES_BUTTON, SESSION_MONTHS, SESSION_MONTH_OPTIONS } from "../../../constants";
import { formatRupees, toAmount } from "../../../utils/feeStructure";
import {
  applyDiscount,
  applyExtraCharge,
  applyFeeStructure,
  applySpecialMonthlyFee,
  applyTransport,
  applyWaive,
  lineTitle,
  maxDiscount,
  removeExtraCharge,
} from "../../../utils/feeAccount";
import type { FeeChange } from "../../../utils/feeAccount";
import { updateFeeAccount } from "../../../utils/feeService";
import type { FeeAccount, FeeLine, FeeStructure } from "../../../utils/type";
import { inputClass, labelClass } from "../attendance/attendanceShared";

/** Which adjustment dialog is open on the Collect Fee page. */
export type FeeAdjustment =
  | { kind: "special" }
  | { kind: "transport" }
  | { kind: "extra" }
  | { kind: "refresh" }
  | { kind: "discount"; line: FeeLine }
  | { kind: "waive"; lineIds: string[]; waived: boolean }
  | { kind: "removeExtra"; line: FeeLine };

interface FeeAdjustDialogProps {
  adjustment: FeeAdjustment | null;
  account: FeeAccount;
  structure: FeeStructure;
  onClose: () => void;
  /** Called after a change is saved. */
  onSaved: () => void;
}

const NO_MONTH = "none";

const TITLES: Record<FeeAdjustment["kind"], string> = {
  special: "Special Monthly Fee",
  transport: "Transport Fee",
  extra: "Add Extra Charge",
  refresh: "Refresh from Fee Structure",
  discount: "Discount",
  waive: "Waive Fee",
  removeExtra: "Remove Extra Charge",
};

/**
 * Every adjustment of a fee account in one dialog: special monthly fee,
 * transport, extra charge, discount, waive / undo waive, removing an extra
 * charge and refreshing from the fee structure. Each one is saved with a
 * change-log entry.
 */
function FeeAdjustDialog({ adjustment, account, structure, onClose, onSaved }: FeeAdjustDialogProps) {
  const { user } = useContext(myContext);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [label, setLabel] = useState("");
  const [fromMonth, setFromMonth] = useState("4");
  const [toMonth, setToMonth] = useState("3");
  const [month, setMonth] = useState(NO_MONTH);
  const [saving, setSaving] = useState(false);

  const classMonthly = structure.classes[account.className]?.monthly ?? 0;

  // Each dialog opens with the account's current values.
  useEffect(() => {
    if (!adjustment) return;
    setReason("");
    setLabel("");
    setMonth(NO_MONTH);
    if (adjustment.kind === "special") {
      setAmount(account.specialMonthlyFee !== null ? String(account.specialMonthlyFee) : "");
    } else if (adjustment.kind === "transport") {
      setAmount(account.transport ? String(account.transport.amount) : "");
      setFromMonth(String(account.transport?.fromMonth ?? 4));
      setToMonth(String(account.transport?.toMonth ?? 3));
    } else if (adjustment.kind === "discount") {
      setAmount(adjustment.line.discount ? String(adjustment.line.discount) : "");
      setReason(adjustment.line.discountReason);
    } else {
      setAmount("");
    }
  }, [adjustment, account]);

  if (!adjustment) return null;

  const save = async (change: (current: FeeAccount) => FeeChange, message: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const skipped = await updateFeeAccount(account, change, {
        uid: user.uid,
        name: user.fullName || user.email || "",
      });
      toast.success(message);
      if (skipped) {
        toast.error(
          `${skipped} fee line(s) were left as they are because money is already paid on them.`
        );
      }
      onSaved();
      onClose();
    } catch (cause) {
      console.error("Failed to update fee account:", cause);
      toast.error(
        cause instanceof Error && cause.message === "FEE_DISCOUNT_TOO_HIGH"
          ? "The discount is more than the unpaid amount of the fee."
          : "Could not save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const value = toAmount(amount);
  const needReason = () => {
    if (reason.trim()) return true;
    toast.error("Enter the reason.");
    document.getElementById("adjustReason")?.focus();
    return false;
  };

  const handleSubmit = () => {
    switch (adjustment.kind) {
      case "special":
        if (!value) {
          toast.error("Enter the monthly fee, or use Remove to go back to the class fee.");
          return;
        }
        return void save(
          (current) => applySpecialMonthlyFee(current, classMonthly, value),
          "Special monthly fee saved."
        );
      case "transport": {
        if (!value) {
          toast.error("Enter the transport fee per month.");
          return;
        }
        const from = Number(fromMonth);
        const to = Number(toMonth);
        if (SESSION_MONTHS.indexOf(to) < SESSION_MONTHS.indexOf(from)) {
          toast.error("The last month cannot be before the first month.");
          return;
        }
        return void save(
          (current) => applyTransport(current, { amount: value, fromMonth: from, toMonth: to }),
          "Transport fee saved."
        );
      }
      case "extra":
        if (!label.trim()) {
          toast.error("Enter the name of the charge.");
          document.getElementById("adjustLabel")?.focus();
          return;
        }
        if (!value) {
          toast.error("Enter the amount.");
          return;
        }
        return void save(
          (current) =>
            applyExtraCharge(current, label, value, month === NO_MONTH ? null : Number(month)),
          "Extra charge added."
        );
      case "refresh":
        return void save(
          (current) => applyFeeStructure(current, structure),
          "Fees refreshed from the fee structure."
        );
      case "discount": {
        if (value > maxDiscount(adjustment.line)) {
          toast.error(`The discount can be at most ${formatRupees(maxDiscount(adjustment.line))}.`);
          return;
        }
        if (value && !needReason()) return;
        return void save(
          (current) => applyDiscount(current, adjustment.line.id, value, reason),
          value ? "Discount saved." : "Discount removed."
        );
      }
      case "waive":
        if (adjustment.waived && !needReason()) return;
        return void save(
          (current) => applyWaive(current, adjustment.lineIds, adjustment.waived, reason),
          adjustment.waived ? "Fee waived." : "Waive undone."
        );
      case "removeExtra":
        return void save(
          (current) => removeExtraCharge(current, adjustment.line.id),
          "Extra charge removed."
        );
    }
  };

  const waiveTitles =
    adjustment.kind === "waive"
      ? account.lines
          .filter((line) => adjustment.lineIds.includes(line.id))
          .map((line) => lineTitle(line, account.session))
      : [];

  const description: Record<FeeAdjustment["kind"], string> = {
    special: `The monthly fee this student pays every month instead of the class fee (${formatRupees(classMonthly)}).`,
    transport: "The same amount is charged for every month in the range.",
    extra: "Re-admission, annual charge or any other fee for this student.",
    refresh: `Update the monthly, exam and admission fees to the current ${account.session} fee structure. Special fee, transport, discounts and extra charges stay as they are.`,
    discount:
      adjustment.kind === "discount"
        ? `${lineTitle(adjustment.line, account.session)} - at most ${formatRupees(maxDiscount(adjustment.line))}. Enter 0 to remove the discount.`
        : "",
    waive:
      adjustment.kind === "waive"
        ? `${adjustment.waived ? "Waive" : "Undo the waive of"}: ${waiveTitles.join(", ")}.${adjustment.waived ? " Whatever is still due on these fees is let go." : " These fees become due again."}`
        : "",
    removeExtra:
      adjustment.kind === "removeExtra"
        ? `Remove "${lineTitle(adjustment.line, account.session)}" from this account?`
        : "",
  };

  const showAmount = ["special", "transport", "extra", "discount"].includes(adjustment.kind);
  const showReason = adjustment.kind === "discount" || (adjustment.kind === "waive" && adjustment.waived);
  const canRemove =
    (adjustment.kind === "special" && account.specialMonthlyFee !== null) ||
    (adjustment.kind === "transport" && account.transport !== null);

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      title={TITLES[adjustment.kind]}
      description={description[adjustment.kind]}
      cancelText="Cancel"
      submitText={
        adjustment.kind === "removeExtra"
          ? "Remove"
          : adjustment.kind === "refresh"
            ? "Refresh"
            : adjustment.kind === "waive"
              ? adjustment.waived
                ? "Waive"
                : "Undo Waive"
              : "Save"
      }
      submitClassName={CVES_BUTTON}
      loading={saving}
      onSubmit={handleSubmit}
      secondaryText={canRemove ? "Remove" : undefined}
      secondaryClassName="border border-red-300 text-red-600 hover:bg-red-50"
      onSecondarySubmit={
        canRemove
          ? () =>
              void save(
                (current) =>
                  adjustment.kind === "special"
                    ? applySpecialMonthlyFee(current, classMonthly, null)
                    : applyTransport(current, null),
                adjustment.kind === "special"
                  ? "Back to the class monthly fee."
                  : "Transport fee removed."
              )
          : undefined
      }
    >
      <div className="mt-4 grid grid-cols-1 gap-3 empty:hidden sm:grid-cols-2">
        {adjustment.kind === "extra" && (
          <div className="sm:col-span-2">
            <label htmlFor="adjustLabel" className={labelClass}>
              Charge name <span className="ml-0.5 text-red-500">*</span>
            </label>
            <input
              id="adjustLabel"
              className={inputClass}
              placeholder="e.g. Re-admission Fee, Annual Charge"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
        )}
        {showAmount && (
          // The discount amount is the only field, so it takes the full row.
          <div className={adjustment.kind === "discount" ? "sm:col-span-2" : ""}>
            <label htmlFor="adjustAmount" className={labelClass}>
              {adjustment.kind === "special" || adjustment.kind === "transport"
                ? "Amount per month (₹)"
                : adjustment.kind === "discount"
                  ? "Discount (₹)"
                  : "Amount (₹)"}
            </label>
            <input
              id="adjustAmount"
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass}
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        )}
        {adjustment.kind === "extra" && (
          <div>
            <label htmlFor="adjustMonth" className={labelClass}>Month</label>
            <SelectDropdown
              id="adjustMonth"
              value={month}
              onValueChange={setMonth}
              options={[{ value: NO_MONTH, label: "No month" }, ...SESSION_MONTH_OPTIONS]}
            />
          </div>
        )}
        {adjustment.kind === "transport" && (
          <>
            <div>
              <label htmlFor="adjustFrom" className={labelClass}>From month</label>
              <SelectDropdown
                id="adjustFrom"
                value={fromMonth}
                onValueChange={setFromMonth}
                options={SESSION_MONTH_OPTIONS}
              />
            </div>
            <div>
              <label htmlFor="adjustTo" className={labelClass}>To month</label>
              <SelectDropdown
                id="adjustTo"
                value={toMonth}
                onValueChange={setToMonth}
                options={SESSION_MONTH_OPTIONS}
              />
            </div>
          </>
        )}
        {showReason && (
          <div className="sm:col-span-2">
            <label htmlFor="adjustReason" className={labelClass}>
              Reason {adjustment.kind === "waive" || value ? <span className="ml-0.5 text-red-500">*</span> : null}
            </label>
            <input
              id="adjustReason"
              className={inputClass}
              maxLength={150}
              placeholder={adjustment.kind === "waive" ? "e.g. Parent request, approved by Principal" : "e.g. Sibling, Staff ward"}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

export default FeeAdjustDialog;
