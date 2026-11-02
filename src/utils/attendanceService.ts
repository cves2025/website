/**
 * Firestore access for daily attendance and the holiday calendar.
 *
 * - `dailyAttendance/{session}_{class}_{section}_{date}` - one document per
 *   section and date, so a day costs one read and one write. A month of a
 *   section is a document-id range (no composite index needed).
 * - `holidayCalendar/{session}` - weekly off + holidays of the session.
 *
 * The older `attendance` collection (present / total days per exam, entered
 * on the Marks page) is separate and untouched.
 */
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import type { DocumentData, DocumentReference } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import {
  DEFAULT_WEEKLY_OFF,
  emptyHolidayCalendar,
  sessionDateRange,
  sortHolidays,
} from "./holidayCalendar";
import type {
  AttendanceStatus,
  DailyAttendanceDoc,
  Holiday,
  HolidayCalendar,
} from "./type";

const STATUSES = new Set<string>(["P", "A", "L"]);

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/* --------------------------------------------------------- daily docs -- */

const sectionPrefix = (session: string, className: string, section: string) =>
  `${session}_${className}_${section}_`;

export const dailyAttendanceDocId = (
  session: string,
  className: string,
  section: string,
  date: string
) => `${sectionPrefix(session, className, section)}${date}`;

function toDailyAttendance(data: DocumentData): DailyAttendanceDoc {
  const records: Record<string, AttendanceStatus> = {};
  const raw = data.records;
  if (raw && typeof raw === "object") {
    Object.entries(raw as Record<string, unknown>).forEach(([id, status]) => {
      if (typeof status === "string" && STATUSES.has(status)) {
        records[id] = status as AttendanceStatus;
      }
    });
  }
  return {
    session: text(data.session),
    className: text(data.className),
    section: text(data.section),
    date: text(data.date),
    records,
    markedBy: text(data.markedBy),
    markedByName: text(data.markedByName),
    updatedAt: data.updatedAt,
  };
}

export async function loadDailyAttendance(
  session: string,
  className: string,
  section: string,
  date: string
): Promise<DailyAttendanceDoc | null> {
  const snapshot = await getDoc(
    doc(
      db,
      COLLECTION.DAILY_ATTENDANCE,
      dailyAttendanceDocId(session, className, section, date)
    )
  );
  return snapshot.exists() ? toDailyAttendance(snapshot.data()) : null;
}

export async function saveDailyAttendance(
  value: Omit<DailyAttendanceDoc, "updatedAt">
): Promise<void> {
  await setDoc(
    doc(
      db,
      COLLECTION.DAILY_ATTENDANCE,
      dailyAttendanceDocId(value.session, value.className, value.section, value.date)
    ),
    { ...value, updatedAt: serverTimestamp() }
  );
}

async function rangeSnapshot(
  session: string,
  className: string,
  section: string,
  from: string,
  to: string
) {
  const prefix = sectionPrefix(session, className, section);
  return getDocs(
    query(
      collection(db, COLLECTION.DAILY_ATTENDANCE),
      where(documentId(), ">=", `${prefix}${from}`),
      where(documentId(), "<=", `${prefix}${to}`)
    )
  );
}

/** The marked days of a section between two dates (inclusive), by date. */
export async function loadAttendanceRange(
  session: string,
  className: string,
  section: string,
  from: string,
  to: string
): Promise<Map<string, DailyAttendanceDoc>> {
  const snapshot = await rangeSnapshot(session, className, section, from, to);
  const byDate = new Map<string, DailyAttendanceDoc>();
  snapshot.docs.forEach((item) => {
    const value = toDailyAttendance(item.data());
    if (value.date) byDate.set(value.date, value);
  });
  return byDate;
}

/** Every section marked on a date (used by the dashboard). */
export async function loadAttendanceOnDate(
  date: string
): Promise<DailyAttendanceDoc[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION.DAILY_ATTENDANCE), where("date", "==", date))
  );
  return snapshot.docs.map((item) => toDailyAttendance(item.data()));
}

/**
 * Documents of a section in a session that carry the student - used when a
 * promotion is undone, to take the student out of the new session's days.
 */
export async function fetchStudentDailyAttendanceRefs(
  session: string,
  className: string,
  section: string,
  studentId: string
): Promise<DocumentReference[]> {
  const { from, to } = sessionDateRange(session);
  const snapshot = await rangeSnapshot(session, className, section, from, to);
  return snapshot.docs
    .filter((item) => {
      const records = item.data().records;
      return Boolean(records && typeof records === "object" && studentId in records);
    })
    .map((item) => item.ref);
}

/* --------------------------------------------------- holiday calendar -- */

function toHoliday(value: unknown): Holiday | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const from = text(data.from);
  const to = text(data.to) || from;
  const name = text(data.name);
  if (!from || !name) return null;
  return {
    id: text(data.id) || `${from}_${name}`,
    name,
    from,
    to: to < from ? from : to,
    classes: Array.isArray(data.classes)
      ? data.classes.map(text).filter(Boolean)
      : [],
  };
}

export async function loadHolidayCalendar(
  session: string
): Promise<HolidayCalendar> {
  const snapshot = await getDoc(doc(db, COLLECTION.HOLIDAY_CALENDAR, session));
  if (!snapshot.exists()) return emptyHolidayCalendar(session);
  const data = snapshot.data();
  const weeklyOff = Array.isArray(data.weeklyOff)
    ? data.weeklyOff.filter(
        (day): day is number => Number.isInteger(day) && day >= 0 && day <= 6
      )
    : DEFAULT_WEEKLY_OFF;
  const holidays = Array.isArray(data.holidays)
    ? data.holidays.map(toHoliday).filter((h): h is Holiday => h !== null)
    : [];
  return { session, weeklyOff, holidays: sortHolidays(holidays) };
}

export async function saveHolidayCalendar(
  calendar: HolidayCalendar,
  updatedBy: string
): Promise<void> {
  await setDoc(doc(db, COLLECTION.HOLIDAY_CALENDAR, calendar.session), {
    session: calendar.session,
    weeklyOff: [...new Set(calendar.weeklyOff)].sort(),
    holidays: sortHolidays(calendar.holidays),
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}
