/** Date range of a refused check-ins period. MIRROR of staffLogRange in mobile/src/utils/staffAttendance.ts. */
import { addDays, format } from "date-fns";

import type { StaffLogPeriod } from "../constants";
import { fromDateKey } from "./holidayCalendar";

const key = (date: Date) => format(date, "yyyy-MM-dd");

/** From / to ("yyyy-MM-dd") of a period; `custom` uses the picked dates. */
export function staffLogRange(
  period: StaffLogPeriod,
  today: string,
  custom: { from: string; to: string }
): { from: string; to: string } {
  const date = fromDateKey(today);
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      return { from: key(addDays(date, -1)), to: key(addDays(date, -1)) };
    case "week":
      return { from: key(addDays(date, -6)), to: today };
    case "month":
      return { from: key(new Date(date.getFullYear(), date.getMonth(), 1)), to: today };
    case "lastMonth":
      return {
        from: key(new Date(date.getFullYear(), date.getMonth() - 1, 1)),
        to: key(new Date(date.getFullYear(), date.getMonth(), 0)),
      };
    default: {
      const from = custom.from || today;
      const to = custom.to && custom.to >= from ? custom.to : from;
      return { from, to };
    }
  }
}
