import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import type { QueryDocumentSnapshot } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";

export interface StudentSearchResult {
  /** Master `students` id (enrollment id when missing), as on the section list. */
  studentId: string;
  studentName: string;
  enrollment: string;
  className: string;
  section: string;
  fatherName: string;
}

/** Wait after the last key press before reading. */
const DEBOUNCE_MS = 350;
/** Docs read per name query (they span every session, filtered here). */
const NAME_LIMIT = 40;
const MAX_RESULTS = 12;

/** Answers already read, by "session|term", for the whole app session. */
const cache = new Map<string, Promise<StudentSearchResult[]>>();

const toResult = (item: QueryDocumentSnapshot): StudentSearchResult => {
  const data = item.data();
  return {
    studentId: String(data.studentId ?? "").trim() || item.id,
    studentName: String(data.studentName || `${data.firstName ?? ""} ${data.lastName ?? ""}`).trim(),
    enrollment: String(data.enrollment ?? ""),
    className: String(data.className ?? ""),
    section: String(data.section ?? ""),
    fatherName: String(data.fatherName ?? ""),
  };
};

const prefixQuery = (field: string, prefix: string) =>
  query(
    collection(db, COLLECTION.ENROLLMENTS),
    where(field, ">=", prefix),
    where(field, "<=", `${prefix}`),
    orderBy(field),
    limit(NAME_LIMIT)
  );

/**
 * Students of one session whose enrollment number is `term`, or whose name
 * starts with it (first or last name). Uses only single-field indexes: the
 * enrollment is an exact match, the name a prefix range filtered to the
 * session here.
 */
function searchStudents(session: string, term: string): Promise<StudentSearchResult[]> {
  const key = `${session}|${term}`;
  let answer = cache.get(key);
  if (answer) return answer;

  const lower = term.toLowerCase();
  const firstWord = lower.split(/\s+/)[0];
  answer = Promise.all([
    getDocs(
      query(
        collection(db, COLLECTION.ENROLLMENTS),
        where("academicYear", "==", session),
        where("enrollment", "==", term)
      )
    ),
    getDocs(prefixQuery("firstNameLower", firstWord)),
    // A single word may also be the start of a surname.
    lower.includes(" ") ? null : getDocs(prefixQuery("lastNameLower", firstWord)),
  ]).then(([byEnrollment, byFirst, byLast]) => {
    const seen = new Set<string>();
    const results: StudentSearchResult[] = [];
    const add = (item: QueryDocumentSnapshot, checkName: boolean) => {
      const data = item.data();
      if (data.isDeleted === true || data.academicYear !== session) return;
      const result = toResult(item);
      if (checkName && !result.studentName.toLowerCase().split(/\s+/).join(" ").includes(lower)) return;
      if (seen.has(result.studentId)) return;
      seen.add(result.studentId);
      results.push(result);
    };
    byEnrollment.docs.forEach((item) => add(item, false));
    byFirst.docs.forEach((item) => add(item, true));
    byLast?.docs.forEach((item) => add(item, true));
    return results.slice(0, MAX_RESULTS);
  });
  // A failed read is not kept, so the same search can be tried again.
  answer.catch(() => cache.delete(key));
  cache.set(key, answer);
  return answer;
}

/**
 * Searches the students of `session` by enrollment number or name while the
 * admin types (debounced, cached). Needs 2 letters, or 1 digit for an
 * enrollment number.
 */
export function useStudentSearch(session: string, rawTerm: string) {
  const term = rawTerm.trim().replace(/\s+/g, " ");
  const ready = Boolean(session) && (term.length >= 2 || /^\d+$/.test(term));
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (!ready) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchStudents(session, term)
        .then((found) => {
          if (!cancelled) setResults(found);
        })
        .catch((cause) => {
          console.error("Student search failed:", cause);
          if (!cancelled) setError("Search failed. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session, term, ready]);

  return { results, loading, error, ready };
}

export default useStudentSearch;
