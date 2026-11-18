import { loadTcVerify } from "../utils/tcService";
import type { TcVerifyRecord } from "../utils/type";
import useAsyncData from "./useAsyncData";

/** The public copy of a TC for the QR verify page (null = not found). */
export function useTcVerify(tcId: string) {
  const { data, loading, error } = useAsyncData<TcVerifyRecord | null>(() => loadTcVerify(tcId), [tcId], {
    initial: null,
    errorMessage: "The certificate could not be checked. Please try again.",
  });
  return { record: data, loading, error };
}

export default useTcVerify;
