import {
  classSectionCountsOf,
  collectionTotal,
  newAdmissionsOf,
  type ClassSectionCounts,
  studentCountsOf,
  type StudentCounts,
  schoolAttendanceOn,
  sectionsAttendanceOn,
  tcCountsOf,
  transportPerMonth,
  type AttendanceTotals,
  type TcCounts,
  type CollectionTotal,
} from "../utils/dashboardStats";
import type { SectionOption } from "../component/panel/attendance/attendanceShared";
import { loadAttendanceOnDate } from "../utils/attendanceService";
import { useAsyncData } from "./useAsyncData";

/** Fee collected from `from` to `to` (aggregation: sum + count). */
export function useCollectionTotal(from: string, to: string, enabled = true) {
  const { data, loading, error } = useAsyncData<CollectionTotal>(() => collectionTotal(from, to), [from, to], {
    initial: { total: 0, receipts: 0 },
    enabled: enabled && Boolean(from && to),
    errorMessage: "Fee collection could not be loaded.",
  });
  return { ...data, loading, error };
}

/**
 * Attendance totals of a day: the whole school (aggregation) when `sections`
 * is null, otherwise just those sections (one read each).
 */
export function useAttendanceTotals(
  date: string,
  session: string,
  sections: SectionOption[] | null,
  enabled = true
) {
  const sectionsKey = sections?.map((item) => `${item.className}|${item.section}`).join(",") ?? "all";
  const { data, loading, error } = useAsyncData<AttendanceTotals | null>(
    () => (sections ? sectionsAttendanceOn(session, sections, date) : schoolAttendanceOn(date)),
    [date, session, sectionsKey],
    {
      initial: null,
      enabled: enabled && Boolean(date),
      errorMessage: "Attendance could not be loaded.",
    }
  );
  return { totals: data, loading, error };
}

/** Monthly transport fee of all accounts of a session (aggregation: sum). */
export function useTransportPerMonth(session: string, enabled = true) {
  const { data, loading, error } = useAsyncData<number>(() => transportPerMonth(session), [session], {
    initial: 0,
    enabled: enabled && Boolean(session),
    errorMessage: "Transport fees could not be loaded.",
  });
  return { transportMonthly: data, loading, error };
}

/**
 * Sections ("class|section") marked on a day, read only when `enabled` (e.g.
 * when the "Not marked" list is opened): one read per marked section.
 */
export function useMarkedSectionsOn(date: string, enabled: boolean) {
  const { data, loading, error } = useAsyncData<Set<string> | null>(
    async () =>
      new Set((await loadAttendanceOnDate(date)).map((item) => `${item.className}|${item.section}`)),
    [date],
    { initial: null, enabled: enabled && Boolean(date), errorMessage: "Marked sections could not be loaded." }
  );
  return { markedKeys: data, loading, error };
}

export interface AdmissionStats {
  /** Students of `sessions[0]` (the current session). */
  current: StudentCounts;
  /** Classes and sections in use in `sessions[0]`. */
  classSections: ClassSectionCounts;
  /** New admissions of each of `sessions`. */
  newAdmissions: Record<string, number>;
}

/**
 * Students (male / female) of the first of `sessions` and the new admissions
 * of each: 6 + 1 per session counts.
 */
export function useAdmissionStats(sessions: string[], enabled = true) {
  const { data, loading, error } = useAsyncData<AdmissionStats>(
    async () => {
      const [current, classSections, counts] = await Promise.all([
        studentCountsOf(sessions[0]),
        classSectionCountsOf(sessions[0]),
        Promise.all(sessions.map((session) => newAdmissionsOf(session))),
      ]);
      return {
        current,
        classSections,
        newAdmissions: Object.fromEntries(sessions.map((session, index) => [session, counts[index]])),
      };
    },
    [sessions.join(",")],
    {
      initial: {
        current: { students: 0, male: 0, female: 0 },
        classSections: { classes: 0, sections: 0 },
        newAdmissions: {},
      },
      enabled: enabled && sessions.length > 0,
      errorMessage: "Student counts could not be loaded.",
    }
  );
  return { stats: data, loading, error };
}

/** TC counts (issued / cancelled / draft) of each of `sessions`, by session. */
export function useTcCounts(sessions: string[], enabled = true) {
  const { data, loading, error } = useAsyncData<Record<string, TcCounts>>(
    async () => {
      const counts = await Promise.all(sessions.map((session) => tcCountsOf(session)));
      return Object.fromEntries(sessions.map((session, index) => [session, counts[index]]));
    },
    [sessions.join(",")],
    { initial: {}, enabled: enabled && sessions.length > 0, errorMessage: "TC counts could not be loaded." }
  );
  return { counts: data, loading, error };
}
