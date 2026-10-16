import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import type { CardStudent } from "../../../utils/type";
import {
  loadStudentsWithClassNameVariants,
  sortCardStudents,
  toCardStudent,
} from "./examScheduleShared";

interface Params {
  year: string;
  className: string;
  /** Empty = every section of the class. */
  section: string;
  /** Enrollment numbers picked on the generate screen. */
  enrollments: string[];
  allStudents: boolean;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * The students whose result cards are printed, with the extra details
 * (mother's name, father's name, photo) from the students documents.
 * No exam schedule is needed, unlike the admit card generator.
 */
export function useResultCardStudents({
  year,
  className,
  section,
  enrollments,
  allStudents,
}: Params) {
  const [cards, setCards] = useState<CardStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enrollmentKey = enrollments.join(",");

  useEffect(() => {
    if (!className) {
      setCards([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, COLLECTION.ENROLLMENTS),
            where("className", "==", className)
          )
        );
        let list = snapshot.docs
          .map(toCardStudent)
          .filter((student): student is CardStudent => student !== null);
        if (list.length === 0) {
          list = await loadStudentsWithClassNameVariants(className);
        }

        const wanted = new Set(enrollmentKey ? enrollmentKey.split(",") : []);
        list = list
          .filter(
            (student) =>
              (!year || !student.academicYear || student.academicYear === year) &&
              (!section || student.section === section) &&
              (allStudents || wanted.has(student.enrollment))
          )
          .sort(sortCardStudents);

        const detailed = await Promise.all(
          list.map(async (student): Promise<CardStudent> => {
            if (!student.studentId) return student;
            try {
              const detail = await getDoc(
                doc(db, COLLECTION.STUDENTS, student.studentId)
              );
              if (!detail.exists()) return student;
              const data = detail.data();
              return {
                ...student,
                motherName: text(data.motherName) || student.motherName,
                fatherName: text(data.fatherName) || student.fatherName,
                studentPhoto: text(data.studentPhoto) || student.studentPhoto,
              };
            } catch {
              return student;
            }
          })
        );

        if (cancelled) return;
        setCards(detailed);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) return;
        console.error("Failed to load result card students:", loadError);
        setCards([]);
        setError("Could not load the students.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [year, className, section, enrollmentKey, allStudents]);

  return { cards, loading, error };
}