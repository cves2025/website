/**
 * Present / total days of an exam taken from the daily attendance, for the
 * Marks page ("Fill from daily attendance") and the marks Excel template.
 * Counted like the Attendance Report: holidays / weekly off are skipped,
 * Leave counts as absent, and a student only counts on the days they were
 * on the list.
 */
import { loadAttendanceRange } from "./attendanceService";
import {
  datesBetween,
  dayOffReason,
  sessionDateRange,
} from "./holidayCalendar";
import type { DailyAttendanceDoc, ExamDoc, HolidayCalendar } from "./type";

export interface ExamAttendanceValue {
  presentDays: number;
  totalDays: number;
}

export interface ExamAttendanceTotals {
  /** studentId -> totals; students with no counted day are missing. */
  byStudent: Map<string, ExamAttendanceValue>;
  /** Working days of the range up to today. */
  workingDays: number;
  /** Section -> days marked. */
  markedDays: Record<string, number>;
  /** Section -> past working days nobody marked. */
  notMarked: Record<string, string[]>;
}

/**
 * Default range: from the start of the session to the exam's end date
 * (its start date when no end date is saved), never after today.
 */
export function defaultExamAttendanceRange(
  session: string,
  exam: Pick<ExamDoc, "examStartDate" | "examEndDate"> | null,
  today: string
): { from: string; to: string } {
  const range = sessionDateRange(session);
  const examDay = (exam?.examEndDate || exam?.examStartDate || "").slice(0, 10);
  let to = /^\d{4}-\d{2}-\d{2}$/.test(examDay) ? examDay : today;
  if (to > today) to = today;
  if (to > range.to) to = range.to;
  if (to < range.from) to = range.from;
  return { from: range.from, to };
}

export function countExamAttendance(params: {
  className: string;
  calendar: HolidayCalendar;
  /** Section -> its daily documents by date. */
  docsBySection: ReadonlyMap<string, ReadonlyMap<string, DailyAttendanceDoc>>;
  from: string;
  to: string;
  today: string;
}): ExamAttendanceTotals {
  const { className, calendar, docsBySection, from, to, today } = params;
  const workingDates = datesBetween(from, to).filter(
    (date) => date <= today && !dayOffReason(calendar, date, className)
  );

  const byStudent = new Map<string, ExamAttendanceValue>();
  const markedDays: Record<string, number> = {};
  const notMarked: Record<string, string[]> = {};

  docsBySection.forEach((docs, section) => {
    markedDays[section] = 0;
    notMarked[section] = [];
    workingDates.forEach((date) => {
      const day = docs.get(date);
      if (!day) {
        notMarked[section].push(date);
        return;
      }
      markedDays[section] += 1;
      Object.entries(day.records).forEach(([studentId, status]) => {
        const value = byStudent.get(studentId) ?? { presentDays: 0, totalDays: 0 };
        value.totalDays += 1;
        if (status === "P") value.presentDays += 1;
        byStudent.set(studentId, value);
      });
    });
  });

  return { byStudent, workingDays: workingDates.length, markedDays, notMarked };
}

/** Loads the daily documents of the sections and counts them. */
export async function loadExamAttendance(params: {
  session: string;
  className: string;
  sections: readonly string[];
  calendar: HolidayCalendar;
  from: string;
  to: string;
  today: string;
}): Promise<ExamAttendanceTotals> {
  const { session, className, sections, from, to } = params;
  const unique = [...new Set(sections)].filter(Boolean);
  const loaded = await Promise.all(
    unique.map(
      async (section) =>
        [
          section,
          await loadAttendanceRange(session, className, section, from, to),
        ] as const
    )
  );
  return countExamAttendance({
    ...params,
    docsBySection: new Map(loaded),
  });
}
