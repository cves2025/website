import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getExamSheet,
  loadLiveSubjects,
  loadMarksForExam,
  syncSheetWithLiveSubjects,
  type LiveSubject,
} from "../utils/marksService";
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
  /** Live subjects of the class, used to keep the frozen exam sheets in sync. */
  liveSubjects: LiveSubject[];
}

const EMPTY: LoadedData = { sheets: {}, marks: {}, liveSubjects: [] };

/**
 * Loads, for one class (+ section), the frozen exam sheet and every student's
 * marks of each selected exam. One query per exam; students are then looked up
 * in memory, so printing 40 cards costs the same as printing one.
 *
 * The live subjects of the class are loaded as well and applied on the frozen
 * sheets once per exam (see syncSheetWithLiveSubjects): report card order,
 * "Show in Report Card" and subjects created after the sheet was frozen.
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

    Promise.all([
      Promise.all(
        examIds.map(async (examId) => {
          const [sheet, marksDocs] = await Promise.all([
            getExamSheet(session, examId, className),
            loadMarksForExam(session, examId, className, section || undefined),
          ]);
          return { examId, sheet, marksDocs };
        })
      ),
      // Failure is not fatal: the frozen sheets are used as they are.
      loadLiveSubjects(className).catch((): LiveSubject[] => []),
    ])
      .then(([examResults, liveSubjects]) => {
        if (cancelled) return;
        const next: LoadedData = { sheets: {}, marks: {}, liveSubjects };
        examResults.forEach(({ examId, sheet, marksDocs }) => {
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

  // The synced sheet is the same for every student, so it is built once per exam.
  const syncedSheets = useMemo(() => {
    const result: Record<string, ExamSheetDoc | null> = {};
    exams.forEach((exam) => {
      const sheet = data.sheets[exam.id] ?? null;
      if (!sheet) {
        result[exam.id] = null;
        return;
      }
      const subjectIdsWithMarks = new Set<string>();
      data.marks[exam.id]?.forEach((marksDoc) => {
        Object.keys(marksDoc.subjectMarks ?? {}).forEach((id) =>
          subjectIdsWithMarks.add(id)
        );
      });
      result[exam.id] = syncSheetWithLiveSubjects({
        sheet,
        exam,
        className,
        liveSubjects: data.liveSubjects,
        subjectIdsWithMarks,
      });
    });
    return result;
  }, [exams, data, className]);

  const inputsFor = useCallback(
    (studentUid: string): ResultExamInput[] =>
      exams.map((exam) => ({
        exam,
        sheet: syncedSheets[exam.id] ?? null,
        marks: data.marks[exam.id]?.get(studentUid) ?? null,
      })),
    [exams, data, syncedSheets]
  );

  return {
    loading,
    error,
    inputsFor,
    reload: () => setReloadNonce((value) => value + 1),
  };
}