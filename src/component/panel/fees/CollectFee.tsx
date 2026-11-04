import { useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import DatePicker from "../../../custom-components/DatePicker";
import Loader from "../../../custom-components/Loader";
import Modal from "../../../custom-components/Modal";
import { myContext } from "../../context/MyContextProvider";
import {
  CLASS_OPTIONS,
  FEE_RECEIPT_PATH,
  FEE_STRUCTURE_PATH,
  PAYMENT_MODE_OPTIONS,
  SECTIONS,
} from "../../../constants";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { todayKey } from "../../../utils/holidayCalendar";
import { formatRupees, toAmount } from "../../../utils/feeStructure";
import { allocatePayment, feeTotals, lineDue } from "../../../utils/feeAccount";
import { FEE_OVERPAID, collectFeePayment } from "../../../utils/feeService";
import useSectionStudents from "../../../hooks/useSectionStudents";
import useFeeAccount from "../../../hooks/useFeeAccount";
import useAccountPayments from "../../../hooks/useAccountPayments";
import useFeeSettings from "../../../hooks/useFeeSettings";
import type { FeePayment, FeeStudent, PaymentMode } from "../../../utils/type";
import { inputClass, labelClass } from "../attendance/attendanceShared";
import FeeAccountTable from "./FeeAccountTable";
import PaymentHistory from "./PaymentHistory";

const sessions = generateAcademicYears();
const SECTION_OPTIONS = SECTIONS.map((section) => ({ value: section, label: section }));

interface PaymentForm {
  amount: string;
  date: string;
  mode: PaymentMode;
  reference: string;
  note: string;
}

const emptyForm = (): PaymentForm => ({
  amount: "",
  date: todayKey(),
  mode: "Cash",
  reference: "",
  note: "",
});

/**
 * Collect Fee (admin only): pick a student, see the fee account of the
 * session and take a payment - for ticked lines, or any amount that is
 * adjusted against the oldest due lines first (partial and advance payments
 * both work). Every payment gets a receipt number.
 */
function CollectFee() {
  const { user } = useContext(myContext);
  const navigate = useNavigate();
  // The selection lives in the URL, so it survives a trip to the receipt.
  const [params, setParams] = useSearchParams();
  const session = params.get("session") || sessions[0]?.value || "";
  const className = params.get("class") || "";
  const section = params.get("section") || "A";
  const studentId = params.get("student") || "";

  const { students, loading: studentsLoading, error: studentsError } = useSectionStudents(
    session,
    className,
    section
  );
  const picked = students.find((item) => item.studentId === studentId);
  const student = useMemo<FeeStudent | null>(
    () =>
      picked
        ? {
            studentId: picked.studentId,
            studentName: picked.studentName,
            className,
            section,
            admissionNo: picked.admissionNo,
            fatherName: picked.fatherName,
          }
        : null,
    [picked, className, section]
  );

  const feeAccount = useFeeAccount(session, student);
  const account = feeAccount.account;
  const history = useAccountPayments(feeAccount.saved && account ? account.id : "");
  const { settings, loading: settingsLoading } = useFeeSettings();

  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<FeePayment | null>(null);

  // A new student or session starts with a clean form.
  useEffect(() => {
    setSelected([]);
    setForm(emptyForm());
  }, [session, studentId]);

  const updateParams = (patch: Record<string, string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([key, value]) =>
          value ? next.set(key, value) : next.delete(key)
        );
        return next;
      },
      { replace: true }
    );

  const handleSelectedChange = (lineIds: string[]) => {
    setSelected(lineIds);
    const due = account?.lines
      .filter((line) => lineIds.includes(line.id))
      .reduce((sum, line) => sum + lineDue(line), 0);
    setForm((prev) => ({ ...prev, amount: due ? String(due) : "" }));
  };

  const totals = account ? feeTotals(account.lines) : null;
  const amount = toAmount(form.amount);
  const payable = account
    ? selected.length
      ? account.lines
          .filter((line) => selected.includes(line.id))
          .reduce((sum, line) => sum + lineDue(line), 0)
      : totals?.due ?? 0
    : 0;
  const allocations = account && amount ? allocatePayment(account, amount, selected.length ? selected : null) : [];
  const needsReference = form.mode !== "Cash";

  const handleReview = () => {
    if (!amount) {
      toast.error("Enter the amount received.");
      document.getElementById("payAmount")?.focus();
      return;
    }
    if (amount > payable) {
      toast.error(`The amount is more than the due (${formatRupees(payable)}).`);
      document.getElementById("payAmount")?.focus();
      return;
    }
    if (!form.date) {
      toast.error("Select the payment date.");
      return;
    }
    if (needsReference && !form.reference.trim()) {
      toast.error(`Enter the ${form.mode} reference number.`);
      document.getElementById("payReference")?.focus();
      return;
    }
    setConfirmOpen(true);
  };

  const handleCollect = async () => {
    if (!user || !account) return;
    setSaving(true);
    try {
      const payment = await collectFeePayment(
        account,
        {
          amount,
          lineIds: selected.length ? selected : null,
          date: form.date,
          mode: form.mode,
          reference: needsReference ? form.reference : "",
          note: form.note,
        },
        settings.receiptPrefix,
        { uid: user.uid, name: user.fullName || user.email || "" }
      );
      setConfirmOpen(false);
      setReceipt(payment);
      setSelected([]);
      setForm(emptyForm());
      feeAccount.reload();
      history.reload();
    } catch (cause) {
      console.error("Failed to collect fee:", cause);
      toast.error(
        cause instanceof Error && cause.message === FEE_OVERPAID
          ? "The fee account changed meanwhile and owes less now. Please check again."
          : "Could not save the payment. Please try again."
      );
      if (cause instanceof Error && cause.message === FEE_OVERPAID) {
        setConfirmOpen(false);
        feeAccount.reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const studentOptions = students.map((item) => ({
    value: item.studentId,
    label: `${item.rollNumber ? `${item.rollNumber}. ` : ""}${item.studentName}`,
    keywords: `${item.admissionNo} ${item.fatherName}`,
  }));

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Collect Fee"
        titleStyle="text-primaryBlue"
        description="Pick a student, tick the fees being paid (or enter an amount) and save to get the receipt."
        descriptionStyle="text-gray-500"
      />

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="collectSession" className={labelClass}>Session</label>
          <SelectDropdown
            id="collectSession"
            value={session}
            onValueChange={(value) => updateParams({ session: value, student: "" })}
            options={sessions}
          />
        </div>
        <div>
          <label htmlFor="collectClass" className={labelClass}>Class</label>
          <SelectDropdown
            id="collectClass"
            value={className}
            placeholder="Select class"
            onValueChange={(value) => updateParams({ class: value, student: "" })}
            options={CLASS_OPTIONS.map((option) => ({ ...option, label: toOrdinalLabel(option.label) }))}
          />
        </div>
        <div>
          <label htmlFor="collectSection" className={labelClass}>Section</label>
          <SelectDropdown
            id="collectSection"
            value={section}
            onValueChange={(value) => updateParams({ section: value, student: "" })}
            options={SECTION_OPTIONS}
          />
        </div>
        <div>
          <label htmlFor="collectStudent" className={labelClass}>Student</label>
          <SelectDropdown
            id="collectStudent"
            value={studentId}
            placeholder={
              !className
                ? "Select class first"
                : studentsLoading
                  ? "Loading..."
                  : students.length
                    ? "Search name / admission no."
                    : "No students"
            }
            disabled={!className || studentsLoading || students.length === 0}
            searchable
            searchPlaceholder="Name, admission no. or father"
            onValueChange={(value) => updateParams({ student: value })}
            options={studentOptions}
          />
        </div>
      </div>

      {studentsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{studentsError}</div>
      )}

      {!student ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Select a class, section and student to see the fee account.
        </p>
      ) : feeAccount.loading ? (
        <Loader label="Loading fee account..." />
      ) : feeAccount.error || !account ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {feeAccount.error ?? "Fee account could not be loaded."}
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-lg font-bold text-gray-800">{account.studentName}</p>
            <p className="text-sm text-gray-500">
              Class {toOrdinalLabel(account.className)}-{account.section} · Adm. No.{" "}
              {account.admissionNo || "-"} · Father: {account.fatherName || "-"} · Session {session}
            </p>
          </div>

          {account.lines.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No fees found for Class {toOrdinalLabel(account.className)} in {session}. Set the fees on
              the{" "}
              <Link to={FEE_STRUCTURE_PATH} className="font-semibold underline">
                Fee Structure
              </Link>{" "}
              page first.
            </div>
          ) : (
            <>
              <FeeAccountTable
                account={account}
                selected={selected}
                onSelectedChange={handleSelectedChange}
                disabled={saving}
              />

              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="mb-1 font-bold text-gray-800">Receive payment</h2>
                <p className="mb-3 text-sm text-gray-500">
                  {selected.length
                    ? `${selected.length} fee(s) ticked - due ${formatRupees(payable)}.`
                    : `Nothing ticked - the amount is adjusted against the oldest due fees first (total due ${formatRupees(payable)}).`}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label htmlFor="payAmount" className={labelClass}>
                      Amount (₹) <span className="ml-0.5 text-red-500">*</span>
                    </label>
                    <input
                      id="payAmount"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className={inputClass}
                      placeholder="0"
                      value={form.amount}
                      onChange={(event) => setForm({ ...form, amount: event.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="payDate" className={labelClass}>Date</label>
                    <DatePicker
                      id="payDate"
                      max={todayKey()}
                      value={form.date}
                      onChange={(date) => setForm({ ...form, date })}
                    />
                  </div>
                  <div>
                    <label htmlFor="payMode" className={labelClass}>Payment mode</label>
                    <SelectDropdown
                      id="payMode"
                      value={form.mode}
                      onValueChange={(mode) => setForm({ ...form, mode: mode as PaymentMode })}
                      options={PAYMENT_MODE_OPTIONS}
                    />
                  </div>
                  {needsReference && (
                    <div>
                      <label htmlFor="payReference" className={labelClass}>
                        {form.mode === "Cheque" ? "Cheque no." : "Transaction / UTR no."}{" "}
                        <span className="ml-0.5 text-red-500">*</span>
                      </label>
                      <input
                        id="payReference"
                        className={inputClass}
                        value={form.reference}
                        onChange={(event) => setForm({ ...form, reference: event.target.value })}
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label htmlFor="payNote" className={labelClass}>
                      Note <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="payNote"
                      className={inputClass}
                      maxLength={200}
                      value={form.note}
                      onChange={(event) => setForm({ ...form, note: event.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={saving || settingsLoading || !amount || totals?.due === 0}
                    onClick={handleReview}
                    className="rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Collect {amount ? formatRupees(amount) : "Fee"}
                  </button>
                </div>
              </section>
            </>
          )}

          <PaymentHistory payments={history.payments} loading={history.loading} error={history.error} />
        </>
      )}

      <Modal
        isOpen={confirmOpen}
        onClose={() => {
          if (!saving) setConfirmOpen(false);
        }}
        title="Confirm Payment"
        description={`${formatRupees(amount)} by ${form.mode} from ${account?.studentName ?? ""}. It is adjusted as below.`}
        cancelText="Back"
        submitText="Save & Get Receipt"
        loading={saving}
        onSubmit={() => void handleCollect()}
      >
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 text-sm">
          {allocations.map((item) => (
            <li key={item.lineId} className="flex justify-between gap-3 px-3 py-2">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-semibold">{formatRupees(item.amount)}</span>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        isOpen={receipt !== null}
        onClose={() => setReceipt(null)}
        title="Payment Saved"
        cancelText="Close"
        submitText="Print Receipt"
        onSubmit={() => {
          if (receipt) navigate(`${FEE_RECEIPT_PATH}?id=${encodeURIComponent(receipt.id)}`);
        }}
      >
        {receipt && (
          <div className="flex items-center gap-3 rounded-md bg-green-50 p-3 text-green-800">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-semibold">Receipt {receipt.receiptNo}</p>
              <p className="text-sm">
                {formatRupees(receipt.amount)} received from {receipt.studentName}.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CollectFee;
