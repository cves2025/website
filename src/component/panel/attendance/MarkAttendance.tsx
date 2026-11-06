import { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";

import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import Loader from "../../../custom-components/Loader";
import { myContext } from "../../context/MyContextProvider";
import { CVES_BUTTON } from "../../../constants";
import { NO_SCOPE, PERMISSIONS, isClassTeacherOf } from "../../../permissions";
import useHolidayCalendar from "../../../hooks/useHolidayCalendar";
import useSectionStudents from "../../../hooks/useSectionStudents";
import {
  loadDailyAttendance,
  saveDailyAttendance,
} from "../../../utils/attendanceService";
import {
  dayOffReason,
  fromDateKey,
  sessionDateRange,
  sessionOfDate,
  todayKey,
} from "../../../utils/holidayCalendar";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import DatePicker from "../../../custom-components/DatePicker";
import type { AttendanceStatus, DailyAttendanceDoc } from "../../../utils/type";
import {
  STATUS_META,
  STATUS_ORDER,
  attendanceSections,
  classOptionsOf,
  labelClass,
  pickSection,
  sectionLabel,
  sectionValue,
  sectionOptionsOf,
  type SectionOption,
} from "./attendanceShared";

const sessions = generateAcademicYears();

/**
 * Daily attendance of one section. A class teacher marks only today's
 * attendance of their own section; the admin can mark any section on any
 * past date of a session. Every student starts as Present.
 */
function MarkAttendance() {
  const { user, can } = useContext(myContext);
  const scope = user?.scope ?? NO_SCOPE;
  const isAdmin = scope.kind === "all";
  const today = todayKey();

  const sections = useMemo(() => attendanceSections(scope), [scope]);
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<SectionOption>(() => {
    const wanted = `${searchParams.get("class") ?? ""}|${searchParams.get("section") ?? ""}`;
    return (
      sections.find((option) => sectionValue(option) === wanted) ??
      sections[0] ?? { className: "", section: "" }
    );
  });
  const currentSession = sessionOfDate(today);
  const [session, setSession] = useState(currentSession);
  const sessionRange = sessionDateRange(session);
  // The last date that can be marked in the session: today, or its last day.
  const lastDate = sessionRange.to < today ? sessionRange.to : today;
  const [date, setDate] = useState(today);

  const { className, section } = selected;

  const handleSessionChange = (value: string) => {
    setSession(value);
    const range = sessionDateRange(value);
    setDate(range.to < today ? range.to : today);
  };
  const { calendar, loading: calendarLoading } = useHolidayCalendar(session);
  const { students, loading: studentsLoading, error: studentsError } =
    useSectionStudents(session, className, section);

  const [saved, setSaved] = useState<DailyAttendanceDoc | null>(null);
  const [savedLoading, setSavedLoading] = useState(false);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!className || !section) return;
    let cancelled = false;
    setSavedLoading(true);
    setSaved(null);
    loadDailyAttendance(session, className, section, date)
      .then((data) => {
        if (!cancelled) setSaved(data);
      })
      .catch((cause) => {
        console.error("Failed to load attendance:", cause);
        if (!cancelled) toast.error("Attendance could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setSavedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, className, section, date]);

  // The saved statuses, and Present for everyone not saved yet.
  const initial = useMemo(() => {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((student) => {
      next[student.studentId] = saved?.records[student.studentId] ?? "P";
    });
    return next;
  }, [students, saved]);

  useEffect(() => setDraft(initial), [initial]);

  const offReason = dayOffReason(calendar, date, className);
  const canEdit =
    can(PERMISSIONS.ATTENDANCE_MARK) &&
    !offReason &&
    (isAdmin || (date === today && isClassTeacherOf(scope, className, section)));
  const dirty =
    !saved || students.some((s) => draft[s.studentId] !== initial[s.studentId]);

  const counts = STATUS_ORDER.reduce(
    (result, status) => ({
      ...result,
      [status]: students.filter((s) => draft[s.studentId] === status).length,
    }),
    {} as Record<AttendanceStatus, number>
  );

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setDraft((current) => ({ ...current, [studentId]: status }));

  const markAllPresent = () =>
    setDraft(Object.fromEntries(students.map((s) => [s.studentId, "P"])));

  const handleSave = async () => {
    if (!user || !canEdit || students.length === 0) return;
    setSaving(true);
    try {
      const records = Object.fromEntries(
        students.map((s) => [s.studentId, draft[s.studentId] ?? "P"])
      );
      const value = {
        session,
        className,
        section,
        date,
        records,
        markedBy: user.uid,
        markedByName: user.fullName || user.email || "",
      };
      await saveDailyAttendance(value);
      setSaved(value);
      toast.success("Attendance saved.");
    } catch (cause) {
      console.error("Failed to save attendance:", cause);
      toast.error("Attendance could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (sections.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <PageHeader title="Mark Attendance" titleStyle="text-primaryBlue" />
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600">
          Only a class teacher can mark attendance. You are not the class
          teacher of any section.
        </div>
      </div>
    );
  }

  const loading = calendarLoading || studentsLoading || savedLoading;

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Mark Attendance"
        titleStyle="text-primaryBlue"
        description={
          isAdmin
            ? "Mark or correct the attendance of any section and date."
            : "Mark today's attendance of your section. Everyone starts as Present - tap Absent or Leave where needed."
        }
        descriptionStyle="text-gray-500"
      />

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="attendanceSession" className={labelClass}>
            Academic Year
          </label>
          <SelectDropdown
            id="attendanceSession"
            value={session}
            onValueChange={handleSessionChange}
            options={sessions}
          />
        </div>
        <div>
          <label htmlFor="attendanceClass" className={labelClass}>
            Class
          </label>
          <SelectDropdown
            id="attendanceClass"
            value={className}
            onValueChange={(value) =>
              setSelected(pickSection(sections, value, section))
            }
            options={classOptionsOf(sections)}
          />
        </div>
        <div>
          <label htmlFor="attendanceSectionOnly" className={labelClass}>
            Section
          </label>
          <SelectDropdown
            id="attendanceSectionOnly"
            value={section}
            onValueChange={(value) => setSelected({ className, section: value })}
            options={sectionOptionsOf(sections, className)}
          />
        </div>
        <div>
          <label htmlFor="attendanceDate" className={labelClass}>
            Date
          </label>
          <DatePicker
            id="attendanceDate"
            value={date}
            min={sessionRange.from}
            max={lastDate}
            disabled={!isAdmin}
            onChange={(value) => {
              if (value) setDate(value);
            }}
          />
        </div>
      </div>

      {loading ? (
        <Loader label="Loading attendance..." />
      ) : studentsError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {studentsError}
        </div>
      ) : offReason ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-lg font-semibold text-amber-800">
            No school on {format(fromDateKey(date), "EEEE, d MMMM yyyy")}
          </p>
          <p className="mt-1 text-amber-700">{offReason}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600">
          No students in {sectionLabel({ className, section })} for session{" "}
          {session}.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3 sm:p-4">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
              Total {students.length}
            </span>
            {STATUS_ORDER.map((status) => (
              <span
                key={status}
                className={`rounded-full bg-gray-50 px-3 py-1 text-sm font-semibold ${STATUS_META[status].text}`}
              >
                {STATUS_META[status].label} {counts[status]}
              </span>
            ))}
            <span className="ml-auto text-xs text-gray-500">
              {saved
                ? `Saved${saved.markedByName ? ` by ${saved.markedByName}` : ""}`
                : "Not saved yet"}
            </span>
          </div>

          {canEdit && (
            <div className="flex justify-end border-b border-gray-100 px-3 py-2 sm:px-4">
              <button
                type="button"
                onClick={markAllPresent}
                className="text-sm font-semibold text-primaryBlue hover:underline"
              >
                Mark all Present
              </button>
            </div>
          )}

          <ul className="divide-y divide-gray-100">
            {students.map((student) => {
              const status = draft[student.studentId] ?? "P";
              return (
                <li
                  key={student.studentId}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-8 shrink-0 text-center text-sm font-bold text-gray-500">
                      {student.rollNumber || "-"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-800">
                        {student.studentName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        Adm. {student.admissionNo || "-"}
                        {student.fatherName && ` · ${student.fatherName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 pl-11 sm:pl-0">
                    {STATUS_ORDER.map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={!canEdit}
                        aria-pressed={status === option}
                        onClick={() => setStatus(student.studentId, option)}
                        className={`min-w-[4.5rem] rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                          status === option
                            ? STATUS_META[option].active
                            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:hover:bg-white"
                        }`}
                      >
                        {STATUS_META[option].label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          {canEdit ? (
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-100 bg-white p-3 sm:p-4">
              {dirty && saved && (
                <span className="text-sm text-amber-700">Unsaved changes</span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !dirty}
                className={`rounded-md px-6 py-2 font-semibold text-white disabled:opacity-50 disabled:hover:brightness-100 ${CVES_BUTTON}`}
              >
                {saving ? "Saving..." : saved ? "Update Attendance" : "Save Attendance"}
              </button>
            </div>
          ) : (
            <p className="border-t border-gray-100 p-3 text-center text-sm text-gray-500 sm:p-4">
              {date === today
                ? "You can view this attendance but not change it."
                : "Only today's attendance can be changed."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default MarkAttendance;
