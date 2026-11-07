import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import DatePicker from "../../../custom-components/DatePicker";
import Loader from "../../../custom-components/Loader";
import Modal from "../../../custom-components/Modal";
import { myContext } from "../../context/MyContextProvider";
import {
  CLASS_OPTIONS,
  CVES_BUTTON,
  FEE_RECEIPT_PATH,
  FEE_STRUCTURE_PATH,
  PAYMENT_MODE_OPTIONS,
  SECTIONS,
} from "../../../constants";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { todayKey } from "../../../utils/holidayCalendar";
import { formatRupees, toAmount } from "../../../utils/feeStructure";
import { allocatePayment, feeTotals, keepValidSelection, lineDue } from "../../../utils/feeAccount";
import {
  FEE_OVERPAID,
  cancelFeePayment,
  collectFeePayment,
} from "../../../utils/feeService";
import useSectionStudents from "../../../hooks/useSectionStudents";
import useFeeAccount from "../../../hooks/useFeeAccount";
import useAccountPayments from "../../../hooks/useAccountPayments";
import useFeeStructure from "../../../hooks/useFeeStructure";
import useStudentPhoto from "../../../hooks/useStudentPhoto";
import useIsStuck, { scrollParentOf } from "../../../hooks/useIsStuck";
import type { FeePayment, FeeStudent, PaymentMode } from "../../../utils/type";
import { inputClass, labelClass } from "../attendance/attendanceShared";
import FeeAccountCards from "./FeeAccountCards";
import FeeStudentBar from "./FeeStudentBar";
import StudentSearch from "./StudentSearch";
import CollectFeeEmpty from "./CollectFeeEmpty";
import type { StudentBarAction } from "./FeeStudentBar";
import PaymentHistory from "./PaymentHistory";
import FeeAdjustDialog from "./FeeAdjustDialog";
import type { FeeAdjustment } from "./FeeAdjustDialog";

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
 * both work). Every payment gets a receipt number. The account is adjusted
 * here too: special monthly fee, transport, extra charges, discounts,
 * waives and cancelling a receipt, each written to the account's change log.
 */
function CollectFee() {
  const { user } = useContext(myContext);
  const navigate = useNavigate();
  // Set by the header's ₹ button: put the cursor in the student search.
  const focusSearch = (useLocation().state as { focusSearch?: number } | null)?.focusSearch;
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
  const { structure } = useFeeStructure(session);
  const studentPhoto = useStudentPhoto(picked?.studentId ?? "", picked?.photo);

  const [selected, setSelected] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<FeePayment | null>(null);
  const [adjustment, setAdjustment] = useState<FeeAdjustment | null>(null);
  const [toCancel, setToCancel] = useState<FeePayment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // The student card sits above the fees; once it scrolls out of view a slim
  // copy of it slides in at the top, and the side columns stick below that.
  const showBar = Boolean(student && account && !feeAccount.loading && !feeAccount.error && !studentsError);
  const studentBarProps = account
    ? {
        account,
        // Live from the enrollment / roll number records, not the copy
        // saved on the fee account.
        enrollmentNo: picked?.admissionNo || account.admissionNo,
        rollNumber: picked?.rollNumber ?? 0,
        fatherName: picked?.fatherName || account.fatherName,
        photo: studentPhoto,
        disabled: saving,
        onAction: (kind: StudentBarAction) => setAdjustment({ kind }),
      }
    : null;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // The bar comes in as soon as 40% of the card has scrolled away.
  const barStuck = useIsStuck(sentinelRef, showBar, 0.4);
  const [barHeight, setBarHeight] = useState(0);
  useEffect(() => {
    const bar = barRef.current;
    if (!showBar || !bar) {
      setBarHeight(0);
      return;
    }
    const observer = new ResizeObserver(() => setBarHeight(bar.offsetHeight));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [showBar]);
  const sideOffset = (barStuck ? barHeight : 0) + 12;
  const sideTop = { top: sideOffset };

  // Height of the scroll area, so a side column taller than the space left
  // below the bar scrolls inside itself instead of sliding away.
  const gridRef = useRef<HTMLDivElement>(null);
  const [viewHeight, setViewHeight] = useState(0);
  useEffect(() => {
    const scroller = gridRef.current ? scrollParentOf(gridRef.current) : null;
    const measure = () => setViewHeight(scroller ? scroller.clientHeight : window.innerHeight);
    measure();
    const observer = new ResizeObserver(measure);
    if (scroller) observer.observe(scroller);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  // The cap is used only where the column is sticky (lg:max-h below).
  const leftSideStyle = {
    top: sideOffset,
    "--side-max": viewHeight ? `${viewHeight - sideOffset - 12}px` : "none",
  } as CSSProperties;

  // A new student or session starts with a clean form.
  useEffect(() => {
    setSelected([]);
    setSelectedMonths([]);
    setForm(emptyForm());
  }, [session, studentId]);

  // After the account changes (discount, waive, cancelled receipt ...) the
  // picked months and ticks stay, minus what no longer fits the month order
  // or no longer owes money; the amount follows the ticks.
  useEffect(() => {
    if (!account || (selected.length === 0 && selectedMonths.length === 0)) return;
    const kept = keepValidSelection(account.lines, selectedMonths, selected);
    setSelectedMonths(kept.months);
    setSelected(kept.ticked);
    if (selected.length > 0) {
      const due = account.lines
        .filter((line) => kept.ticked.includes(line.id))
        .reduce((sum, line) => sum + lineDue(line), 0);
      setForm((prev) => ({ ...prev, amount: due ? String(due) : "" }));
    }
    // Runs only when a reloaded account arrives, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

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
        { uid: user.uid, name: user.fullName || user.email || "" }
      );
      setConfirmOpen(false);
      setReceipt(payment);
      setSelected([]);
      setSelectedMonths([]);
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

  // The selection is trimmed to what still fits once the account reloads.
  const refreshAccount = () => {
    feeAccount.reload();
    history.reload();
  };

  const handleCancelReceipt = async () => {
    if (!user || !toCancel) return;
    if (!cancelReason.trim()) {
      toast.error("Enter the reason for cancelling.");
      document.getElementById("cancelReason")?.focus();
      return;
    }
    setCancelling(true);
    try {
      await cancelFeePayment(toCancel, cancelReason, {
        uid: user.uid,
        name: user.fullName || user.email || "",
      });
      toast.success(`Receipt ${toCancel.receiptNo} cancelled.`);
      setToCancel(null);
      setCancelReason("");
      refreshAccount();
    } catch (cause) {
      console.error("Failed to cancel receipt:", cause);
      toast.error("Could not cancel the receipt. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const studentOptions = students.map((item) => ({
    value: item.studentId,
    label: `${item.rollNumber ? `${item.rollNumber}. ` : ""}${item.studentName}${
      item.admissionNo ? ` (${item.admissionNo})` : ""
    }`,
    keywords: `${item.admissionNo} ${item.fatherName}`,
  }));

  return (
    // On phones, room at the bottom for the fixed Collect bar.
    <div className={`flex flex-col gap-3 ${showBar && account?.lines.length ? "max-md:pb-24" : ""}`}>
      <PageHeader
        title="Collect Fee"
        titleStyle="text-primaryBlue"
        description="Pick a student, tick the fees being paid (or enter an amount) and save to get the receipt."
        descriptionStyle="text-gray-500"
      />

      {/* Slim student bar: takes no space, slides in once the card scrolls away */}
      {showBar && studentBarProps && (
        <div className="sticky top-0 z-20 -mt-3 h-0">
          <div
            ref={barRef}
            aria-hidden={!barStuck}
            // The ::before backdrop also covers <main>'s padding around the
            // bar, so nothing scrolling underneath shows through the gaps.
            // Shown with `transform: none` (not translate-y-0): a leftover
            // transform puts the bar on its own layer and blurs the text.
            className={`relative isolate pb-2 transition-[opacity,transform,visibility] duration-150 before:absolute before:-inset-x-4 before:-top-4 before:bottom-0 before:-z-10 before:bg-gray-100 before:content-[''] md:before:-inset-x-2 ${
              barStuck ? "transform-none opacity-100" : "pointer-events-none invisible -translate-y-full opacity-0"
            }`}
          >
            <FeeStudentBar variant="bar" {...studentBarProps} />
          </div>
        </div>
      )}

      <div
        ref={gridRef}
        className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_320px]"
      >
        {/* Left: who is paying; stays in view below the student bar and
            scrolls inside itself when taller than the space left. */}
        <aside
          // With no student yet it stretches with the empty card beside it,
          // so both are the same height.
          className={`flex flex-col gap-3 lg:sticky lg:max-h-[var(--side-max)] lg:overflow-y-auto lg:overscroll-contain ${
            student ? "" : "self-stretch"
          }`}
          style={leftSideStyle}
        >
          <div className="flex flex-1 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
            <div>
              <label htmlFor="collectSession" className={labelClass}>Session</label>
              <SelectDropdown
                id="collectSession"
                value={session}
                onValueChange={(value) => updateParams({ session: value, student: "" })}
                options={sessions}
              />
            </div>
            <StudentSearch
              session={session}
              focusKey={focusSearch}
              onPick={(found) =>
                updateParams({ class: found.className, section: found.section, student: found.studentId })
              }
            />
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              or pick by class
              <span className="h-px flex-1 bg-gray-200" />
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

          {account && !feeAccount.loading && totals && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4">
              {[
                { label: "Total Fee", value: totals.amount, className: "text-gray-800" },
                { label: "Discount", value: totals.discount, className: "text-blue-600" },
                { label: "Paid", value: totals.paid, className: "text-green-700" },
                { label: "Due", value: totals.due, className: "text-red-600" },
              ].map((tile) => (
                <div key={tile.label} className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {tile.label}
                  </p>
                  <p className={`text-lg font-bold tabular-nums ${tile.className}`}>
                    {formatRupees(tile.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>

        {studentsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 xl:col-span-2">
            {studentsError}
          </div>
        ) : !student ? (
          // Stretches to the height of the filter column.
          <CollectFeeEmpty className="self-stretch xl:col-span-2" />
        ) : feeAccount.loading ? (
          <div className="xl:col-span-2">
            <Loader label="Loading fee account..." />
          </div>
        ) : feeAccount.error || !account ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 xl:col-span-2">
            {feeAccount.error ?? "Fee account could not be loaded."}
          </div>
        ) : (
          <>
            {/* Middle: the fee account. Below lg it is display: contents, so its
                parts join the one-column grid and the history can go last. */}
            <div
              className={`contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3 ${account.lines.length === 0 ? "xl:col-span-2" : ""}`}
            >
              <div ref={sentinelRef}>
                {studentBarProps && <FeeStudentBar variant="card" {...studentBarProps} />}
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
                <FeeAccountCards
                  account={account}
                  selected={selected}
                  onSelectedChange={handleSelectedChange}
                  selectedMonths={selectedMonths}
                  onSelectedMonthsChange={setSelectedMonths}
                  onDiscount={(line) => setAdjustment({ kind: "discount", line })}
                  onWaive={(line, waived) => setAdjustment({ kind: "waive", lineIds: [line.id], waived })}
                  onRemove={(line) => setAdjustment({ kind: "removeExtra", line })}
                  disabled={saving}
                />
              )}

              {/* History and change log: last of all on one-column screens */}
              <div className="flex min-w-0 flex-col gap-3 max-lg:order-last">
              <PaymentHistory
                payments={history.payments}
                loading={history.loading}
                error={history.error}
                onCancel={(payment) => {
                  setCancelReason("");
                  setToCancel(payment);
                }}
              />

              {account.log.length > 0 && (
                <details className="rounded-lg border border-gray-200 bg-white">
                  <summary className="cursor-pointer p-4 font-bold text-gray-800">
                    Change log ({account.log.length})
                  </summary>
                  <ul className="divide-y divide-gray-100 border-t border-gray-100 text-sm">
                    {[...account.log].reverse().map((entry, index) => (
                      <li key={`${entry.at}-${index}`} className="px-4 py-2">
                        <p className="text-gray-800">{entry.text}</p>
                        <p className="text-xs text-gray-500">
                          {entry.at ? format(new Date(entry.at), "d MMM yyyy, h:mm a") : "-"} ·{" "}
                          {entry.byName || "-"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              </div>
            </div>

            {/* Right: take the payment; stays in view while the fees scroll */}
            {account.lines.length > 0 && (
              <aside
                className="rounded-lg border border-gray-200 bg-white p-4 lg:col-start-2 xl:sticky xl:col-start-auto"
                style={sideTop}
              >
                <h2 className="font-bold text-gray-800">Receive payment</h2>
                <p className="mb-3 mt-1 text-xs text-gray-500">
                  {selected.length ? (
                    <>
                      Selected: {selected.length} fee{selected.length === 1 ? "" : "s"} ·{" "}
                      <span className="font-semibold text-primaryBlue">{formatRupees(payable)}</span>
                    </>
                  ) : (
                    <>
                      Nothing ticked: the amount goes to the oldest dues first (total due{" "}
                      {formatRupees(payable)}).
                    </>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-3">
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
                  <div className="col-span-2">
                    <label htmlFor="payMode" className={labelClass}>Payment mode</label>
                    <SelectDropdown
                      id="payMode"
                      value={form.mode}
                      onValueChange={(mode) => setForm({ ...form, mode: mode as PaymentMode })}
                      options={PAYMENT_MODE_OPTIONS}
                    />
                  </div>
                  {needsReference && (
                    <div className="col-span-2">
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
                  <div className="col-span-2">
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
                {/* On phones the actions sit in a bar fixed to the bottom of the screen. */}
                <div className="mt-4 flex flex-col gap-2 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:mt-0 max-md:flex-row-reverse max-md:border-t max-md:border-gray-200 max-md:bg-white max-md:px-4 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:pt-3 max-md:shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
                  <button
                    type="button"
                    disabled={saving || !amount || totals?.due === 0}
                    onClick={handleReview}
                    // bg-cves: the school-colour gradient (tailwind.config.js).
                    className="rounded-md bg-cves py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 max-md:flex-1"
                  >
                    Collect {amount ? formatRupees(amount) : "Fee"}
                  </button>
                  {selected.length > 0 && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setAdjustment({ kind: "waive", lineIds: selected, waived: true })}
                      className="rounded-md border border-amber-300 bg-white py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 max-md:flex-1"
                    >
                      Waive ticked ({selected.length})
                    </button>
                  )}
                </div>
              </aside>
            )}

            <FeeAdjustDialog
              adjustment={adjustment}
              account={account}
              structure={structure}
              onClose={() => setAdjustment(null)}
              onSaved={refreshAccount}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={toCancel !== null}
        onClose={() => {
          if (!cancelling) setToCancel(null);
        }}
        title="Cancel Receipt"
        description={
          toCancel
            ? `Cancel receipt ${toCancel.receiptNo} of ${formatRupees(toCancel.amount)}? The receipt is kept (marked cancelled) and these fees become due again.`
            : ""
        }
        cancelText="Back"
        submitText="Cancel Receipt"
        submitClassName={CVES_BUTTON}
        loading={cancelling}
        onSubmit={() => void handleCancelReceipt()}
      >
        <div className="mt-4">
          <label htmlFor="cancelReason" className={labelClass}>
            Reason <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="cancelReason"
            className={inputClass}
            maxLength={150}
            placeholder="e.g. Wrong student, wrong amount"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={confirmOpen}
        onClose={() => {
          if (!saving) setConfirmOpen(false);
        }}
        title="Confirm Payment"
        description={`${formatRupees(amount)} by ${form.mode} from ${account?.studentName ?? ""}. It is adjusted as below.`}
        cancelText="Back"
        submitText="Save & Get Receipt"
        submitClassName={CVES_BUTTON}
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
        submitClassName={CVES_BUTTON}
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
