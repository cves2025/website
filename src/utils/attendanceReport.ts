/**
 * Builds the attendance report of a section from its daily documents.
 * Pure logic: no Firestore and no React.
 *
 * - A holiday / weekly off is always shown as off (also in the future, and
 *   also when the day was marked before the holiday was added) and is never
 *   counted.
 * - A student is only counted on the days they are in a document, so a
 *   student admitted in the middle of the session is not absent before that.
 */
import { dayOffReason } from "./holidayCalendar";
import type {
  AttendanceStatus,
  DailyAttendanceDoc,
  HolidayCalendar,
} from "./type";

export type ReportDayKind = "marked" | "notMarked" | "off" | "upcoming";

export interface ReportDay {
  date: string;
  kind: ReportDayKind;
  /** Holiday name / weekday, for `off` days. */
  offReason: string | null;
}

export interface ReportStudentInput {
  studentId: string;
}

export interface ReportRow<T extends ReportStudentInput> {
  student: T;
  /** Status by date; null = not on the list that day (or not marked). */
  cells: Record<string, AttendanceStatus | null>;
  present: number;
  absent: number;
  leave: number;
  /** Present / counted days x 100, one decimal; null when nothing counted. */
  percentage: number | null;
}

export interface AttendanceReport<T extends ReportStudentInput> {
  days: ReportDay[];
  rows: ReportRow<T>[];
  markedDays: number;
  /** Past working days nobody marked. */
  notMarkedDates: string[];
}

export function buildAttendanceReport<T extends ReportStudentInput>(params: {
  dates: string[];
  className: string;
  calendar: HolidayCalendar;
  docs: ReadonlyMap<string, DailyAttendanceDoc>;
  students: T[];
  today: string;
}): AttendanceReport<T> {
  const { dates, className, calendar, docs, students, today } = params;

  const days: ReportDay[] = dates.map((date) => {
    const offReason = dayOffReason(calendar, date, className);
    if (offReason) return { date, kind: "off", offReason };
    if (docs.has(date)) return { date, kind: "marked", offReason };
    if (date > today) return { date, kind: "upcoming", offReason };
    return { date, kind: "notMarked", offReason };
  });

  const markedDates = days.filter((day) => day.kind === "marked");

  const rows = students.map((student): ReportRow<T> => {
    const cells: Record<string, AttendanceStatus | null> = {};
    let present = 0;
    let absent = 0;
    let leave = 0;
    markedDates.forEach(({ date }) => {
      const status = docs.get(date)?.records[student.studentId] ?? null;
      cells[date] = status;
      if (status === "P") present += 1;
      else if (status === "A") absent += 1;
      else if (status === "L") leave += 1;
    });
    const counted = present + absent + leave;
    return {
      student,
      cells,
      present,
      absent,
      leave,
      percentage:
        counted === 0 ? null : Math.round((present / counted) * 1000) / 10,
    };
  });

  return {
    days,
    rows,
    markedDays: markedDates.length,
    notMarkedDates: days
      .filter((day) => day.kind === "notMarked")
      .map((day) => day.date),
  };
}
