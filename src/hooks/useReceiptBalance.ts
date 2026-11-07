import { loadReceiptBalance } from "../utils/feeService";
import type { FeePayment, ReceiptBalance } from "../utils/type";
import { useAsyncData } from "./useAsyncData";

/**
 * Paid earlier / balance due around a receipt. Read only when `enabled`
 * (the "Balance" design is chosen) and the receipt is not cancelled.
 */
export function useReceiptBalance(payment: FeePayment | null, enabled: boolean) {
  const { data, loading, error } = useAsyncData<ReceiptBalance | null>(
    () => loadReceiptBalance(payment as FeePayment),
    [payment?.id],
    {
      initial: null,
      enabled: enabled && Boolean(payment) && payment?.status === "active",
      errorMessage: "Balance could not be loaded.",
    }
  );
  return { balance: data, loading, error };
}

export default useReceiptBalance;
