import { useCallback, useRef, useState } from "react";
import type { ExamRules } from "../../../utils/examRules";
import type { MarksSubjectColumn } from "../../../utils/marksEntry";
import {
  ensureExamSheet,
  saveExamAttendance,
  saveStudentMarks,
  type MarksRowSnapshot,
} from "../../../utils/marksService";
import type {
  StudentWrite,
  UploadRosterStudent,
} from "../../../utils/marksUpload";
import type { ExamDoc } from "../../../utils/type";

const CONCURRENCY = 4;

interface Params {
  session: string;
  exam: ExamDoc | null;
  className: string;
  /** Every marks entry column of the class (the exam sheet needs all of them). */
  columns: readonly MarksSubjectColumn[];
  rules: ExamRules;
}

export interface UploadSaveJob {
  student: UploadRosterStudent;
  write: StudentWrite;
  rollNumber: number;
  /** True when a marks document already exists for this student. */
  existed: boolean;
}

export interface UploadSaveFailure {
  studentName: string;
  admissionNumber: string;
  reason: string;
}

export interface UploadSaveReport {
  saved: number;
  failed: UploadSaveFailure[];
  warnings: string[];
}

export interface UploadSaveProgress {
  done: number;
  total: number;
}

const hasMarkChanges = (write: StudentWrite): boolean =>
  Object.values(write.outcomes).some(
    (outcome) => outcome.state === "new" || outcome.state === "overwrite"
  );

async function runPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        await worker(item);
      }
    }
  );
  await Promise.all(runners);
}

/**
 * Saves the planned students of an Excel upload one by one (a few in
 * parallel), reports progress and collects the failures instead of stopping
 * at the first error.
 */
export function useMarksUploadSave({
  session,
  exam,
  className,
  columns,
  rules,
}: Params) {
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<UploadSaveProgress>({
    done: 0,
    total: 0,
  });
  const [report, setReport] = useState<UploadSaveReport | null>(null);
  const busyRef = useRef(false);

  const resetReport = useCallback(() => setReport(null), []);

  const save = useCallback(
    async (jobs: readonly UploadSaveJob[]): Promise<UploadSaveReport | null> => {
      if (busyRef.current || !exam || jobs.length === 0) return null;
      busyRef.current = true;
      setSaving(true);
      setReport(null);
      setProgress({ done: 0, total: jobs.length });

      const failed: UploadSaveFailure[] = [];
      const warnings: string[] = [];
      let saved = 0;
      let done = 0;
      let anyMarksSaved = false;

      const saveJob = async (job: UploadSaveJob) => {
        const { student, write } = job;
        const snapshot: MarksRowSnapshot = {
          studentUid: student.studentUid,
          admissionNumber: student.admissionNumber,
          studentName: student.studentName,
          fatherName: student.fatherName,
          className,
          section: student.section,
          rollNumber: job.rollNumber,
        };
        const problems: string[] = [];

        if (hasMarkChanges(write)) {
          try {
            await saveStudentMarks({
              session,
              examId: exam.id,
              examName: exam.examName,
              examType: exam.examCategory,
              student: snapshot,
              subjectMarks: write.subjectMarks,
              clearedSubjectKeys: write.clearedSubjectKeys,
              legacySubjectKeysToDelete: [],
              existed: job.existed,
              rules,
            });
            anyMarksSaved = true;
          } catch (error) {
            console.error("Failed to save marks:", error);
            problems.push("Marks could not be saved.");
          }
        }

        if (write.attendanceChange) {
          try {
            await saveExamAttendance({
              session,
              examId: exam.id,
              examName: exam.examName,
              className,
              section: student.section,
              studentUid: student.studentUid,
              studentName: student.studentName,
              admissionNumber: student.admissionNumber,
              presentDays: write.attendanceChange.presentDays,
              totalDays: write.attendanceChange.totalDays,
            });
          } catch (error) {
            console.error("Failed to save attendance:", error);
            problems.push("Attendance could not be saved.");
          }
        }

        if (problems.length === 0) {
          saved += 1;
        } else {
          failed.push({
            studentName: student.studentName,
            admissionNumber: student.admissionNumber,
            reason: problems.join(" "),
          });
        }
        done += 1;
        setProgress({ done, total: jobs.length });
      };

      try {
        await runPool(jobs, CONCURRENCY, saveJob);

        if (anyMarksSaved) {
          const sheetOk = await ensureExamSheet(
            session,
            exam,
            className,
            columns.map((column) => ({
              id: column.id,
              name: column.name,
              type: column.type,
              order: column.order,
              reportCardOrder: column.reportCardOrder,
              displayInMarksEntry: true,
            }))
          );
          if (!sheetOk) {
            warnings.push(
              "The exam sheet could not be created. It will be retried on the next save."
            );
          }
        }
      } finally {
        busyRef.current = false;
        setSaving(false);
      }

      const result: UploadSaveReport = { saved, failed, warnings };
      setReport(result);
      return result;
    },
    [session, exam, className, columns, rules]
  );

  return { saving, progress, report, save, resetReport };
}