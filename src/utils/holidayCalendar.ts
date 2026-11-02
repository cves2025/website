/**
 * Pure holiday / working-day logic of the attendance pages.
 * Dates are "yyyy-MM-dd" strings in local time, so they compare as text.
 */
import { format } from "date-fns";

import type { Holiday, HolidayCalendar } from "./type";

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
  return { session, weeklyOff: [...DEFAULT_WEEKLY_OFF], holidays: [] };
}

/** First and last date of a session ("2026-27" -> 2026-04-01 ... 2027-03-31). */
export function sessionDateRange(session: string): { from: string; to: string } {
  const start = Number.parseInt(session.slice(0, 4), 10);
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
}

/** The session a date belongs to (April -> March). */
export function sessionOfDate(key: string): string {
  const date = fromDateKey(key);
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

/** The 12 months of a session as "yyyy-MM", April first. */
export function sessionMonths(session: string): string[] {
  const start = Number.parseInt(session.slice(0, 4), 10);
  return Array.from({ length: 12 }, (_, index) =>
    format(new Date(start, 3 + index, 1), "yyyy-MM")
  );
}

/** Every date of a "yyyy-MM" month. */
export function datesOfMonth(month: string): string[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: days }, (_, index) =>
    toDateKey(new Date(year, monthNumber - 1, index + 1))
  );
}

export const isWeeklyOff = (calendar: HolidayCalendar, key: string): boolean =>
  calendar.weeklyOff.includes(fromDateKey(key).getDay());

const appliesTo = (holiday: Holiday, className: string) =>
  holiday.classes.length === 0 || holiday.classes.includes(className);

/** The holiday of a class on a date, or null. */
export function holidayOn(
  calendar: HolidayCalendar,
  key: string,
  className: string
): Holiday | null {
  return (
    calendar.holidays.find(
      (holiday) =>
        holiday.from <= key && key <= holiday.to && appliesTo(holiday, className)
    ) ?? null
  );
}

/** Why a class has no school on a date, or null on a working day. */
export function dayOffReason(
  calendar: HolidayCalendar,
  key: string,
  className: string
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
  className: string
): boolean => dayOffReason(calendar, key, className) === null;

/** Holidays sorted by start date. */
export const sortHolidays = (holidays: Holiday[]): Holiday[] =>
  [...holidays].sort((a, b) => a.from.localeCompare(b.from) || a.name.localeCompare(b.name));
