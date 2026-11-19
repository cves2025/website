import type { UnlockMethod } from "../constants";
import { loadPinStatus, loadUnlockSetting, type PinStatus } from "../utils/pinService";
import useAsyncData from "./useAsyncData";

export interface LockSettingsData {
  method: UnlockMethod;
  /** null when the server could not be reached. */
  pin: PinStatus | null;
}

/** Settings > Lock & PIN: the school's unlock method and the admin's own PIN status. */
export function useLockSettings() {
  const { data, setData, loading, error, reload } = useAsyncData<LockSettingsData>(
    async () => {
      const [method, pin] = await Promise.all([loadUnlockSetting(), loadPinStatus().catch(() => null)]);
      return { method, pin };
    },
    [],
    { initial: { method: "password", pin: null }, errorMessage: "The lock settings could not be loaded." }
  );
  return { settings: data, setSettings: setData, loading, error, reload };
}

export default useLockSettings;
