import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";

import Modal from "../../../custom-components/Modal";
import DatePicker from "../../../custom-components/DatePicker";
import useHolidayCalendar from "../../../hooks/useHolidayCalendar";
import {
  defaultExamAttendanceRange,
  loadExamAttendance,
  type ExamAttendanceTotals,
} from "../../../utils/examAttendance";
import {
  fromDateKey,
  sessionDateRange,
  todayKey,
} from "../../../utils/holidayCalendar";
import { saveExamAttendance } from "../../../utils/marksService";
import type { ExamDoc } from "../../../utils/type";

export interface AttendanceFillStudent {
  studentUid: string;
  admissionNumber: string;
  studentName: string;
  section: string;
}

interface AttendanceFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: string;
  exam: ExamDoc;
  className: string;
  /** Only the students whose attendance the user may change. */
  students: AttendanceFillStudent[];
  /** Saved Present / Total by studentUid (as shown on the Marks page). */
  saved: Readonly<Record<string, { presentDays: string; totalDays: string }>>;
}

/** Writes at once; the class is small, but keep the browser calm. */
const WRITES_PER_CHUNK = 20;

const dayLabel = (key: string) => format(fromDateKey(key), "d MMM");

/**
 * Fills the exam's Present / Total days from the daily attendance of a date
 * range (default: session start to the exam's end date). Existing values are
 * overwritten; the table shows the saved and the new value side by side.
 */
function AttendanceFillModal({
  isOpen,
  onClose,
  session,
  exam,
  className,
  students,
  saved,
}: AttendanceFillModalProps) {
  const today = todayKey();
  const sessionRange = sessionDateRange(session);
  const [range, setRange] = useState(() =>
    defaultExamAttendanceRange(session, exam, today)
  );
  const { calendar, loading: calendarLoading } = useHolidayCalendar(session);
  const [totals, setTotals] = useState<ExamAttendanceTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setRange(defaultExamAttendanceRange(session, exam, today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, session, exam.id]);

  const sections = useMemo(
    () => [...new Set(students.map((student) => student.section))].sort(),
    [students]
  );
  const sectionKey = sections.join("|");

  useEffect(() => {
    if (!isOpen || calendarLoading || !range.from || !range.to) return;
    let cancelled = false;
    setLoading(true);
    setTotals(null);
    loadExamAttendance({
      session,
      className,
      sections: sectionKey.split("|"),
      calendar,
      from: range.from,
      to: range.to,
      today,
    })
      .then((data) => {
        if (!cancelled) setTotals(data);
      })
      .catch((cause) => {
        console.error("Failed to load daily attendance:", cause);
        if (!cancelled) toast.error("Daily attendance could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, calendarLoading, calendar, session, className, sectionKey, range, today]);

  const rows = useMemo(
    () =>
      students.map((student) => {
        const current = saved[student.studentUid];
        const next = totals?.byStudent.get(student.studentUid) ?? null;
        const currentText = current
          ? `${current.presentDays} / ${current.totalDays}`
          : "";
        const nextText = next ? `${next.presentDays} / ${next.totalDays}` : "";
        return {
          student,
          currentText,
          next,
          nextText,
          changed: next !== null && nextText !== currentText,
        };
      }),
    [students, saved, totals]
  );
  const changes = rows.filter((row) => row.changed);
  const noData = rows.filter((row) => row.next === null).length;
  const unmarked = sections.filter(
    (section) => (totals?.notMarked[section]?.length ?? 0) > 0
  );

  const handleApply = async () => {
    if (changes.length === 0) return;
    setSaving(true);
    let failed = 0;
    for (let index = 0; index < changes.length; index += WRITES_PER_CHUNK) {
      const results = await Promise.allSettled(
        changes.slice(index, index + WRITES_PER_CHUNK).map(({ student, next }) =>
          saveExamAttendance({
            session,
            examId: exam.id,
            examName: exam.examName,
            className,
            section: student.section,
            studentUid: student.studentUid,
            studentName: student.studentName,
            admissionNumber: student.admissionNumber,
            presentDays: next?.presentDays ?? null,
            totalDays: next?.totalDays ?? null,
          })
        )
      );
      failed += results.filter((result) => result.status === "rejected").length;
    }
    setSaving(false);
    if (failed > 0) {
      toast.error(`${failed} student(s) could not be saved. Please try again.`);
      return;
    }
    toast.success(`Attendance filled for ${changes.length} student(s).`);
    onClose();
  };

  const busy = calendarLoading || loading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Fill from Daily Attendance"
      description={`${exam.examName} · Class ${className} · Present / Total days are counted from the daily attendance of the dates below. Saved values are replaced.`}
      cancelText="Cancel"
      submitText={
        changes.length > 0
          ? `Apply to ${changes.length} student(s)`
          : "Nothing to change"
      }
      submitDisabled={busy || changes.length === 0}
      loading={saving}
      onSubmit={() => void handleApply()}
      modalClassName="max-w-3xl"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="fillFrom"
              className="mb-1 block text-sm font-semibold text-gray-700"
            >
              From
            </label>
            <DatePicker
              id="fillFrom"
              value={range.from}
              min={sessionRange.from}
              max={range.to}
              onChange={(from) => from && setRange({ ...range, from })}
            />
          </div>
          <div>
            <label
              htmlFor="fillTo"
              className="mb-1 block text-sm font-semibold text-gray-700"
            >
              To
            </label>
            <DatePicker
              id="fillTo"
              value={range.to}
              min={range.from}
              max={sessionRange.to < today ? sessionRange.to : today}
              onChange={(to) => to && setRange({ ...range, to })}
            />
          </div>
        </div>

        {busy || !totals ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Counting daily attendance...
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>
                Working days: <b>{totals.workingDays}</b>
              </span>
              {sections.map((section) => (
                <span key={section}>
                  Section {section} marked:{" "}
                  <b>{totals.markedDays[section] ?? 0}</b>
                </span>
              ))}
            </div>

            {unmarked.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {unmarked.map((section) => {
                  const dates = totals.notMarked[section] ?? [];
                  return (
                    <p key={section}>
                      Section {section}: {dates.length} working day(s) not
                      marked ({dates.slice(0, 8).map(dayLabel).join(", ")}
                      {dates.length > 8 ? ", ..." : ""}). These days are not
                      counted.
                    </p>
                  );
                })}
              </div>
            )}

            {noData > 0 && (
              <p className="text-sm text-gray-500">
                {noData} student(s) have no daily attendance in these dates
                and are left as they are.
              </p>
            )}

            <div className="max-h-[45vh] overflow-y-auto rounded-md border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-center">Section</th>
                    <th className="px-3 py-2 text-center">Saved</th>
                    <th className="px-3 py-2 text-center">New</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.student.studentUid}
                      className={`border-t border-gray-100 ${row.changed ? "bg-blue-50/60" : ""}`}
                    >
                      <td className="px-3 py-1.5 text-gray-800">
                        {row.student.studentName}
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-600">
                        {row.student.section}
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-500">
                        {row.currentText || "-"}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-center font-semibold ${
                          row.changed ? "text-primaryBlue" : "text-gray-500"
                        }`}
                      >
                        {row.nextText || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default AttendanceFillModal;
