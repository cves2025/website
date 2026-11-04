import { loadAccountPayments } from "../utils/feeService";
import type { FeePayment } from "../utils/type";
import { useAsyncData } from "./useAsyncData";

/** Receipts of one fee account, newest first (empty until `accountId` is set). */
export function useAccountPayments(accountId: string) {
  const { data, loading, error, reload } = useAsyncData<FeePayment[]>(
    () => loadAccountPayments(accountId),
    [accountId],
    { initial: [], enabled: Boolean(accountId), errorMessage: "Payments could not be loaded." }
  );
  return { payments: data, loading, error, reload };
}

export default useAccountPayments;
