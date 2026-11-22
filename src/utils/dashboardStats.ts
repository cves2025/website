/**
 * Numbers of the dashboard, read with Firestore aggregation queries (count /
 * sum): one aggregation costs about one read per 1000 index entries, instead
 * of one read per document.
 *
 * The sums need the composite indexes in firestore.indexes.json. Until they
 * are deployed Firestore answers "failed-precondition"; the functions then
 * fall back to reading the documents, so the dashboard keeps working.
 */
import {
  collection,
  count,
  getAggregateFromServer,
  getCountFromServer,
  query,
  sum,
  where,
} from "firebase/firestore";

import { CLASSES, COLLECTION, SECTIONS } from "../constants";
import { db } from "../firebase/config";
import { loadAttendanceOnDate, loadDailyAttendance } from "./attendanceService";
import { loadPaymentsBetween } from "./feeService";
import type { SectionOption } from "../component/panel/attendance/attendanceShared";

/** True for the error Firestore gives when a needed index does not exist yet. */
const isMissingIndex = (cause: unknown) =>
  typeof cause === "object" && cause !== null && (cause as { code?: string }).code === "failed-precondition";

function warnMissingIndex(what: string, cause: unknown) {
  // The message carries a console link that creates the index.
  console.warn(`Index for ${what} is missing; reading documents instead. Deploy firestore.indexes.json.`, cause);
}

export interface CollectionTotal {
  total: number;
  receipts: number;
}

/** Active (not cancelled) receipts dated `from` to `to`, inclusive. */
export async function collectionTotal(from: string, to: string): Promise<CollectionTotal> {
  const receipts = query(
    collection(db, COLLECTION.FEE_PAYMENTS),
    where("status", "==", "active"),
    where("date", ">=", from),
    where("date", "<=", to)
  );
  try {
    const snapshot = await getAggregateFromServer(receipts, { total: sum("amount"), receipts: count() });
    const data = snapshot.data();
    return { total: data.total ?? 0, receipts: data.receipts };
  } catch (cause) {
    if (!isMissingIndex(cause)) throw cause;
    warnMissingIndex("fee receipts (status, date, amount)", cause);
    const active = (await loadPaymentsBetween(from, to)).filter((payment) => payment.status === "active");
    return { total: active.reduce((total, payment) => total + payment.amount, 0), receipts: active.length };
  }
}

export interface AttendanceTotals {
  /** Sections marked on the day. */
  marked: number;
  present: number;
  absent: number;
  leave: number;
  /** "section|class" of the marked sections; only known when read from documents. */
  markedKeys?: Set<string>;
}

const keyOf = (item: SectionOption) => `${item.className}|${item.section}`;

/** Adds up the records of attendance documents (the fallback path). */
function totalsOfDocs(docs: Awaited<ReturnType<typeof loadAttendanceOnDate>>): AttendanceTotals {
  const totals: AttendanceTotals = { marked: docs.length, present: 0, absent: 0, leave: 0, markedKeys: new Set() };
  docs.forEach((item) => {
    totals.markedKeys?.add(keyOf(item));
    Object.values(item.records).forEach((status) => {
      if (status === "P") totals.present += 1;
      else if (status === "A") totals.absent += 1;
      else if (status === "L") totals.leave += 1;
    });
  });
  return totals;
}

/**
 * The whole school's attendance on a day: the count of marked sections and
 * the sums of their present / absent / leave totals. Documents saved before
 * the totals were stored make it read the documents of that day instead.
 */
export async function schoolAttendanceOn(date: string): Promise<AttendanceTotals> {
  const day = query(collection(db, COLLECTION.DAILY_ATTENDANCE), where("date", "==", date));
  const marked = (await getCountFromServer(day)).data().count;
  if (marked === 0) return { marked: 0, present: 0, absent: 0, leave: 0 };

  try {
    // Days with documents that do not carry the totals yet are read in full.
    const withTotals = (
      await getCountFromServer(query(day, where("presentCount", ">=", 0)))
    ).data().count;
    if (withTotals !== marked) return totalsOfDocs(await loadAttendanceOnDate(date));

    const [present, absent, leave] = await Promise.all(
      (["presentCount", "absentCount", "leaveCount"] as const).map(async (field) =>
        (await getAggregateFromServer(day, { value: sum(field) })).data().value ?? 0
      )
    );
    return { marked, present, absent, leave };
  } catch (cause) {
    if (!isMissingIndex(cause)) throw cause;
    warnMissingIndex("attendance totals (date, presentCount / absentCount / leaveCount)", cause);
    return totalsOfDocs(await loadAttendanceOnDate(date));
  }
}

/**
 * Attendance of a teacher's own sections on a day: one document read per
 * section (by id), not the whole school's day.
 */
export async function sectionsAttendanceOn(
  session: string,
  sections: SectionOption[],
  date: string
): Promise<AttendanceTotals> {
  const docs = await Promise.all(
    sections.map((item) => loadDailyAttendance(session, item.className, item.section, date))
  );
  return totalsOfDocs(docs.filter((item): item is NonNullable<typeof item> => item !== null));
}

/* ------------------------------------------------------- fee target -- */

/**
 * Monthly transport fee of all accounts of a session (aggregation: sum of
 * `transport.amount`). Without its index it gives 0 instead of reading every
 * account, so the target then leaves transport out.
 */
export async function transportPerMonth(session: string): Promise<number> {
  try {
    const snapshot = await getAggregateFromServer(
      query(collection(db, COLLECTION.FEE_ACCOUNTS), where("session", "==", session)),
      { total: sum("transport.amount") }
    );
    return snapshot.data().total ?? 0;
  } catch (cause) {
    if (!isMissingIndex(cause)) throw cause;
    warnMissingIndex("transport fees (session, transport.amount)", cause);
    return 0;
  }
}

export interface TcCounts {
  issued: number;
  cancelled: number;
  draft: number;
}

export interface StudentCounts {
  /** Enrollments of the session not in the recycle bin. */
  students: number;
  male: number;
  female: number;
}

/** Count of the enrollments of a session with more equality filters. */
const enrollmentCount = async (session: string, ...filters: ReturnType<typeof where>[]) =>
  (
    await getCountFromServer(
      query(collection(db, COLLECTION.ENROLLMENTS), where("academicYear", "==", session), ...filters)
    )
  ).data().count;

/**
 * Students of a session, male and female: six counts. Older enrollments have
 * no `isDeleted`, so each = all - deleted (as the class counts do). Gender is
 * on the enrollment (`gender`, "MALE" / "FEMALE"). Equality filters only: no
 * composite index.
 */
export async function studentCountsOf(session: string): Promise<StudentCounts> {
  const deleted = where("isDeleted", "==", true);
  // The admission form and Bulk Import save gender in capitals.
  const male = where("gender", "==", "MALE");
  const female = where("gender", "==", "FEMALE");
  const [all, allDeleted, males, malesDeleted, females, femalesDeleted] = await Promise.all([
    enrollmentCount(session),
    enrollmentCount(session, deleted),
    enrollmentCount(session, male),
    enrollmentCount(session, male, deleted),
    enrollmentCount(session, female),
    enrollmentCount(session, female, deleted),
  ]);
  return { students: all - allDeleted, male: males - malesDeleted, female: females - femalesDeleted };
}

export interface ClassSectionCounts {
  /** Classes (CLASSES) with at least one student in the session. */
  classes: number;
  /** Section names (SECTIONS: A, B ...) with at least one student, in any class. */
  sections: number;
}

/**
 * Classes and sections in use in a session: one count per class and one per
 * section name (CLASSES + SECTIONS counts). Active = `isDeleted == false`
 * (Add Student, Bulk Import and promotion all save it). Equality filters
 * only: no composite index.
 */
export async function classSectionCountsOf(session: string): Promise<ClassSectionCounts> {
  const active = where("isDeleted", "==", false);
  const used = async (field: string, values: string[]) =>
    (
      await Promise.all(values.map((value) => enrollmentCount(session, active, where(field, "==", value))))
    ).filter((count) => count > 0).length;
  const [classes, sections] = await Promise.all([used("className", CLASSES), used("section", SECTIONS)]);
  return { classes, sections };
}

export interface PeopleCounts {
  /** Not deleted (`isDeleted == false`). */
  total: number;
  /** Status "Active" of those. */
  active: number;
  male: number;
  female: number;
  /** On leave today (staffAttendance `status == "leave"`). */
  onLeave: number;
  /** On a half-day leave today (`halfDayLeave == true`). */
  halfDayLeave: number;
}

const usersCount = async (role: string, ...filters: ReturnType<typeof where>[]) =>
  (
    await getCountFromServer(
      query(collection(db, COLLECTION.USERS), where("role", "==", role), where("isDeleted", "==", false), ...filters)
    )
  ).data().count;

const leaveCount = async (date: string, personType: string, filter: ReturnType<typeof where>) =>
  (
    await getCountFromServer(
      query(
        collection(db, COLLECTION.STAFF_ATTENDANCE),
        where("date", "==", date),
        where("personType", "==", personType),
        filter
      )
    )
  ).data().count;

/**
 * Teachers or staff (`role`, users) and who is on leave on `date`: six counts.
 * Gender is saved "Male" / "Female" (GENDER_OPTIONS). The leave counts read
 * staffAttendance (admin only, rules). Equality filters only: no composite index.
 */
export async function peopleCountsOf(role: string, date: string): Promise<PeopleCounts> {
  const [total, active, male, female, onLeave, halfDayLeave] = await Promise.all([
    usersCount(role),
    usersCount(role, where("status", "==", "Active")),
    usersCount(role, where("gender", "==", "Male")),
    usersCount(role, where("gender", "==", "Female")),
    leaveCount(date, role, where("status", "==", "leave")),
    leaveCount(date, role, where("halfDayLeave", "==", true)),
  ]);
  return { total, active, male, female, onLeave, halfDayLeave };
}

/** Enrollments of a session saved with "Is this new admission?" (left ones too: they were admitted). */
export const newAdmissionsOf = (session: string) =>
  enrollmentCount(session, where("isNewAdmission", "==", true));

/** TCs of a session by status (three counts; equality filters need no composite index). */
export async function tcCountsOf(session: string): Promise<TcCounts> {
  const countOf = async (status: keyof TcCounts) =>
    (
      await getCountFromServer(
        query(
          collection(db, COLLECTION.TRANSFER_CERTIFICATES),
          where("session", "==", session),
          where("status", "==", status)
        )
      )
    ).data().count;
  const [issued, cancelled, draft] = await Promise.all([countOf("issued"), countOf("cancelled"), countOf("draft")]);
  return { issued, cancelled, draft };
}
