import {
  collectionTotal,
  schoolAttendanceOn,
  sectionsAttendanceOn,
  transportPerMonth,
  type AttendanceTotals,
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
