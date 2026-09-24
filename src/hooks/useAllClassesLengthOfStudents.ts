import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import type { QueryConstraint } from "firebase/firestore";

import { CLASSES, COLLECTION } from "../constants";
import { db } from "../firebase/config";
import type {
  AllClassesLengthOfStudents,
  ClassStudentCount,
} from "../utils/type";

/** Options accepted by {@link useAllClassesLengthOfStudents}. */
export interface UseAllClassesLengthOfStudentsOptions {
  /**
   * Academic session to count, e.g. "2026-27" (one session keeps the numbers
   * meaningful - a student re-enrolled next year would otherwise be counted
   * twice). Pass an empty string to count every session.
   */
  academicYear?: string;
}

/**
 * Counts how many students every class of `CLASSES` currently has.
 *
 * The numbers come from Firestore **aggregation queries**
 * (`getCountFromServer` -> `count()`), so a class with 500 enrollments costs a
 * couple of document reads instead of downloading 500 documents. All twelve
 * classes are counted in parallel and only `enrollments` is read - that is the
 * collection which carries `className` and the same source the Student List
 * page uses.
 *
 * Recycle-bin semantics match the Student List page: a record is "deleted" when
 * `isDeleted === true`, so `total = count(className) - count(className, deleted)`.
 * Two counts are used because `isDeleted` was introduced later - older
 * enrollment documents have no such field and would be dropped by a
 * `where("isDeleted", "==", false)` filter.
 */
export function useAllClassesLengthOfStudents({
  academicYear = "",
}: UseAllClassesLengthOfStudentsOptions = {}): AllClassesLengthOfStudents {
  const [classes, setClasses] = useState<ClassStudentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const counts = await Promise.all(
        CLASSES.map((className) => countStudentsOfClass(className, academicYear))
      );
      setClasses(counts);
    } catch (cause) {
      console.error("Failed to count the students of each class:", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to count the students of each class."
      );
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { classes, loading, error, refresh };
}

/** Aggregation query pair that resolves the student count of one class. */
async function countStudentsOfClass(
  className: string,
  academicYear: string
): Promise<ClassStudentCount> {
  const enrollments = collection(db, COLLECTION.ENROLLMENTS);

  const constraints: QueryConstraint[] = [where("className", "==", className)];
  if (academicYear) {
    constraints.push(where("academicYear", "==", academicYear));
  }

  const [enrolled, recycled] = await Promise.all([
    getCountFromServer(query(enrollments, ...constraints)),
    getCountFromServer(
      query(enrollments, ...constraints, where("isDeleted", "==", true))
    ),
  ]);

  return {
    className,
    // Guard against a stale count that would otherwise show a negative number.
    totalStudents: Math.max(0, enrolled.data().count - recycled.data().count),
  };
}
