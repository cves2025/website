import { DEFAULT_FEE_SETTINGS } from "../constants";
import { loadFeeSettings } from "../utils/feeService";
import { useAsyncData } from "./useAsyncData";

/** School-wide fee settings (defaults until they are saved). */
export function useFeeSettings() {
  const { data, loading, error, reload } = useAsyncData(loadFeeSettings, [], {
    initial: DEFAULT_FEE_SETTINGS,
    errorMessage: "Fee settings could not be loaded.",
  });
  return { settings: data, loading, error, reload };
}

export default useFeeSettings;
