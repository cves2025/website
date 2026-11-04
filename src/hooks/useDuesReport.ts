import { loadDuesReport } from "../utils/feeService";
import type { DuesReportRow } from "../utils/type";
import { useAsyncData } from "./useAsyncData";

/**
 * Students of a session with their fee accounts, for the Dues Report.
 * Empty `className` / `section` = all classes / sections.
 */
export function useDuesReport(session: string, className: string, section: string) {
  const { data, loading, error, reload } = useAsyncData<DuesReportRow[]>(
    () => loadDuesReport(session, className, section),
    [session, className, section],
    { initial: [], enabled: Boolean(session), errorMessage: "Dues report could not be loaded." }
  );
  return { rows: data, loading, error, reload };
}

export default useDuesReport;
