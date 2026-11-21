/**
 * Staff Attendance > Register (admin): a month of every teacher (and
 * non-teaching staff when allowed): one code per day and the totals
 * (working days, present, late, half day, leave, absent, "X lates = 1 half
 * day", days worked). Download Excel gives the same grid + the times.
 * Rules of the codes: utils/staffRegister.ts.
 */
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { format } from "date-fns";
import { FileSpreadsheet } from "lucide-react";

import { COLLECTION, STAFF_REGISTER_CODES } from "../../../constants";
import Button from "../../../custom-components/Button";
import CustomSelect from "../../../custom-components/CustomSelect";
import Loader from "../../../custom-components/Loader";
import PageHeader from "../../../custom-components/PageHeader";
import Tooltip from "../../../custom-components/Tooltip";
import useHolidayCalendar from "../../../hooks/useHolidayCalendar";
import { useStaffAttendanceSettings, useStaffMonth, useStaffPeople } from "../../../hooks/useStaffAttendance";
import { datesOfMonth, fromDateKey, sessionMonths, sessionOfDate, todayKey } from "../../../utils/holidayCalendar";
import { registerDays, summarizeRegister } from "../../../utils/staffRegister";
import { exportStaffRegisterExcel, type RegisterRow } from "../../../utils/staffRegisterExcel";

/** This session's and the last session's months up to this month, newest first. */
function monthOptions() {
  const thisMonth = todayKey().slice(0, 7);
  const session = sessionOfDate(todayKey());
  const previous = `${Number(session.slice(0, 4)) - 1}-${session.slice(2, 4)}`;
  return [...sessionMonths(previous), ...sessionMonths(session)]
    .filter((month) => month <= thisMonth)
    .reverse()
    .map((month) => ({ value: month, label: format(fromDateKey(`${month}-01`), "MMMM yyyy") }));
}

const SUMMARY_HEADS = ["Work", "P", "L", "HD", "LV", "A"] as const;

function StaffRegister() {
  const months = useMemo(monthOptions, []);
  const { control } = useForm<{ month: string }>({ defaultValues: { month: months[0]?.value ?? "" } });
  const month = useWatch({ control, name: "month" });
  const dates = useMemo(() => datesOfMonth(month), [month]);
  const today = todayKey();

  const { settings, loading: settingsLoading } = useStaffAttendanceSettings();
  const { people, loading: peopleLoading, error: peopleError } = useStaffPeople(settings.includeStaff);
  const { records, loading, error } = useStaffMonth(month);
  const { calendar, loading: calendarLoading } = useHolidayCalendar(sessionOfDate(`${month}-01`), COLLECTION.STAFF_HOLIDAYS);

  const rows = useMemo<RegisterRow[]>(
    () =>
      people.map((person) => {
        const days = registerDays(dates, calendar, records[person.uid] ?? {}, today);
        return {
          person,
          days,
          summary: summarizeRegister(days, {
            lateToHalfDay: settings.lateToHalfDay,
            checkOut: settings.checkOut,
            today,
          }),
        };
      }),
    [people, dates, calendar, records, today, settings.lateToHalfDay, settings.checkOut]
  );

  const busy = loading || peopleLoading || calendarLoading || settingsLoading;
  const showLateHalf = settings.lateToHalfDay > 0;

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Staff Register"
        titleStyle="text-primaryBlue"
        description="The month of every teacher. A past working day without check-in is Absent."
        descriptionStyle="text-gray-500"
        button={
          <Button
            variant="cves"
            size="md"
            buttonStyle="rounded-md"
            disabled={busy || rows.length === 0}
            onClick={() =>
              exportStaffRegisterExcel(rows, dates, {
                month,
                lateToHalfDay: settings.lateToHalfDay,
                checkOut: settings.checkOut,
              })
            }
            buttonName={
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Download Excel
              </span>
            }
          />
        }
      />

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <CustomSelect control={control} name="month" label="Month" placeholder={null} options={months} wrapperClassName="sm:w-56" />
        <div className="flex flex-wrap gap-2 text-xs">
          {(["P", "L", "HD", "LV", "A", "H"] as const).map((code) => (
            <span key={code} className={`rounded px-2 py-1 font-semibold ${STAFF_REGISTER_CODES[code].cell}`}>
              {code} = {STAFF_REGISTER_CODES[code].label}
            </span>
          ))}
          {showLateHalf && (
            <span className="rounded bg-gray-50 px-2 py-1 font-semibold text-gray-600">
              {settings.lateToHalfDay} lates = 1 half day
            </span>
          )}
        </div>
      </div>

      {busy ? (
        <Loader label="Loading the register..." />
      ) : error || peopleError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error || peopleError}</div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">No teachers yet.</p>
      ) : (
        <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-max min-w-full border-collapse text-xs">
            <thead className="bg-navy text-white">
              <tr>
                <th className="sticky left-0 z-10 bg-navy px-3 py-2 text-left">Name</th>
                {dates.map((date) => (
                  <th key={date} className="w-8 px-1 py-2 text-center font-semibold">
                    <div>{format(fromDateKey(date), "d")}</div>
                    <div className="font-normal opacity-75">{format(fromDateKey(date), "EEEEE")}</div>
                  </th>
                ))}
                {SUMMARY_HEADS.map((head) => (
                  <th key={head} className="px-2 py-2 text-center">
                    {head}
                  </th>
                ))}
                {showLateHalf && <th className="px-2 py-2 text-center">L→HD</th>}
                {settings.checkOut && <th className="px-2 py-2 text-center">No out</th>}
                <th className="px-2 py-2 text-center">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ person, days, summary }) => (
                <tr key={person.uid}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-semibold text-gray-800">
                    {person.name}
                  </td>
                  {days.map((day) => {
                    const meta = STAFF_REGISTER_CODES[day.code];
                    const tip = day.holiday
                      ? day.holiday
                      : day.record?.leaveType
                        ? day.record.leaveType
                        : day.record?.checkIn?.at
                          ? `In ${format(new Date(day.record.checkIn.at), "hh:mm a")}${
                              day.record.checkOut?.at ? ` · Out ${format(new Date(day.record.checkOut.at), "hh:mm a")}` : ""
                            }`
                          : meta.label;
                    return (
                      <td key={day.date} className={`px-0.5 py-1 text-center font-semibold ${meta.cell}`}>
                        {day.code ? (
                          <Tooltip content={tip || meta.label}>
                            <span className="block cursor-default">{day.code === "H" ? "·" : day.code}</span>
                          </Tooltip>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="px-2 text-center">{summary.workingDays}</td>
                  <td className="px-2 text-center">{summary.present}</td>
                  <td className="px-2 text-center">{summary.late}</td>
                  <td className="px-2 text-center">{summary.halfDay}</td>
                  <td className="px-2 text-center">{summary.leave}</td>
                  <td className="px-2 text-center text-red-700">{summary.absent}</td>
                  {showLateHalf && <td className="px-2 text-center">{summary.lateHalfDays}</td>}
                  {settings.checkOut && <td className="px-2 text-center text-amber-700">{summary.noCheckOut}</td>}
                  <td className="px-2 text-center font-bold text-gray-800">{summary.daysWorked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default StaffRegister;
