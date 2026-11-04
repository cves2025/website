import { useState } from "react";
import { Link } from "react-router-dom";
import { format, startOfMonth } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";

import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import DatePicker from "../../../custom-components/DatePicker";
import Loader from "../../../custom-components/Loader";
import {
  FEE_HEAD_LABELS,
  FEE_RECEIPT_PATH,
  PAYMENT_MODES,
  PAYMENT_MODE_OPTIONS,
} from "../../../constants";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { formatRupees } from "../../../utils/feeStructure";
import { fromDateKey, toDateKey, todayKey } from "../../../utils/holidayCalendar";
import { summarizeCollection } from "../../../utils/feeReport";
import { exportCollectionExcel } from "../../../utils/feeExport";
import useCollectionReport from "../../../hooks/useCollectionReport";
import type { FeeHead } from "../../../utils/type";
import { labelClass } from "../attendance/attendanceShared";

const ALL = "all";
const MODE_FILTER = [{ value: ALL, label: "All modes" }, ...PAYMENT_MODE_OPTIONS];

const dateLabel = (key: string) => format(fromDateKey(key), "d MMM yyyy");

/**
 * Collection Report (admin only): the fee received in a date range - total,
 * split by payment mode and by fee head - and the list of receipts.
 * Cancelled receipts are listed but not counted.
 */
function CollectionReport() {
  const [from, setFrom] = useState(todayKey);
  const [to, setTo] = useState(todayKey);
  const [mode, setMode] = useState(ALL);
  const { payments, loading, error } = useCollectionReport(from, to);

  const shown = mode === ALL ? payments : payments.filter((payment) => payment.mode === mode);
  const summary = summarizeCollection(shown);
  const heads = (Object.keys(FEE_HEAD_LABELS) as FeeHead[]).filter((head) => summary.byHead[head]);

  const setRange = (start: string, end: string) => {
    setFrom(start);
    setTo(end);
  };

  const quickRanges = [
    { label: "Today", onClick: () => setRange(todayKey(), todayKey()) },
    { label: "This month", onClick: () => setRange(toDateKey(startOfMonth(new Date())), todayKey()) },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="print:hidden">
        <PageHeader
          title="Collection Report"
          titleStyle="text-primaryBlue"
          description="Fee received in a date range, by payment mode and fee head."
          descriptionStyle="text-gray-500"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="collectionFrom" className={labelClass}>From</label>
            <DatePicker
              id="collectionFrom"
              max={todayKey()}
              value={from}
              onChange={(value) => setRange(value, to < value ? value : to)}
            />
          </div>
          <div>
            <label htmlFor="collectionTo" className={labelClass}>To</label>
            <DatePicker id="collectionTo" min={from} max={todayKey()} value={to} onChange={setTo} />
          </div>
          <div>
            <label htmlFor="collectionMode" className={labelClass}>Payment mode</label>
            <SelectDropdown id="collectionMode" value={mode} onValueChange={setMode} options={MODE_FILTER} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {quickRanges.map((range) => (
              <button
                key={range.label}
                type="button"
                onClick={range.onClick}
                className="rounded-full border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {range.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || shown.length === 0}
              onClick={() =>
                exportCollectionExcel(shown, {
                  from,
                  to,
                  modeLabel: mode === ALL ? "All modes" : mode,
                })
              }
              className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              type="button"
              disabled={loading || shown.length === 0}
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader label="Loading collection..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <>
          <h2 className="hidden text-lg font-bold print:block">
            Collection Report · {dateLabel(from)}
            {from === to ? "" : ` to ${dateLabel(to)}`}
            {mode === ALL ? "" : ` · ${mode}`}
          </h2>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <div className="col-span-2 rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Total collected</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{formatRupees(summary.total)}</p>
              <p className="text-xs text-green-700">
                {summary.receipts} receipt(s){summary.cancelled ? ` · ${summary.cancelled} cancelled` : ""}
              </p>
            </div>
            {PAYMENT_MODES.map((paymentMode) => (
              <div key={paymentMode} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{paymentMode}</p>
                <p className="mt-1 text-lg font-bold text-gray-800">
                  {formatRupees(summary.byMode[paymentMode])}
                </p>
              </div>
            ))}
          </div>

          {heads.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white">
              <h2 className="border-b border-gray-100 p-4 font-bold text-gray-800">By fee head</h2>
              <ul className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0">
                {heads.map((head) => (
                  <li key={head} className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-gray-700">{FEE_HEAD_LABELS[head]}</span>
                    <span className="font-semibold">{formatRupees(summary.byHead[head] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white print:overflow-visible">
            {shown.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No fee received in this period.</p>
            ) : (
              <table className="w-full min-w-[760px] text-sm print:min-w-0 print:text-xs">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Receipt No.</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Student</th>
                    <th className="px-3 py-2 font-semibold">Class</th>
                    <th className="px-3 py-2 font-semibold">Mode</th>
                    <th className="px-3 py-2 font-semibold">Received by</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shown.map((payment) => {
                    const cancelled = payment.status === "cancelled";
                    return (
                      <tr key={payment.id} className={`break-inside-avoid ${cancelled ? "text-gray-400" : ""}`}>
                        <td className="px-3 py-2">
                          <Link
                            to={`${FEE_RECEIPT_PATH}?id=${encodeURIComponent(payment.id)}`}
                            className="font-semibold text-primaryBlue hover:underline print:text-black print:no-underline"
                          >
                            {payment.receiptNo}
                          </Link>
                          {cancelled && (
                            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Cancelled
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{dateLabel(payment.date)}</td>
                        <td className="px-3 py-2">{payment.studentName}</td>
                        <td className="px-3 py-2">
                          {toOrdinalLabel(payment.className)}-{payment.section}
                        </td>
                        <td className="px-3 py-2">
                          {payment.mode}
                          {payment.reference ? ` (${payment.reference})` : ""}
                        </td>
                        <td className="px-3 py-2">{payment.collectedByName || "-"}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${cancelled ? "line-through" : ""}`}>
                          {formatRupees(payment.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td className="px-3 py-2" colSpan={6}>
                      Total ({summary.receipts} receipts)
                    </td>
                    <td className="px-3 py-2 text-right text-green-700">{formatRupees(summary.total)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default CollectionReport;
