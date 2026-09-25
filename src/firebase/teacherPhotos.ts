import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "./config";
import { compressImage } from "../utils/compressImage";

export async function uploadTeacherPhoto(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const storageRef = ref(
    storage,
    `teachers/photos/${crypto.randomUUID()}.jpg`
  );

  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}