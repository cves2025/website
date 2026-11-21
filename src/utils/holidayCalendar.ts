/**
 * Pure holiday / working-day logic of the attendance pages.
 * Dates are "yyyy-MM-dd" strings in local time, so they compare as text.
 */
import { format } from "date-fns";

import type {
  DateRange,
  Holiday,
  HolidayAudience,
  HolidayCalendar,
  StaffCalendarPart,
  StaffDuty,
  StaffHolidayPart,
} from "./type";

export const DEFAULT_WEEKLY_OFF: number[] = [0]; // Sunday

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const toDateKey = (date: Date): string => format(date, "yyyy-MM-dd");

export const todayKey = (): string => toDateKey(new Date());

/** "yyyy-MM-dd" -> local Date (new Date("yyyy-MM-dd") would be UTC). */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function emptyHolidayCalendar(session: string): HolidayCalendar {
  return {
    session,
    weeklyOff: [...DEFAULT_WEEKLY_OFF],
    holidays: [],
    staff: null,
  };
}

/** First and last date of a session ("2026-27" -> 2026-04-01 ... 2027-03-31). */
export function sessionDateRange(session: string): {
  from: string;
  to: string;
} {
  const start = Number.parseInt(session.slice(0, 4), 10);
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
}

/** The session a date belongs to (April -> March). */
export function sessionOfDate(key: string): string {
  const date = fromDateKey(key);
  const start =
    date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

/** The 12 months of a session as "yyyy-MM", April first. */
export function sessionMonths(session: string): string[] {
  const start = Number.parseInt(session.slice(0, 4), 10);
  return Array.from({ length: 12 }, (_, index) =>
    format(new Date(start, 3 + index, 1), "yyyy-MM"),
  );
}

/** Every date of a "yyyy-MM" month. */
export function datesOfMonth(month: string): string[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: days }, (_, index) =>
    toDateKey(new Date(year, monthNumber - 1, index + 1)),
  );
}

export const isWeeklyOff = (calendar: HolidayCalendar, key: string): boolean =>
  calendar.weeklyOff.includes(fromDateKey(key).getDay());

const appliesTo = (holiday: Holiday, className: string) =>
  holiday.students !== false &&
  (holiday.classes.length === 0 || holiday.classes.includes(className));

/** The holiday of a class on a date, or null. */
export function holidayOn(
  calendar: HolidayCalendar,
  key: string,
  className: string,
): Holiday | null {
  return (
    calendar.holidays.find(
      (holiday) =>
        holiday.from <= key &&
        key <= holiday.to &&
        appliesTo(holiday, className),
    ) ?? null
  );
}

/** Why a class has no school on a date, or null on a working day. */
export function dayOffReason(
  calendar: HolidayCalendar,
  key: string,
  className: string,
): string | null {
  const holiday = holidayOn(calendar, key, className);
  if (holiday) return holiday.name;
  if (isWeeklyOff(calendar, key)) {
    return WEEKDAY_LABELS[fromDateKey(key).getDay()];
  }
  return null;
}

export const isWorkingDay = (
  calendar: HolidayCalendar,
  key: string,
  className: string,
): boolean => dayOffReason(calendar, key, className) === null;

/** Holidays sorted by start date. */
export const sortHolidays = (holidays: Holiday[]): Holiday[] =>
  [...holidays].sort(
    (a, b) => a.from.localeCompare(b.from) || a.name.localeCompare(b.name),
  );

/* ------------------------------------------------- teachers' calendar -- */
// MIRROR of mobile/src/utils/holidayCalendar.ts and loadStaffCalendar /
// holidayIn / dutyOn in server/router/staffAttendanceHandler.js.

/** The teachers' part of a holiday, or null. */
export const staffPartOf = (
  calendar: HolidayCalendar,
  id: string,
): StaffHolidayPart | null => calendar.staff?.holidays[id] ?? null;

const covers = (range: DateRange, key: string) =>
  range.from <= key && key <= range.to;

/** Who a holiday is for: everyone, the students only, or the teachers & staff only. */
export function holidayAudience(
  holiday: Holiday,
  part: StaffHolidayPart | null,
): HolidayAudience {
  if (holiday.students === false) return "staff";
  return part?.off ? "everyone" : "students";
}

/** The teachers' holiday on a date (off, and not a day they come), or null. */
export function staffHolidayOn(
  calendar: HolidayCalendar,
  key: string,
): StaffHolidayPart | null {
  return (
    Object.values(calendar.staff?.holidays ?? {}).find(
      (part) =>
        part.off &&
        covers(part, key) &&
        !part.duties.some((duty) => covers(duty, key)),
    ) ?? null
  );
}

/** The teachers' times on a date they come during a holiday, or null (usual times). */
export function staffDutyOn(
  calendar: HolidayCalendar,
  key: string,
): (StaffDuty & { name: string }) | null {
  for (const part of Object.values(calendar.staff?.holidays ?? {})) {
    const duty = part.duties.find((item) => covers(item, key));
    if (duty) return { ...duty, name: part.name };
  }
  return null;
}

/**
 * The teachers' calendar: the weekly off and their days off as holidays (one
 * per run of days between the days they come); use it like a students'
 * calendar (register, day view, app).
 */
export function staffCalendarOf(calendar: HolidayCalendar): HolidayCalendar {
  const holidays: Holiday[] = [];
  Object.entries(calendar.staff?.holidays ?? {}).forEach(([id, part]) => {
    if (!part.off) return;
    let start = "";
    let last = "";
    const flush = () => {
      if (start) {
        holidays.push({
          id: `${id}_${start}`,
          name: part.name,
          from: start,
          to: last,
          classes: [],
          students: true,
        });
      }
      start = "";
    };
    datesBetween(part.from, part.to).forEach((key) => {
      if (part.duties.some((duty) => covers(duty, key))) {
        flush();
        return;
      }
      if (!start) start = key;
      last = key;
    });
    flush();
  });
  return {
    session: calendar.session,
    weeklyOff: calendar.weeklyOff,
    holidays: sortHolidays(holidays),
    staff: null,
  };
}

/** The teachers' part of the calendar with one holiday's part set (null = removed). */
export function withStaffPart(
  calendar: HolidayCalendar,
  id: string,
  part: StaffHolidayPart | null,
): StaffCalendarPart {
  const holidays = { ...(calendar.staff?.holidays ?? {}) };
  if (part && (part.off || part.duties.length > 0)) holidays[id] = part;
  else delete holidays[id];
  return { holidays };
}

/** The students' column: "Holiday (whole school)", "Holiday (classes 1st, 2nd)", "School open". */
export function studentsSummary(
  holiday: Holiday,
  ordinal: (className: string) => string,
): string {
  if (holiday.students === false) return "School open";
  return holiday.classes.length === 0
    ? "Holiday (whole school)"
    : `Holiday (classes ${holiday.classes.map(ordinal).join(", ")})`;
}

/** The teachers' column: "Off", "Off, except the days they come", "Come to school". */
export function staffSummary(
  holiday: Holiday,
  part: StaffHolidayPart | null,
): string {
  if (holidayAudience(holiday, part) === "students") return "Come to school";
  return part && part.duties.length > 0
    ? "Off, except the days they come"
    : "Off";
}

/** "09:00" -> "9:00 AM". */
export function hhmmLabel(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

/** "Late after 9:00 AM · Half Day after 10:00 AM · Leaving before 1:00 PM = Half Day". */
export const staffDutyTimesText = (
  duty: Pick<StaffDuty, "lateAfter" | "halfDayAfter" | "earlyLeaveBefore">,
): string =>
  [
    `Late after ${hhmmLabel(duty.lateAfter)}`,
    duty.halfDayAfter && `Half Day after ${hhmmLabel(duty.halfDayAfter)}`,
    duty.earlyLeaveBefore &&
      `Leaving before ${hhmmLabel(duty.earlyLeaveBefore)} = Half Day`,
  ]
    .filter(Boolean)
    .join(" · ");

/** Every date from `from` to `to` (inclusive); empty when `to` < `from`. */
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = fromDateKey(from);
  const end = fromDateKey(to);
  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
