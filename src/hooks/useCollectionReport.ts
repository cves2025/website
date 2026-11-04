import { loadPaymentsBetween } from "../utils/feeService";
import type { FeePayment } from "../utils/type";
import { useAsyncData } from "./useAsyncData";

/** Receipts dated `from` to `to` ("yyyy-MM-dd", inclusive), newest first. */
export function useCollectionReport(from: string, to: string) {
  const { data, loading, error, reload } = useAsyncData<FeePayment[]>(
    () => loadPaymentsBetween(from, to),
    [from, to],
    {
      initial: [],
      enabled: Boolean(from && to && from <= to),
      errorMessage: "Collection report could not be loaded.",
    }
  );
  return { payments: data, loading, error, reload };
}

export default useCollectionReport;
