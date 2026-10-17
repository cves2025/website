import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import { getRollNumberDocumentId } from "../utils/rollNumbers";
import type { RollNumberDocument } from "../utils/type";

/**
 * Reads the roll number document of every requested class (one read per
 * class) and merges them into a `studentId -> rollNumber` map.
 */
async function fetchRollNumbers(
  academicYear: string,
  classNames: string[]
): Promise<Map<string, number>> {
  const snapshots = await Promise.all(
    classNames.map((className) =>
      getDoc(
        doc(
          db,
          COLLECTION.ROLL_NUMBER,
          getRollNumberDocumentId(academicYear, className)
        )
      )
    )
  );

  const rollNumbers = new Map<string, number>();

  snapshots.forEach((snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data() as Partial<RollNumberDocument>;
    (data.students ?? []).forEach((entry) => {
      rollNumbers.set(entry.studentId, entry.rollNumber);
    });
  });

  return rollNumbers;
}

interface Options {
  academicYear: string;
  /** Classes whose roll numbers are needed. */
  classNames: readonly string[];
  enabled?: boolean;
}

export function useClassRollNumbers({
  academicYear,
  classNames,
  enabled = true,
}: Options) {
  const [rollNumbers, setRollNumbers] = useState<Map<string, number>>(
    () => new Map()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // A stable key, so a new array with the same classes does not refetch.
  const classKey = classNames.join("|");

  useEffect(() => {
    if (!enabled || !academicYear || !classKey) {
      setRollNumbers(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchRollNumbers(academicYear, classKey.split("|"))
      .then((data) => {
        if (!cancelled) setRollNumbers(data);
      })
      .catch((cause) => {
        console.error("Failed to load roll numbers:", cause);
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause
              : new Error("Failed to load roll numbers")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [academicYear, classKey, enabled]);

  /**
   * Roll number of a student, or 0 when none is generated yet.
   * The roll number document keys a student by `studentId`, falling back to
   * the enrollment id for records without one.
   */
  const getRollNumber = useCallback(
    (studentId: string, enrollmentId = ""): number =>
      rollNumbers.get(studentId) ?? rollNumbers.get(enrollmentId) ?? 0,
    [rollNumbers]
  );

  return { rollNumbers, getRollNumber, loading, error };
}

export default useClassRollNumbers;