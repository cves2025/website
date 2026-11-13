import { useEffect, useState } from "react";

import { progressKey } from "../utils/marksProgress";
import { countSectionStudents, loadMarksProgress } from "../utils/marksProgressService";
import type { MarksProgressDoc } from "../utils/type";
import { useAsyncData } from "./useAsyncData";

/**
 * Marks entry progress of one exam for the dashboard: the progress document
 * (one read) and the students of every class + section it does not know yet
 * (count queries, remembered for the app session).
 */
export function useMarksProgress(
  session: string,
  examId: string,
  classes: readonly string[],
  sections: readonly string[],
  enabled: boolean
) {
  const progress = useAsyncData<MarksProgressDoc | null>(() => loadMarksProgress(session, examId), [session, examId], {
    initial: null,
    enabled: enabled && Boolean(session && examId),
    errorMessage: "Marks progress could not be loaded.",
  });

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countError, setCountError] = useState<string | null>(null);
  const classKey = classes.join(",");
  const sectionKey = sections.join(",");
  // The counts are for this exam and these classes (not a previous choice).
  const want = `${session}|${examId}|${classKey}|${sectionKey}`;
  const [countedFor, setCountedFor] = useState("");

  useEffect(() => {
    if (!enabled || progress.loading || progress.error || !session) return;
    const known = progress.data?.sections ?? {};
    const missing = classes.flatMap((className) =>
      sections
        .filter((section) => !(known[progressKey(className, section)]?.students > 0))
        .map((section) => [className, section] as const)
    );
    if (missing.length === 0) {
      setCounts({});
      setCountedFor(want);
      return;
    }
    let cancelled = false;
    setCountError(null);
    Promise.all(missing.map(([className, section]) => countSectionStudents(session, className, section)))
      .then((values) => {
        if (cancelled) return;
        setCounts(Object.fromEntries(missing.map(([className, section], index) => [progressKey(className, section), values[index]])));
        setCountedFor(want);
      })
      .catch((cause) => {
        console.error("Students could not be counted.", cause);
        if (!cancelled) setCountError("Students could not be counted.");
      });
    return () => {
      cancelled = true;
    };
    // classKey / sectionKey stand for the arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, progress.loading, progress.error, progress.data, want]);

  /** Students of a class + section: from the progress, else counted. */
  const studentsOf = (className: string, section: string) => {
    const key = progressKey(className, section);
    return progress.data?.sections[key]?.students || counts[key] || 0;
  };

  return {
    progress: progress.data,
    studentsOf,
    loading: progress.loading || (!progress.error && !countError && enabled && countedFor !== want),
    error: progress.error ?? countError,
  };
}

export default useMarksProgress;
