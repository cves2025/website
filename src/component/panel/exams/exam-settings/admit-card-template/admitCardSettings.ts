import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ADMIT_CARD_SETTINGS_DOC, COLLECTION } from "../../../../../constants";
import { db } from "../../../../../firebase/config";
import { isValidTemplateId, type AdmitCardTemplateId } from "./admitCardTemplates";

const settingsRef = () =>
  doc(db, COLLECTION.SETTINGS, ADMIT_CARD_SETTINGS_DOC);

export async function saveAdmitCardTemplate(
  templateId: AdmitCardTemplateId,
  updatedBy: string
): Promise<void> {
  await setDoc(
    settingsRef(),
    {
      selectedTemplate: templateId,
      updatedAt: serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );
}

export function subscribeAdmitCardTemplate(
  onChange: (id: AdmitCardTemplateId | null) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    settingsRef(),
    (snapshot) => {
      const value = snapshot.data()?.selectedTemplate;
      onChange(isValidTemplateId(value) ? value : null);
    },
    onError
  );
}