import { loadFeeAccount } from "../utils/feeService";
import type { FeeAccount, FeeStudent } from "../utils/type";
import { useAsyncData } from "./useAsyncData";

/**
 * A student's fee account of a session. `saved` is false while it only
 * exists on screen (built from the fee structure, no payment yet).
 */
export function useFeeAccount(session: string, student: FeeStudent | null) {
  const { data, loading, error, reload } = useAsyncData<{
    account: FeeAccount | null;
    saved: boolean;
  }>(() => loadFeeAccount(session, student as FeeStudent), [session, student?.studentId], {
    initial: { account: null, saved: false },
    enabled: Boolean(session && student),
    errorMessage: "Fee account could not be loaded.",
  });
  return { account: data.account, saved: data.saved, loading, error, reload };
}

export default useFeeAccount;
