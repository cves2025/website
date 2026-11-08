import { loadIdCardSettings, loadSchoolSigns, type SchoolSigns } from "../utils/idCardService";
import { defaultIdCardSettings } from "../utils/idCardSettings";
import type { IdCardSettings } from "../utils/type";
import { useAsyncData } from "./useAsyncData";

/** The saved ID card settings (defaults until an admin saves them). */
export function useIdCardSettings() {
  const { data, setData, loading, error } = useAsyncData<IdCardSettings>(loadIdCardSettings, [], {
    initial: defaultIdCardSettings(),
    errorMessage: "ID card settings could not be loaded.",
  });
  return { settings: data, setSettings: setData, loading, error };
}

/** The principal's signature and the school stamp, read once. */
export function useSchoolSigns() {
  const { data } = useAsyncData<SchoolSigns>(loadSchoolSigns, [], {
    initial: { sign: "", stamp: "" },
    errorMessage: "Signature and stamp could not be loaded.",
  });
  return data;
}

export default useIdCardSettings;
