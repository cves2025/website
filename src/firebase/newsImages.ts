import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "./config";
import { compressImage } from "../utils/compressImage";

/** Storage path where the image of a news item always lives. */
export function newsImagePath(newsId: string): string {
  return `news/${newsId}/image.jpg`;
}

export async function uploadNewsImage(
  newsId: string,
  file: File,
): Promise<string> {
  const compressed = await compressImage(file);
  const storageRef = ref(storage, newsImagePath(newsId));

  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

/** Deletes the image of a news item, if one exists. */
export async function deleteNewsImage(newsId: string): Promise<void> {
  try {
    await deleteObject(ref(storage, newsImagePath(newsId)));
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== "storage/object-not-found") {
      throw error;
    }
  }
}
