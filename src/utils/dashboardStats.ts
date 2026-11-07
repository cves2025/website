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

import { COLLECTION } from "../constants";
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
