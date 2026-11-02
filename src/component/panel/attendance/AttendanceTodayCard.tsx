import { useContext, useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { FaCalendarCheck } from "react-icons/fa";

import { myContext } from "../../context/MyContextProvider";
import { NO_SCOPE, PERMISSIONS } from "../../../permissions";
import useHolidayCalendar from "../../../hooks/useHolidayCalendar";
import { useTeachers } from "../../../hooks/useTeachers";
import { loadAttendanceOnDate } from "../../../utils/attendanceService";
import {
  dayOffReason,
  sessionOfDate,
  todayKey,
} from "../../../utils/holidayCalendar";
import {
  attendanceSections,
  sectionLabel,
  sectionValue,
  type SectionOption,
} from "./attendanceShared";

const MARK_PATH = "/welcome/attendance/mark";

interface TodayRow extends SectionOption {
  teacherName?: string;
}

/** Sections marked today ("class|section"), read once per dashboard visit. */
function useMarkedToday(today: string) {
  const [marked, setMarked] = useState<Set<string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    const session = sessionOfDate(today);
    loadAttendanceOnDate(today)
      .then((docs) => {
        if (cancelled) return;
        setMarked(
          new Set(
            docs
              .filter((item) => item.session === session)
              .map((item) => sectionValue(item))
          )
        );
      })
      .catch((cause) => {
        console.error("Failed to load today's attendance:", cause);
        if (!cancelled) setMarked(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [today]);
  return marked;
}

function TodayList({ rows, showTeacher }: { rows: TodayRow[]; showTeacher: boolean }) {
  const today = todayKey();
  const { calendar, loading } = useHolidayCalendar(sessionOfDate(today));
  const marked = useMarkedToday(today);

  if (loading || marked === null) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  const working = rows.filter(
    (row) => !dayOffReason(calendar, today, row.className)
  );
  const pending = working.filter((row) => !marked.has(sectionValue(row)));

  if (working.length === 0) {
    return <p className="text-sm text-gray-600">No school today.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-600">
        Marked: <b>{working.length - pending.length}</b> of {working.length}{" "}
        section(s)
      </p>
      {pending.length === 0 ? (
        <p className="text-sm font-semibold text-green-700">
          All attendance is marked for today.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {pending.map((row) => (
            <li key={sectionValue(row)}>
              <NavLink
                to={`${MARK_PATH}?class=${encodeURIComponent(row.className)}&section=${encodeURIComponent(row.section)}`}
                className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm hover:bg-red-100"
              >
                <span className="font-semibold text-red-700">
                  {sectionLabel(row)}
                  {showTeacher && row.teacherName && (
                    <span className="font-normal text-red-600">
                      {" "}
                      · {row.teacherName}
                    </span>
                  )}
                </span>
                <span className="text-xs font-semibold text-red-700">
                  Not marked →
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Admin: every section that has a class teacher. */
function AdminRows() {
  const { teachers, loading } = useTeachers();
  const rows = useMemo(
    () =>
      teachers.flatMap((teacher) =>
        teacher.sectionAssignments
          .filter((a) => a.isClassTeacher && a.classTeacherOf.trim())
          .map((a) => ({
            className: a.classTeacherOf.trim(),
            section: a.section,
            teacherName: `${teacher.firstName} ${teacher.lastName}`.trim(),
          }))
      ),
    [teachers]
  );
  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        No class teachers are assigned yet.
      </p>
    );
  }
  return <TodayList rows={rows} showTeacher />;
}

/** Dashboard card: which sections still have to mark today's attendance. */
function AttendanceTodayCard() {
  const { user, can } = useContext(myContext);
  const scope = user?.scope ?? NO_SCOPE;
  const isAdmin = scope.kind === "all";
  const isTeacher = user?.role === "teacher";
  if (!isAdmin && !isTeacher) return null;

  const canMark = can(PERMISSIONS.ATTENDANCE_MARK);
  const ownSections = isAdmin ? [] : attendanceSections(scope);

  // A teacher always sees the card, with the reason when they cannot mark.
  let notice: string | null = null;
  if (!canMark) {
    notice = isTeacher && ownSections.length > 0
      ? "Mark Attendance is switched off for you. Ask the admin to turn it on in Permissions."
      : null;
  } else if (!isAdmin && ownSections.length === 0) {
    notice =
      "You are not the class teacher of any section, so there is no attendance to mark. The admin can make you a class teacher on the teacher's profile.";
  }
  if (!canMark && !notice) return null;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          <FaCalendarCheck className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Today's Attendance</h3>
      </div>
      {notice ? (
        <p className="text-sm text-gray-600">{notice}</p>
      ) : isAdmin ? (
        <AdminRows />
      ) : (
        <TodayList rows={ownSections} showTeacher={false} />
      )}
    </div>
  );
}

export default AttendanceTodayCard;
