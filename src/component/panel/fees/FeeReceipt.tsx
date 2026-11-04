import { useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Loader from "../../../custom-components/Loader";
import schoolLogo from "../../../assets/image/schoolLogo.jpg";
import { FEE_COLLECT_PATH, SCHOOL_CONTACT, SCHOOL_NAME } from "../../../constants";
import { amountInWords } from "../../../utils/amountInWords";
import { formatRupees } from "../../../utils/feeStructure";
import { fromDateKey } from "../../../utils/holidayCalendar";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import useFeePayment from "../../../hooks/useFeePayment";
import type { FeePayment } from "../../../utils/type";

/**
 * Printable fee receipt (`?id=` = payment id). One A4 page holds two copies,
 * for the student and for the office, with a cut line between them.
 */
function FeeReceipt() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { payment, loading, error } = useFeePayment(params.get("id") ?? "");

  // The print dialog suggests the page title as the PDF file name.
  useEffect(() => {
    if (!payment) return;
    const previous = document.title;
    document.title = `Fee Receipt ${payment.receiptNo.replace(/\//g, "-")}`;
    return () => {
      document.title = previous;
    };
  }, [payment]);

  const backToStudent = () => {
    if (!payment) return navigate(FEE_COLLECT_PATH);
    const query = new URLSearchParams({
      session: payment.session,
      class: payment.className,
      section: payment.section,
      student: payment.studentId,
    });
    navigate(`${FEE_COLLECT_PATH}?${query.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <style>{"@page { size: A4 portrait; margin: 8mm; }"}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-sm print:hidden">
        <button
          type="button"
          onClick={backToStudent}
          className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collect Fee
        </button>
        <button
          type="button"
          disabled={!payment}
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-primaryBlue px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </button>
      </div>

      {loading ? (
        <Loader label="Loading receipt..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : !payment ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Receipt not found.
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[794px] bg-white shadow-lg print:max-w-none print:shadow-none">
          <ReceiptCopy payment={payment} copyLabel="Student Copy" />
          <div className="relative my-1 border-t-2 border-dashed border-gray-400 print:my-[4mm]">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] text-gray-500">
              ✂ cut here
            </span>
          </div>
          <ReceiptCopy payment={payment} copyLabel="Office Copy" />
        </div>
      )}
    </div>
  );
}

function ReceiptCopy({ payment, copyLabel }: { payment: FeePayment; copyLabel: string }) {
  const details: [string, string][] = [
    ["Student", payment.studentName],
    ["Father's Name", payment.fatherName || "-"],
    ["Class", `${toOrdinalLabel(payment.className)} - ${payment.section}`],
    ["Admission No.", payment.admissionNo || "-"],
  ];

  return (
    <div className="relative overflow-hidden border-2 border-blue-900 p-4 text-[13px] text-black print:break-inside-avoid">
      {payment.status === "cancelled" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded border-4 border-red-500 px-6 py-1 text-5xl font-extrabold tracking-widest text-red-500/60">
            CANCELLED
          </span>
        </div>
      )}

      {/* Letterhead */}
      <div className="flex items-center gap-3 border-b-2 border-blue-900 pb-2">
        <img src={schoolLogo} alt="School logo" className="h-14 w-14 shrink-0 object-contain" />
        <div className="min-w-0 flex-1 text-center">
          <p className="text-lg font-extrabold leading-tight tracking-tight text-blue-900">{SCHOOL_NAME}</p>
          <p className="text-[11px]">
            {SCHOOL_CONTACT.ADDRESS} · Ph. {SCHOOL_CONTACT.PHONE}
          </p>
          <p className="mt-1 inline-block rounded bg-blue-900 px-4 py-0.5 text-xs font-bold tracking-wider text-white">
            FEE RECEIPT
          </p>
        </div>
        <span className="w-14 shrink-0 self-start text-right text-[10px] font-semibold uppercase text-gray-600">
          {copyLabel}
        </span>
      </div>

      {/* Receipt no. / date / session */}
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 font-semibold">
        <span>Receipt No.: {payment.receiptNo}</span>
        <span>Date: {format(fromDateKey(payment.date), "dd/MM/yyyy")}</span>
        <span>Session: {payment.session}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
        {details.map(([label, value]) => (
          <p key={label} className="truncate">
            <span className="text-gray-600">{label}:</span> <span className="font-semibold">{value}</span>
          </p>
        ))}
      </div>

      {/* Fees paid */}
      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="bg-blue-50">
            <th className="w-10 border border-gray-400 px-2 py-1 text-left">S.No.</th>
            <th className="border border-gray-400 px-2 py-1 text-left">Particulars</th>
            <th className="w-28 border border-gray-400 px-2 py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payment.allocations.map((item, index) => (
            <tr key={item.lineId}>
              <td className="border border-gray-400 px-2 py-0.5">{index + 1}</td>
              <td className="border border-gray-400 px-2 py-0.5">{item.label}</td>
              <td className="border border-gray-400 px-2 py-0.5 text-right">{formatRupees(item.amount)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="border border-gray-400 px-2 py-1" colSpan={2}>
              Total
            </td>
            <td className="border border-gray-400 px-2 py-1 text-right">{formatRupees(payment.amount)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-1.5">
        <span className="text-gray-600">In words:</span>{" "}
        <span className="font-semibold">{amountInWords(payment.amount)}</span>
      </p>
      <p>
        <span className="text-gray-600">Payment mode:</span>{" "}
        <span className="font-semibold">
          {payment.mode}
          {payment.reference ? ` (Ref. ${payment.reference})` : ""}
        </span>
        {payment.note && (
          <>
            {" "}
            · <span className="text-gray-600">Note:</span> {payment.note}
          </>
        )}
      </p>

      <div className="mt-6 flex items-end justify-between text-xs">
        <span className="text-gray-600">Received by: {payment.collectedByName || "-"}</span>
        <span className="border-t border-black px-6 pt-0.5 font-semibold">Authorised Signatory</span>
      </div>
    </div>
  );
}

export default FeeReceipt;
