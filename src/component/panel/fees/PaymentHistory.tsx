import { format } from "date-fns";
import { Printer, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

import Loader from "../../../custom-components/Loader";
import { FEE_RECEIPT_PATH } from "../../../constants";
import { formatRupees } from "../../../utils/feeStructure";
import { fromDateKey } from "../../../utils/holidayCalendar";
import type { FeePayment, PaymentMode } from "../../../utils/type";

interface PaymentHistoryProps {
  payments: FeePayment[];
  loading: boolean;
  error: string | null;
  onCancel: (payment: FeePayment) => void;
}

const MODE_CLASS: Record<PaymentMode, string> = {
  Cash: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  UPI: "bg-violet-50 text-violet-700 ring-violet-200",
  Cheque: "bg-amber-50 text-amber-700 ring-amber-200",
  "Bank Transfer": "bg-sky-50 text-sky-700 ring-sky-200",
};

/** Receipts of a fee account, newest first, each with print and cancel. */
function PaymentHistory({ payments, loading, error, onCancel }: PaymentHistoryProps) {
  const active = payments.filter((payment) => payment.status === "active");
  const collected = active.reduce((sum, payment) => sum + payment.amount, 0);
  const cancelled = payments.length - active.length;

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 p-4">
        <h2 className="font-bold text-gray-800">Payment history</h2>
        {payments.length > 0 && (
          <p className="text-xs text-gray-500">
            {active.length} receipt{active.length === 1 ? "" : "s"} ·{" "}
            <span className="font-semibold text-green-700">{formatRupees(collected)}</span> collected
            {cancelled > 0 && <span className="text-red-600"> · {cancelled} cancelled</span>}
          </p>
        )}
      </div>

      {loading ? (
        <Loader label="Loading payments..." />
      ) : error ? (
        <p className="p-4 text-sm text-red-700">{error}</p>
      ) : payments.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-500">No payment yet in this session.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Receipt</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Mode</th>
                <th className="px-3 py-2 font-semibold">Fees paid</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => {
                const isCancelled = payment.status === "cancelled";
                return (
                  <tr key={payment.id} className={`align-top ${isCancelled ? "bg-red-50/40" : ""}`}>
                    <td className="px-3 py-2.5">
                      <p className={`font-semibold ${isCancelled ? "text-gray-500" : "text-gray-800"}`}>
                        {payment.receiptNo}
                      </p>
                      {payment.collectedByName && (
                        <p className="text-xs text-gray-500">by {payment.collectedByName}</p>
                      )}
                      {isCancelled && (
                        <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                      {format(fromDateKey(payment.date), "d MMM yyyy")}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${MODE_CLASS[payment.mode]}`}
                      >
                        {payment.mode}
                      </span>
                      {payment.reference && (
                        <p className="mt-1 break-all text-xs text-gray-500">Ref: {payment.reference}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {payment.allocations.map((item) => (
                          <span
                            key={item.lineId}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {item.label}
                            <span className="font-semibold tabular-nums">{formatRupees(item.amount)}</span>
                          </span>
                        ))}
                      </div>
                      {payment.note && <p className="mt-1 text-xs italic text-gray-500">Note: {payment.note}</p>}
                      {isCancelled && (
                        <p className="mt-1 text-xs text-red-600">
                          Cancelled by {payment.cancelledByName || "-"}: {payment.cancelReason || "-"}
                        </p>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2.5 text-right text-base font-bold tabular-nums ${
                        isCancelled ? "text-gray-400 line-through" : "text-green-700"
                      }`}
                    >
                      {formatRupees(payment.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`${FEE_RECEIPT_PATH}?id=${encodeURIComponent(payment.id)}`}
                          title="Print receipt"
                          aria-label={`Print receipt ${payment.receiptNo}`}
                          className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-primaryBlue"
                        >
                          <Printer className="h-4 w-4" />
                        </Link>
                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => onCancel(payment)}
                            title="Cancel receipt"
                            aria-label={`Cancel receipt ${payment.receiptNo}`}
                            className="rounded-full p-1.5 text-red-600 transition-colors hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
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
      )}
    </section>
  );
}

export default PaymentHistory;
