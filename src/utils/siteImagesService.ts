/**
 * Website photos that admins can replace, stored in ONE document:
 *
 *   panelSettings/siteImages -> { schoolPhotoUrl, updatedAt, updatedBy }
 *
 * The school photo (Home and About page) lives in Storage at
 * site/school-photo.jpg. An empty / missing URL means the photo bundled with
 * the code is shown.
 */
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { COLLECTION, PRE_DEFINED_DOC_ID } from "../constants";
import { db, storage } from "../firebase/config";
import { compressImage } from "./compressImage";

const SCHOOL_PHOTO_PATH = "site/school-photo.jpg";

const siteImagesRef = () =>
  doc(db, COLLECTION.PANEL_SETTINGS, PRE_DEFINED_DOC_ID.SITE_IMAGES);

/** Live school photo URL ("" = use the bundled photo). */
export function subscribeSchoolPhoto(
  onData: (url: string) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    siteImagesRef(),
    (snapshot) => {
      const url = snapshot.exists() ? snapshot.data().schoolPhotoUrl : "";
      onData(typeof url === "string" ? url : "");
    },
    onError
  );
}

export async function saveSchoolPhoto(
  file: File,
  updatedBy: string
): Promise<void> {
  const compressed = await compressImage(file, {
    maxDimension: 1600,
    quality: 0.85,
  });
  const storageRef = ref(storage, SCHOOL_PHOTO_PATH);
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  const separator = url.includes("?") ? "&" : "?";

  await setDoc(
    siteImagesRef(),
    {
      schoolPhotoUrl: `${url}${separator}v=${Date.now()}`,
      updatedAt: serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );
}

/** Goes back to the bundled photo and deletes the uploaded one. */
export async function removeSchoolPhoto(updatedBy: string): Promise<void> {
  await setDoc(
    siteImagesRef(),
    { schoolPhotoUrl: "", updatedAt: serverTimestamp(), updatedBy },
    { merge: true }
  );
  try {
    await deleteObject(ref(storage, SCHOOL_PHOTO_PATH));
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== "storage/object-not-found") throw error;
  }
}
