import { collection, getDocs, query, where } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import type { StudentRow } from "./studentImport";

/** Firestore accepts at most 30 values in a single `in` filter. */
const ENROLLMENTS_PER_IN_QUERY = 30;

/** Identity of an enrollment: one enrollment number per academic year. */
export const enrollmentKey = (academicYear: string, enrollment: string) =>
  `${academicYear}|${enrollment.trim().toLowerCase()}`;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/**
 * Keys (see `enrollmentKey`) of the imported rows that already exist in
 * Firestore. Recycle-bin enrollments are included on purpose, because they
 * still own the enrollment number. Only matching documents are read.
 */
export async function findExistingEnrollmentKeys(
  rows: StudentRow[]
): Promise<Set<string>> {
  const enrollmentsByYear = new Map<string, Set<string>>();

  rows.forEach((row) => {
    const set = enrollmentsByYear.get(row.academicYear) ?? new Set<string>();
    set.add(row.enrollment.trim());
    enrollmentsByYear.set(row.academicYear, set);
  });

  const existing = new Set<string>();
  const queries: Promise<void>[] = [];

  enrollmentsByYear.forEach((enrollments, academicYear) => {
    chunk(Array.from(enrollments), ENROLLMENTS_PER_IN_QUERY).forEach((batch) => {
      queries.push(
        getDocs(
          query(
            collection(db, COLLECTION.ENROLLMENTS),
            where("academicYear", "==", academicYear),
            where("enrollment", "in", batch)
          )
        ).then((snapshot) => {
          snapshot.forEach((document) => {
            existing.add(
              enrollmentKey(academicYear, String(document.data().enrollment ?? ""))
            );
          });
        })
      );
    });
  });

  await Promise.all(queries);
  return existing;
}