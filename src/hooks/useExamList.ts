// hooks/useExamList.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

// NOTE: import paths ko apne project ke hisaab se adjust kar lena
import { db } from "../firebase/config";
import { COLLECTION } from "../constants";
import { toExamDoc } from "../component/panel/exams/examScheduleShared";
import type { ExamDoc } from "../utils/type";

/* ---------- Shared cache (sab components ke beech) ---------- */
let cachedExams: ExamDoc[] | null = null;
let inflightRequest: Promise<ExamDoc[]> | null = null;

const fetchExams = (force = false): Promise<ExamDoc[]> => {
  if (!force && cachedExams) return Promise.resolve(cachedExams);
  if (inflightRequest) return inflightRequest; // duplicate requests avoid

  const examsQuery = query(
    collection(db, COLLECTION.EXAMS),
    orderBy("sequence", "asc")
  );

  inflightRequest = getDocs(examsQuery)
    .then((snapshot) => {
      const exams = snapshot.docs.map(toExamDoc);
      cachedExams = exams;
      return exams;
    })
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
};

/* ---------- Hook ---------- */
export interface UseExamListResult {
  exams: ExamDoc[];
  loadingExam: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useExamList(): UseExamListResult {
  const [exams, setExams] = useState<ExamDoc[]>(cachedExams ?? []);
  const [loadingExam, setLoadingExam] = useState<boolean>(!cachedExams);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const load = useCallback(async (force = false) => {
    setLoadingExam(true);
    setError(null);
    try {
      const data = await fetchExams(force);
      if (isMounted.current) setExams(data);
    } catch (err) {
      console.error("Failed to load exams:", err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error("Failed to load exams"));
      }
    } finally {
      if (isMounted.current) setLoadingExam(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (!cachedExams) {
      void load();
    }
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return { exams, loadingExam, error, refetch };
}

export default useExamList;