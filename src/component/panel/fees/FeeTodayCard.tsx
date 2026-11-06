import { useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { startOfMonth } from "date-fns";
import { FaRupeeSign } from "react-icons/fa";

import { myContext } from "../../context/MyContextProvider";
import { PERMISSIONS } from "../../../permissions";
import {
  FEE_COLLECT_PATH,
  FEE_COLLECTION_REPORT_PATH,
  FEE_DUES_REPORT_PATH,
} from "../../../constants";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toDateKey, todayKey } from "../../../utils/holidayCalendar";
import { formatRupees, monthLabel } from "../../../utils/feeStructure";
import { currentSessionMonth, duesUpTo, summarizeCollection } from "../../../utils/feeReport";
import useCollectionReport from "../../../hooks/useCollectionReport";
import useDuesReport from "../../../hooks/useDuesReport";
import Loader from "../../../custom-components/Loader";

const session = generateAcademicYears()[0]?.value ?? "";

/**
 * Dues of the whole school. Loaded only on request: it reads every student
 * and fee account of the session.
 */
function DuesSummary() {
  const [show, setShow] = useState(false);
  const { rows, loading, error } = useDuesReport(session, "", "", show);
  const month = currentSessionMonth(session);

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="w-full rounded-lg border border-dashed border-gray-300 p-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
      >
        Show dues till {monthLabel(month)}
      </button>
    );
  }
  if (loading) return <Loader fullScreen={false} size="sm" label="Loading dues..." />;
  if (error) return <p className="p-3 text-sm text-red-600">{error}</p>;

  const dues = rows.map((row) => duesUpTo(row.account, month).due).filter((due) => due > 0);
  const total = dues.reduce((sum, due) => sum + due, 0);
  return (
    <NavLink
      to={FEE_DUES_REPORT_PATH}
      className="block rounded-lg bg-red-50 p-3 hover:bg-red-100"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
        Due till {monthLabel(month)}
      </p>
      <p className="text-xl font-bold text-red-700">{formatRupees(total)}</p>
      <p className="text-xs text-red-700">
        {dues.length} of {rows.length} students · View report →
      </p>
    </NavLink>
  );
}

/** Today's and this month's collection, and the dues. */
function FeeSummary() {
  const today = todayKey();
  const { payments, loading, error } = useCollectionReport(
    toDateKey(startOfMonth(new Date())),
    today
  );

  const month = summarizeCollection(payments);
  const day = summarizeCollection(payments.filter((payment) => payment.date === today));
  const dayModes = Object.entries(day.byMode).filter(([, amount]) => amount > 0);

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
            <FaRupeeSign className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Fee Collection</h3>
        </div>
        <NavLink to={FEE_COLLECT_PATH} className="text-sm font-semibold text-primaryBlue hover:underline">
          Collect Fee →
        </NavLink>
      </div>

      {loading ? (
        <Loader fullScreen={false} size="sm" />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NavLink
            to={FEE_COLLECTION_REPORT_PATH}
            className="rounded-lg bg-green-50 p-3 hover:bg-green-100"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Today</p>
            <p className="text-xl font-bold text-green-700">{formatRupees(day.total)}</p>
            <p className="text-xs text-green-700">
              {day.receipts} receipt(s)
              {dayModes.length > 0 &&
                ` · ${dayModes.map(([mode, amount]) => `${mode} ${formatRupees(amount)}`).join(", ")}`}
            </p>
          </NavLink>
          <NavLink
            to={FEE_COLLECTION_REPORT_PATH}
            className="rounded-lg bg-blue-50 p-3 hover:bg-blue-100"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">This month</p>
            <p className="text-xl font-bold text-blue-700">{formatRupees(month.total)}</p>
            <p className="text-xs text-blue-700">{month.receipts} receipt(s)</p>
          </NavLink>
          <DuesSummary />
        </div>
      )}
    </div>
  );
}

/** Dashboard card, only for users who manage fees (nothing is read otherwise). */
function FeeTodayCard() {
  const { can } = useContext(myContext);
  return can(PERMISSIONS.FEE_MANAGE) ? <FeeSummary /> : null;
}

export default FeeTodayCard;
