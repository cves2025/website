import { loadTcRecords } from "../utils/tcService";
import type { TcRecords, TcStudent } from "../utils/type";
import useAsyncData from "./useAsyncData";

const NONE: TcRecords = { attendance: null, due: null, concession: null };

/**
 * Attendance and fee due of a student up to the struck-off date, for a TC
 * that is still being made (`enabled`). `reload()` reads them again.
 */
export function useTcRecords(student: TcStudent | null, upTo: string, enabled: boolean) {
  const { data, loading, reload } = useAsyncData<TcRecords>(
    () => (student ? loadTcRecords(student, upTo) : Promise.resolve(NONE)),
    [student?.enrollmentId, upTo],
    { initial: NONE, enabled: enabled && Boolean(student), errorMessage: "Records could not be read." }
  );
  return { records: data, loading, reload };
}

export default useTcRecords;
