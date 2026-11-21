/**
 * Monthly staff register: one code per person per day and the month's
 * totals. MIRROR: `mobile/src/utils/staffRegister.ts` (the teacher's month
 * summary) - change both together.
 *
 * - A working day with no record (in the past) is Absent; today and later
 *   days without a record are empty.
 * - Staff holidays / weekly offs are "H" (a record on such a day still counts).
 * - "X lates = 1 half day": every X lates of the month take half a day off
 *   the days worked (setting lateToHalfDay; 0 = off).
 */
import type { HolidayCalendar, StaffAttendanceRecord } from "./type";
import { dayOffReason } from "./holidayCalendar";

export type RegisterCode = "P" | "L" | "HD" | "A" | "LV" | "H" | "";

export interface RegisterDay {
  date: string;
  code: RegisterCode;
  /** The holiday name on an "H" day. */
  holiday: string;
  record: StaffAttendanceRecord | null;
}

export interface RegisterSummary {
  workingDays: number;
  present: number;
  late: number;
  halfDay: number;
  leave: number;
  absent: number;
  /** Half days taken off for lates (X lates = 1 half day). */
  lateHalfDays: number;
  /** Checked in but never out (past days, when check-out is used). */
  noCheckOut: number;
  /** present + late + half days / 2 - late half days / 2. */
  daysWorked: number;
}

const CODE_OF_STATUS: Record<StaffAttendanceRecord["status"], RegisterCode> = {
  present: "P",
  late: "L",
  halfDay: "HD",
  absent: "A",
  leave: "LV",
};

export function registerDays(
  dates: string[],
  calendar: HolidayCalendar,
  records: Record<string, StaffAttendanceRecord>,
  today: string
): RegisterDay[] {
  return dates.map((date) => {
    const record = records[date] ?? null;
    const holiday = dayOffReason(calendar, date, "") ?? "";
    if (record) return { date, code: CODE_OF_STATUS[record.status], holiday, record };
    if (holiday) return { date, code: "H", holiday, record: null };
    return { date, code: date < today ? "A" : "", holiday: "", record: null };
  });
}

export function summarizeRegister(
  days: RegisterDay[],
  options: { lateToHalfDay: number; checkOut: boolean; today: string }
): RegisterSummary {
  const count = (code: RegisterCode) => days.filter((day) => day.code === code).length;
  const late = count("L");
  const halfDay = count("HD");
  const lateHalfDays = options.lateToHalfDay > 0 ? Math.floor(late / options.lateToHalfDay) : 0;
  const present = count("P");
  return {
    workingDays: days.filter((day) => day.code !== "H" && day.code !== "").length,
    present,
    late,
    halfDay,
    leave: count("LV"),
    absent: count("A"),
    lateHalfDays,
    noCheckOut: options.checkOut
      ? days.filter((day) => day.date < options.today && day.record?.checkIn && !day.record.checkOut).length
      : 0,
    daysWorked: Math.max(present + late + halfDay / 2 - lateHalfDays / 2, 0),
  };
}
