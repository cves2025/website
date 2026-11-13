/**
 * Firestore reads of the dashboard's marks card: the exam's progress
 * document (one read) and, for a class + section the document does not
 * know yet, its number of students (a count query, remembered).
 */
import { collection, doc, getCountFromServer, getDoc, query, where } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import { readMarksProgress } from "./marksProgress";
import type { MarksProgressDoc } from "./type";

export async function loadMarksProgress(session: string, examId: string): Promise<MarksProgressDoc | null> {
  const snapshot = await getDoc(doc(db, COLLECTION.MARKS_PROGRESS, `${session}_${examId}`));
  return snapshot.exists() ? readMarksProgress(snapshot.data()) : null;
}

const counted = new Map<string, Promise<number>>();

/** Students of a class + section in a session (count query, once per app session). */
export function countSectionStudents(session: string, className: string, section: string): Promise<number> {
  const key = `${session}|${className}|${section}`;
  let count = counted.get(key);
  if (!count) {
    count = getCountFromServer(
      query(
        collection(db, COLLECTION.ENROLLMENTS),
        where("academicYear", "==", session),
        where("className", "==", className),
        where("section", "==", section)
      )
    ).then((snapshot) => snapshot.data().count);
    count.catch(() => counted.delete(key));
    counted.set(key, count);
  }
  return count;
}
