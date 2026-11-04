import { emptyFeeStructure } from "../utils/feeStructure";
import { fetchFeeStructure } from "../utils/feeService";
import { useAsyncData } from "./useAsyncData";

/** The fee structure of a session; `saved` is false when it was never saved. */
export function useFeeStructure(session: string) {
  const { data, loading, error, reload } = useAsyncData(
    () => fetchFeeStructure(session),
    [session],
    {
      initial: { structure: emptyFeeStructure(session), saved: false },
      enabled: Boolean(session),
      errorMessage: "Fee structure could not be loaded.",
    }
  );
  return { structure: data.structure, saved: data.saved, loading, error, reload };
}

export default useFeeStructure;
