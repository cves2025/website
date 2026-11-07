import { DEFAULT_RECEIPT_PRINT } from "../constants";
import { loadReceiptPrintSettings } from "../utils/feeService";
import { useAsyncData } from "./useAsyncData";

/** How receipts are printed, school-wide (the default until it is saved). */
export function useReceiptPrintSettings() {
  const { data, setData, loading, error } = useAsyncData(loadReceiptPrintSettings, [], {
    initial: DEFAULT_RECEIPT_PRINT,
    errorMessage: "Print settings could not be loaded.",
  });
  return { settings: data, setSettings: setData, loading, error };
}

export default useReceiptPrintSettings;
