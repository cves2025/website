import { TC_REGISTER_CLASS } from "../constants";
import { loadTcRows } from "../utils/tcService";
import type { TcStudentRow } from "../utils/type";
import useAsyncData from "./useAsyncData";

/**
 * Students of a class + section with their TC, or every TC of the session
 * when `className` is TC_REGISTER_CLASS. Reads nothing until a class is picked.
 */
export function useTcRows(session: string, className: string, section: string) {
  const enabled =
    Boolean(session && className) && (className === TC_REGISTER_CLASS || Boolean(section));
  const { data, loading, error, reload } = useAsyncData<TcStudentRow[]>(
    () => loadTcRows(session, className, section),
    [session, className, section],
    { initial: [], enabled, errorMessage: "Students could not be loaded." }
  );
  return { rows: data, loading, error, reload };
}

export default useTcRows;
