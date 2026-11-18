import { DEFAULT_TC_SETTINGS } from "../constants";
import { loadTcSettings } from "../utils/tcService";
import type { TcSettings } from "../utils/type";
import useAsyncData from "./useAsyncData";

/** TC Settings (`settings/transferCertificate`), defaults until saved. */
export function useTcSettings() {
  const { data, setData, loading, error, reload } = useAsyncData<TcSettings>(loadTcSettings, [], {
    initial: DEFAULT_TC_SETTINGS,
    errorMessage: "TC settings could not be loaded.",
  });
  return { settings: data, setSettings: setData, loading, error, reload };
}

export default useTcSettings;
