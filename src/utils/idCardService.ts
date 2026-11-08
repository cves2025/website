/**
 * Firestore access of the ID Card page.
 *
 * - `settings/idCard` - card size, and each tab's template, fields and extras.
 * - `stampSign/principle` - the principal's signature and the school stamp
 *   (read only; uploaded with the admit card settings).
 */
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import {
  COLLECTION,
  ID_CARD_SETTINGS_DOC,
  STAMP_SIGN_FIELDS,
  STAMP_SIGN_PRINCIPLE_DOC,
} from "../constants";
import { db } from "../firebase/config";
import { readIdCardSettings } from "./idCardSettings";
import type { IdCardSettings } from "./type";

export async function loadIdCardSettings(): Promise<IdCardSettings> {
  const snapshot = await getDoc(doc(db, COLLECTION.SETTINGS, ID_CARD_SETTINGS_DOC));
  return readIdCardSettings(snapshot.exists() ? snapshot.data() : {});
}

export async function saveIdCardSettings(settings: IdCardSettings, updatedBy: string): Promise<void> {
  // Read back through readIdCardSettings, so only clean values are written
  // (numbers typed into the form arrive as text).
  const clean = readIdCardSettings(settings);
  await setDoc(doc(db, COLLECTION.SETTINGS, ID_CARD_SETTINGS_DOC), {
    ...clean,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

export interface SchoolSigns {
  /** The principal's signature ("" when not uploaded). */
  sign: string;
  stamp: string;
}

let signsPromise: Promise<SchoolSigns> | null = null;

/** Read once per app session; a missing document just gives no images. */
export function loadSchoolSigns(): Promise<SchoolSigns> {
  if (!signsPromise) {
    signsPromise = getDoc(doc(db, COLLECTION.STAMP_SIGN, STAMP_SIGN_PRINCIPLE_DOC))
      .then((snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const text = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");
        return {
          sign: text(STAMP_SIGN_FIELDS.PRINCIPAL_SIGN_URL),
          stamp: text(STAMP_SIGN_FIELDS.SCHOOL_STAMP_URL),
        };
      })
      .catch((cause) => {
        console.error("Signature and stamp could not be loaded.", cause);
        signsPromise = null;
        return { sign: "", stamp: "" };
      });
  }
  return signsPromise;
}
