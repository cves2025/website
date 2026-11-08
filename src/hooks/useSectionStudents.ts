import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import { loadRollNumbers } from "../utils/rollNumbers";

export interface SectionStudent {
  /** Master `students` id (enrollment id when missing) - the attendance key. */
  studentId: string;
  studentName: string;
  admissionNo: string;
  fatherName: string;
  /** 0 when roll numbers are not generated yet. */
  rollNumber: number;
  /** Photo URL when the enrollment carries one ("" = read it from `students`). */
  photo: string;
  /** Parent's phone from the enrollment ("" when missing). */
  phone: string;
}

/**
 * The students of one section in a session, in roll-number order (students
 * without a roll number last, by name). Always read fresh, so a student
 * admitted a moment ago is on today's attendance list.
 */
export function useSectionStudents(
  session: string,
  className: string,
  section: string
) {
  const [students, setStudents] = useState<SectionStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !className || !section) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getDocs(
        query(
          collection(db, COLLECTION.ENROLLMENTS),
          where("academicYear", "==", session),
          where("className", "==", className),
          where("section", "==", section)
        )
      ),
      loadRollNumbers(session, [className]),
    ])
      .then(([snapshot, rollNumbers]) => {
        if (cancelled) return;
        const rows = snapshot.docs
          .filter((item) => item.data().isDeleted !== true)
          .map((item): SectionStudent => {
            const data = item.data();
            const studentId = String(data.studentId ?? "").trim() || item.id;
            return {
              studentId,
              studentName: String(
                data.studentName ||
                  `${data.firstName ?? ""} ${data.lastName ?? ""}`
              ).trim(),
              admissionNo: String(data.enrollment ?? ""),
              fatherName: String(data.fatherName ?? ""),
              rollNumber:
                rollNumbers.get(studentId) ?? rollNumbers.get(item.id) ?? 0,
              photo: typeof data.studentPhoto === "string" ? data.studentPhoto : "",
              phone: String(data.phone ?? "").trim(),
            };
          });
        rows.sort(
          (a, b) =>
            (a.rollNumber || Infinity) - (b.rollNumber || Infinity) ||
            a.studentName.localeCompare(b.studentName)
        );
        setStudents(rows);
      })
      .catch((cause) => {
        console.error("Failed to load section students:", cause);
        if (!cancelled) setError("Students could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, className, section]);

  return { students, loading, error };
}

export default useSectionStudents;
