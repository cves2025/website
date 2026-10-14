import { useCallback, useEffect, useMemo, useState } from "react";
import { getExamSheet, loadMarksForExam } from "../utils/marksService";
import type { ResultExamInput } from "../utils/resultCardModel";
import type { ExamDoc, ExamSheetDoc, MarksDoc } from "../utils/type";

export interface ResultCardDataParams {
  /** Academic session, e.g. "2026-27". */
  session: string;
  className: string;
  /** Leave empty to load every section of the class. */
  section: string;
  /** The exams picked on the generate screen (any order). */
  exams: ExamDoc[];
}

export interface ResultCardData {
  loading: boolean;
  error: string | null;
  /** Sheet + marks of every selected exam for one student (studentUid). */
  inputsFor: (studentUid: string) => ResultExamInput[];
  reload: () => void;
}

interface LoadedData {
  sheets: Record<string, ExamSheetDoc | null>;
  marks: Record<string, Map<string, MarksDoc>>;
}

const EMPTY: LoadedData = { sheets: {}, marks: {} };

/**
 * Loads, for one class (+ section), the frozen exam sheet and every student's
 * marks of each selected exam. One query per exam; students are then looked up
 * in memory, so printing 40 cards costs the same as printing one.
 *
 * Marks are read without exam rules on purpose: the result card recomputes
 * every total itself from `subjectMarks`.
 */
export function useResultCardData({
  session,
  className,
  section,
  exams,
}: ResultCardDataParams): ResultCardData {
  const [data, setData] = useState<LoadedData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Re-fetch only when the set of exam ids changes, not on every new array.
  const examKey = exams
    .map((exam) => exam.id)
    .sort()
    .join("|");
  const examIds = useMemo(() => (examKey ? examKey.split("|") : []), [examKey]);

  useEffect(() => {
    if (!session || !className || examIds.length === 0) {
      setData(EMPTY);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(
      examIds.map(async (examId) => {
        const [sheet, marksDocs] = await Promise.all([
          getExamSheet(session, examId, className),
          loadMarksForExam(session, examId, className, section || undefined),
        ]);
        return { examId, sheet, marksDocs };
      })
    )
      .then((results) => {
        if (cancelled) return;
        const next: LoadedData = { sheets: {}, marks: {} };
        results.forEach(({ examId, sheet, marksDocs }) => {
          next.sheets[examId] = sheet;
          next.marks[examId] = new Map(
            marksDocs.map((marksDoc) => [marksDoc.studentUid, marksDoc])
          );
        });
        setData(next);
        setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("Failed to load result card data:", loadError);
        setData(EMPTY);
        setError("Could not load the marks for the selected exams.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, className, section, examIds, reloadNonce]);

  const inputsFor = useCallback(
    (studentUid: string): ResultExamInput[] =>
      exams.map((exam) => ({
        exam,
        sheet: data.sheets[exam.id] ?? null,
        marks: data.marks[exam.id]?.get(studentUid) ?? null,
      })),
    [exams, data]
  );

  return {
    loading,
    error,
    inputsFor,
    reload: () => setReloadNonce((value) => value + 1),
  };
}