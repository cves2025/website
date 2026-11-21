import { useCallback, useEffect, useState } from "react";

import { COLLECTION } from "../constants";
import { loadHolidayCalendar } from "../utils/attendanceService";
import { emptyHolidayCalendar } from "../utils/holidayCalendar";
import type { HolidayCalendar } from "../utils/type";

/**
 * The holiday calendar of a session (Sunday off + no holidays when unsaved):
 * the students' one, or the staff one with COLLECTION.STAFF_HOLIDAYS.
 */
export function useHolidayCalendar(session: string, collectionName: string = COLLECTION.HOLIDAY_CALENDAR) {
  const [calendar, setCalendar] = useState<HolidayCalendar>(() =>
    emptyHolidayCalendar(session)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCalendar(emptyHolidayCalendar(session));

    loadHolidayCalendar(session, collectionName)
      .then((data) => {
        if (!cancelled) setCalendar(data);
      })
      .catch((cause) => {
        console.error("Failed to load holiday calendar:", cause);
        if (!cancelled) setError("Holiday calendar could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, collectionName, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { calendar, setCalendar, loading, error, reload };
}

export default useHolidayCalendar;
