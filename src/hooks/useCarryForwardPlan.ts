import { loadCarryForwardPlan } from "../utils/feeService";
import type { CarryForwardItem } from "../utils/type";
import { useAsyncData } from "./useAsyncData";

/**
 * Students of `session` whose previous-session dues can be carried forward.
 * Loads only while `enabled` (it reads both sessions in full).
 */
export function useCarryForwardPlan(session: string, enabled: boolean) {
  const { data, loading, error, reload } = useAsyncData<CarryForwardItem[]>(
    () => loadCarryForwardPlan(session),
    [session],
    {
      initial: [],
      enabled: Boolean(session) && enabled,
      errorMessage: "Previous dues could not be loaded.",
    }
  );
  return { items: data, loading, error, reload };
}

export default useCarryForwardPlan;
