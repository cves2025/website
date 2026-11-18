import { loadLastTcNo } from "../utils/tcService";
import useAsyncData from "./useAsyncData";

/** TC No. of the last issued TC ("" when none); the next TC No. is suggested from it. */
export function useLastTcNo(enabled: boolean) {
  const { data, loading } = useAsyncData<string>(loadLastTcNo, [], {
    initial: "",
    enabled,
    errorMessage: "The last TC No. could not be loaded.",
  });
  return { lastTcNo: data, loading };
}

export default useLastTcNo;
