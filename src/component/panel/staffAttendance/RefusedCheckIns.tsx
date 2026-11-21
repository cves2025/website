/**
 * Refused check-ins (tries to cheat) of a period on Staff Attendance: Today,
 * Yesterday, Last 7 days, This month, Last month or own dates; counts by
 * reason, then the list (newest first).
 */
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { format } from "date-fns";

import {
  STAFF_LOG_LIMIT,
  STAFF_LOG_PERIODS,
  STAFF_REFUSED_LABELS,
  type StaffLogPeriod,
} from "../../../constants";
import CustomSelect from "../../../custom-components/CustomSelect";
import DatePicker from "../../../custom-components/DatePicker";
import Loader from "../../../custom-components/Loader";
import { useRefusedLog } from "../../../hooks/useStaffAttendance";
import { fromDateKey, todayKey } from "../../../utils/holidayCalendar";
import { staffLogRange } from "../../../utils/staffLogRange";

const PERIOD_OPTIONS = STAFF_LOG_PERIODS.map((item) => ({
  value: item.value,
  label: item.label,
}));

function RefusedCheckIns() {
  const today = todayKey();
  const { control, setValue } = useForm<{
    period: StaffLogPeriod;
    from: string;
    to: string;
  }>({
    defaultValues: { period: "today", from: today, to: today },
  });
  const period = useWatch({ control, name: "period" });
  const from = useWatch({ control, name: "from" });
  const to = useWatch({ control, name: "to" });
  const range = staffLogRange(period, today, { from, to });
  const { entries, loading, error } = useRefusedLog(range.from, range.to);

  const byReason = useMemo(
    () =>
      Object.entries(
        entries.reduce<Record<string, number>>((counts, entry) => {
          counts[entry.code] = (counts[entry.code] ?? 0) + 1;
          return counts;
        }, {}),
      ),
    [entries],
  );
  const oneDay = range.from === range.to;

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        {/* Title left, period right: like the dashboard cards. */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="mr-auto font-bold text-gray-800">
            Refused check-ins
            {!loading && !error && (
              <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                {entries.length}
                {entries.length >= STAFF_LOG_LIMIT ? "+" : ""}
              </span>
            )}
          </h2>
          <div className="w-40 shrink-0">
            <CustomSelect
              control={control}
              name="period"
              placeholder={null}
              options={PERIOD_OPTIONS}
              className="py-1.5"
            />
          </div>
        </div>
        {period === "custom" && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:ml-auto sm:max-w-md sm:grid-cols-2">
            <div>
              <label
                htmlFor="refusedFrom"
                className="mb-1.5 block text-sm font-semibold text-gray-700"
              >
                From
              </label>
              <DatePicker
                id="refusedFrom"
                value={from}
                max={today}
                onChange={(value) => {
                  if (!value) return;
                  setValue("from", value);
                  if (to < value) setValue("to", value);
                }}
              />
            </div>
            <div>
              <label
                htmlFor="refusedTo"
                className="mb-1.5 block text-sm font-semibold text-gray-700"
              >
                To
              </label>
              <DatePicker
                id="refusedTo"
                value={to}
                min={from}
                max={today}
                onChange={(value) => value && setValue("to", value)}
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <Loader label="Loading refused check-ins..." />
      ) : error ? (
        <p className="p-4 text-sm text-red-700">{error}</p>
      ) : entries.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">None in this period.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {byReason.map(([code, count]) => (
              <span
                key={code}
                className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700"
              >
                {STAFF_REFUSED_LABELS[code] || code}: {count}
              </span>
            ))}
          </div>
          <ul className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {entry.name}{" "}
                    <span className="ml-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {STAFF_REFUSED_LABELS[entry.code] || entry.code}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {entry.message}
                    {entry.model ? ` · ${entry.model}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-gray-500">
                  {oneDay
                    ? ""
                    : `${format(fromDateKey(entry.date), "d MMM")}, `}
                  {entry.at ? format(new Date(entry.at), "hh:mm a") : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default RefusedCheckIns;
