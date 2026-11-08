import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "./config";
import { compressImage } from "../utils/compressImage";

/** Largest picture kept as it is (PNG / SVG keep their see-through parts). */
const KEEP_AS_IS_BYTES = 2 * 1024 * 1024;

/**
 * Uploads a picture for the ID card designer and returns its URL. Photos
 * are compressed to JPEG; a PNG / SVG / WebP under 2 MB is kept as it is, so
 * a transparent background stays transparent.
 */
export async function uploadIdCardImage(file: File): Promise<string> {
  const keep = /png|svg|webp/.test(file.type) && file.size <= KEEP_AS_IS_BYTES;
  const extension = keep ? (file.type.includes("svg") ? "svg" : file.type.split("/")[1]) : "jpg";
  const body = keep ? file : await compressImage(file);
  const storageRef = ref(storage, `idCard/images/${crypto.randomUUID()}.${extension}`);
  await uploadBytes(storageRef, body, { contentType: keep ? file.type : "image/jpeg" });
  return getDownloadURL(storageRef);
}
