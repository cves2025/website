import { useCallback, useEffect, useState } from "react";

import { loadHolidayCalendar } from "../utils/attendanceService";
import { emptyHolidayCalendar } from "../utils/holidayCalendar";
import type { HolidayCalendar } from "../utils/type";

/** The holiday calendar of a session (Sunday off + no holidays when unsaved). */
export function useHolidayCalendar(session: string) {
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

    loadHolidayCalendar(session)
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
  }, [session, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { calendar, setCalendar, loading, error, reload };
}

export default useHolidayCalendar;
