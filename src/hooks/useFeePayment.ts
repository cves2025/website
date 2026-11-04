import { loadFeePayment } from "../utils/feeService";
import type { FeePayment } from "../utils/type";
import { useAsyncData } from "./useAsyncData";

/** One fee receipt by id (null when it does not exist). */
export function useFeePayment(paymentId: string) {
  const { data, loading, error } = useAsyncData<FeePayment | null>(
    () => loadFeePayment(paymentId),
    [paymentId],
    { initial: null, enabled: Boolean(paymentId), errorMessage: "Receipt could not be loaded." }
  );
  return { payment: data, loading, error };
}

export default useFeePayment;
