/**
 * Excel of the monthly staff register (Staff Attendance > Register): one row
 * per person, one column per day (P / L / HD / A / LV / H) and the totals,
 * then the check-in / check-out times on a second sheet.
 */
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { fromDateKey } from "./holidayCalendar";
import type { RegisterDay, RegisterSummary } from "./staffRegister";
import type { StaffPerson } from "./type";

export interface RegisterRow {
  person: StaffPerson;
  days: RegisterDay[];
  summary: RegisterSummary;
}

const time = (ms: number | null | undefined) => (ms ? format(new Date(ms), "hh:mm a") : "");

export function exportStaffRegisterExcel(
  rows: RegisterRow[],
  dates: string[],
  options: { month: string; lateToHalfDay: number; checkOut: boolean }
): void {
  const monthLabel = format(fromDateKey(`${options.month}-01`), "MMMM yyyy");
  const dayHeads = dates.map((date) => format(fromDateKey(date), "d EEE"));
  const totals = ["Working", "Present", "Late", "Half Day", "Leave", "Absent"];
  if (options.lateToHalfDay > 0) totals.push(`Late -> Half (${options.lateToHalfDay})`);
  if (options.checkOut) totals.push("No check-out");
  totals.push("Days worked");

  const header = ["Name", "Emp. ID", "Job Role", ...dayHeads, ...totals];
  const body = rows.map(({ person, days, summary }) => {
    const sums = [summary.workingDays, summary.present, summary.late, summary.halfDay, summary.leave, summary.absent];
    if (options.lateToHalfDay > 0) sums.push(summary.lateHalfDays);
    if (options.checkOut) sums.push(summary.noCheckOut);
    sums.push(summary.daysWorked);
    return [person.name, person.employeeId, person.jobRole, ...days.map((day) => day.code), ...sums];
  });
  const legend = "P = Present, L = Late, HD = Half Day, A = Absent (no check-in), LV = Leave, H = Holiday / weekly off";
  const sheet = XLSX.utils.aoa_to_sheet([[`Staff Attendance - ${monthLabel}`], [legend], [], header, ...body]);
  sheet["!cols"] = [{ wch: 24 }, { wch: 9 }, { wch: 14 }, ...dates.map(() => ({ wch: 6 })), ...totals.map(() => ({ wch: 11 }))];
  sheet["!freeze"] = { xSplit: 1, ySplit: 4 };

  const timeHeader = ["Name", ...dates.map((date) => format(fromDateKey(date), "d MMM"))];
  const timeBody = rows.map(({ person, days }) => [
    person.name,
    ...days.map((day) => {
      const record = day.record;
      if (!record?.checkIn?.at) return record?.leaveType || "";
      const inText = time(record.checkIn.at);
      return options.checkOut && record.checkOut?.at ? `${inText} - ${time(record.checkOut.at)}` : inText;
    }),
  ]);
  const times = XLSX.utils.aoa_to_sheet([[`Check-in / out times - ${monthLabel}`], [], timeHeader, ...timeBody]);
  times["!cols"] = [{ wch: 24 }, ...dates.map(() => ({ wch: options.checkOut ? 19 : 9 }))];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Register");
  XLSX.utils.book_append_sheet(workbook, times, "Times");
  XLSX.writeFile(workbook, `Staff_Attendance_${options.month}.xlsx`);
}
