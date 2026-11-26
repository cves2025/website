import { DEFAULT_UDISE_SETTINGS } from "../constants";
import { loadUdiseSection, loadUdiseSettings } from "../utils/udiseService";
import type { UdiseSettings, UdiseStudentRow } from "../utils/type";
import useAsyncData from "./useAsyncData";

/** UDISE+ settings (`settings/udise`), defaults until saved. */
export function useUdiseSettings() {
  const { data, setData, loading, error, reload } = useAsyncData<UdiseSettings>(loadUdiseSettings, [], {
    initial: DEFAULT_UDISE_SETTINGS,
    errorMessage: "UDISE settings could not be loaded.",
  });
  return { settings: data, setSettings: setData, loading, error, reload };
}

/** The students of one section with their UDISE answers (waits for a class + section). */
export function useUdiseSection(
  session: string,
  className: string,
  section: string,
  classCodes: Record<string, string>,
  enabled: boolean
) {
  const { data, setData, loading, error, reload } = useAsyncData<UdiseStudentRow[]>(
    () => loadUdiseSection(session, className, section, classCodes),
    [session, className, section, JSON.stringify(classCodes)],
    {
      initial: [],
      enabled: enabled && Boolean(session && className && section),
      errorMessage: "Students could not be loaded.",
    }
  );
  return { rows: data, setRows: setData, loading, error, reload };
}
