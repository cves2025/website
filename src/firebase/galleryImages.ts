import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "./config";
import { compressImage } from "../utils/compressImage";

/** Gallery photos open full screen, so they keep more detail than avatars. */
const GALLERY_COMPRESSION = { maxDimension: 1600, quality: 0.82 };

/** Storage path where a gallery photo always lives. */
export function galleryImagePath(photoId: string): string {
  return `gallery/${photoId}.jpg`;
}

export async function uploadGalleryImage(
  photoId: string,
  file: File,
): Promise<string> {
  const compressed = await compressImage(file, GALLERY_COMPRESSION);
  const storageRef = ref(storage, galleryImagePath(photoId));

  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

/** Deletes a gallery photo from Storage, if it exists. */
export async function deleteGalleryImage(photoId: string): Promise<void> {
  try {
    await deleteObject(ref(storage, galleryImagePath(photoId)));
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== "storage/object-not-found") {
      throw error;
    }
  }
}
