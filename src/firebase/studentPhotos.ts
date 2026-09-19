import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "./config";
import { compressImage } from "../utils/compressImage";

export type PhotoKind = "student" | "father" | "mother";

const PHOTO_FILE_NAME: Record<PhotoKind, string> = {
  student: "student.jpg",
  father: "father.jpg",
  mother: "mother.jpg",
};

/** Storage path where a student's photo of the given kind always lives. */
export function studentPhotoPath(studentId: string, kind: PhotoKind): string {
  return `students/${studentId}/${PHOTO_FILE_NAME[kind]}`;
}

export async function uploadStudentPhoto(
  studentId: string,
  kind: PhotoKind,
  file: File,
): Promise<string> {
  const compressed = await compressImage(file);
  const storageRef = ref(storage, studentPhotoPath(studentId, kind));

  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

/** Deletes a student's photo of the given kind, if one exists. */
export async function deleteStudentPhoto(
  studentId: string,
  kind: PhotoKind,
): Promise<void> {
  try {
    await deleteObject(ref(storage, studentPhotoPath(studentId, kind)));
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== "storage/object-not-found") {
      throw error;
    }
  }
}