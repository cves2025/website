import { format } from "date-fns";
import { Printer } from "lucide-react";
import { Link } from "react-router-dom";

import Loader from "../../../custom-components/Loader";
import { FEE_RECEIPT_PATH } from "../../../constants";
import { formatRupees } from "../../../utils/feeStructure";
import { fromDateKey } from "../../../utils/holidayCalendar";
import type { FeePayment } from "../../../utils/type";

interface PaymentHistoryProps {
  payments: FeePayment[];
  loading: boolean;
  error: string | null;
}

/** Receipts of a fee account, newest first, each with a print link. */
function PaymentHistory({ payments, loading, error }: PaymentHistoryProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <h2 className="border-b border-gray-100 p-4 font-bold text-gray-800">
        Payment history ({payments.length})
      </h2>
      {loading ? (
        <Loader label="Loading payments..." />
      ) : error ? (
        <p className="p-4 text-sm text-red-700">{error}</p>
      ) : payments.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-500">No payment yet in this session.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">
                  {payment.receiptNo}
                  <span className="ml-2 font-bold text-green-700">{formatRupees(payment.amount)}</span>
                  {payment.status === "cancelled" && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Cancelled
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {format(fromDateKey(payment.date), "d MMM yyyy")} · {payment.mode}
                  {payment.reference ? ` (${payment.reference})` : ""} ·{" "}
                  {payment.allocations.map((item) => item.label).join(", ")}
                </p>
              </div>
              <Link
                to={`${FEE_RECEIPT_PATH}?id=${encodeURIComponent(payment.id)}`}
                className="flex shrink-0 items-center gap-2 self-start rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:self-auto"
              >
                <Printer className="h-4 w-4" />
                Receipt
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PaymentHistory;
