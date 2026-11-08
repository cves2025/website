import { doc, getDoc } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import { useAsyncData } from "./useAsyncData";

/**
 * Photo URLs already read, by student id, for the whole app session. A
 * student's photo is read at most once, however often they are picked.
 */
const photoCache = new Map<string, Promise<string>>();

/** A student's photo URL ("" when none), read once per app session. */
export function loadStudentPhoto(studentId: string): Promise<string> {
  let photo = photoCache.get(studentId);
  if (!photo) {
    photo = getDoc(doc(db, COLLECTION.STUDENTS, studentId)).then((snapshot) => {
      const value = snapshot.exists() ? snapshot.data().studentPhoto : "";
      return typeof value === "string" ? value : "";
    });
    // A failed read is not cached, so the next pick tries again.
    photo.catch(() => photoCache.delete(studentId));
    photoCache.set(studentId, photo);
  }
  return photo;
}

/**
 * The photo of one student ("" when there is none). `knownPhoto` (e.g. from
 * the enrollment already loaded) is used as is, without reading anything.
 */
export function useStudentPhoto(studentId: string, knownPhoto = "") {
  const { data } = useAsyncData<string>(() => loadStudentPhoto(studentId), [studentId], {
    initial: "",
    enabled: Boolean(studentId) && !knownPhoto,
    errorMessage: "Student photo could not be loaded.",
  });
  return knownPhoto || data;
}

export default useStudentPhoto;
