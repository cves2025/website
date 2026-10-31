import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import {
  buildSubjectColumns,
  type MarksSubjectColumn,
  type SubjectDocInput,
} from "../../../utils/marksEntry";
import { loadMarksForExam } from "../../../utils/marksService";
import { loadRollNumbers } from "../../../utils/rollNumbers";
import type {
  SavedAttendance,
  UploadRosterStudent,
} from "../../../utils/marksUpload";
import type { ExamDoc, MarksDoc } from "../../../utils/type";

interface Params {
  session: string;
  exam: ExamDoc | null;
  className: string;
}

export interface MarksUploadData {
  loading: boolean;
  error: string | null;
  /** Every student of the class + session, all sections. */
  roster: UploadRosterStudent[];
  /** Marks entry columns of the class for this exam. */
  columns: MarksSubjectColumn[];
  savedMarks: Record<string, MarksDoc>;
  savedAttendance: Record<string, SavedAttendance>;
  /** Generated roll numbers of the class (studentUid -> roll). */
  rollNumbers: Map<string, number>;
  reload: () => void;
}

interface Loaded {
  roster: UploadRosterStudent[];
  subjectDocs: SubjectDocInput[];
  savedMarks: Record<string, MarksDoc>;
  savedAttendance: Record<string, SavedAttendance>;
  rollNumbers: Map<string, number>;
}

const EMPTY: Loaded = {
  roster: [],
  subjectDocs: [],
  savedMarks: {},
  savedAttendance: {},
  rollNumbers: new Map(),
};

/**
 * One-shot load of everything the Excel upload needs for one exam + class:
 * the roster (all sections), the subjects, the saved marks, the saved
 * attendance and the generated roll numbers. Same queries and filters as the
 * Marks page.
 */
export function useMarksUploadData({
  session,
  exam,
  className,
}: Params): MarksUploadData {
  const [loaded, setLoaded] = useState<Loaded>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const examId = exam?.id ?? "";

  useEffect(() => {
    if (!session || !examId || !className) {
      setLoaded(EMPTY);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getDocs(
        query(
          collection(db, COLLECTION.ENROLLMENTS),
          where("className", "==", className),
          where("academicYear", "==", session)
        )
      ),
      getDocs(
        query(
          collection(db, COLLECTION.SUBJECTS),
          where("className", "==", className)
        )
      ),
      loadMarksForExam(session, examId, className),
      getDocs(
        query(
          collection(db, COLLECTION.ATTENDANCE),
          where("session", "==", session),
          where("examId", "==", examId),
          where("className", "==", className)
        )
      ),
      loadRollNumbers(session, [className]),
    ])
      .then(([enrollments, subjects, marksDocs, attendance, rollNumbers]) => {
        if (cancelled) return;

        const roster: UploadRosterStudent[] = [];
        enrollments.docs.forEach((enrollment) => {
          const data = enrollment.data();
          if (data.isDeleted === true) return;
          const studentUid =
            typeof data.studentId === "string" ? data.studentId : "";
          if (!studentUid) return;
          roster.push({
            studentUid,
            admissionNumber: String(data.enrollment ?? "").trim(),
            studentName:
              typeof data.studentName === "string" ? data.studentName : "",
            fatherName:
              typeof data.fatherName === "string" ? data.fatherName : "",
            section: typeof data.section === "string" ? data.section : "",
          });
        });
        roster.sort((a, b) =>
          a.studentName.localeCompare(b.studentName, undefined, {
            sensitivity: "base",
          })
        );

        const savedMarks: Record<string, MarksDoc> = {};
        marksDocs.forEach((marks) => {
          savedMarks[marks.studentUid] = marks;
        });

        const savedAttendance: Record<string, SavedAttendance> = {};
        attendance.docs.forEach((item) => {
          const data = item.data();
          const studentUid = String(data.studentUid ?? "");
          if (
            !studentUid ||
            typeof data.presentDays !== "number" ||
            typeof data.totalDays !== "number"
          ) {
            return;
          }
          savedAttendance[studentUid] = {
            presentDays: data.presentDays,
            totalDays: data.totalDays,
          };
        });

        setLoaded({
          roster,
          subjectDocs: subjects.docs.map((subject) => ({
            id: subject.id,
            data: subject.data(),
          })),
          savedMarks,
          savedAttendance,
          rollNumbers,
        });
        setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("Failed to load marks upload data:", loadError);
        setLoaded(EMPTY);
        setError("Could not load the students, subjects or saved marks.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, examId, className, nonce]);

  const columns = useMemo(
    () => buildSubjectColumns(loaded.subjectDocs, exam, className),
    [loaded.subjectDocs, exam, className]
  );

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return {
    loading,
    error,
    roster: loaded.roster,
    columns,
    savedMarks: loaded.savedMarks,
    savedAttendance: loaded.savedAttendance,
    rollNumbers: loaded.rollNumbers,
    reload,
  };
}