import { useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";

import { myContext } from "../../context/MyContextProvider";
import { NO_SCOPE, PERMISSIONS } from "../../../permissions";
import useHolidayCalendar from "../../../hooks/useHolidayCalendar";
import { useTeachers } from "../../../hooks/useTeachers";
import { useAttendanceTotals, useMarkedSectionsOn } from "../../../hooks/useDashboardStats";
import { TEACHER_SECTIONS } from "../../../utils/teacherSections";
import { dayOffReason, sessionOfDate, todayKey } from "../../../utils/holidayCalendar";
import { attendanceSections, sectionValue, type SectionOption } from "./attendanceShared";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { Spinner } from "../../../custom-components/Loader";
import CustomSelect from "../../../custom-components/CustomSelect";

const MARK_PATH = "/welcome/attendance/mark";

interface TodayRow extends SectionOption {
  teacherName?: string;
}

/** The card's heading, with an optional control on the right. */
function CardTitle({ action }: { action?: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <h3 className="text-lg font-bold text-gray-900">Today Attendance</h3>
      {action}
    </div>
  );
}

interface PendingDropdownProps {
  /** How many sections have not marked (known without reading the list). */
  count: number;
  /** Sections expected to mark today. */
  rows: TodayRow[];
  /** Marked sections when already known; otherwise read when opened. */
  markedKeys?: Set<string>;
  date: string;
}

/**
 * "Not marked (N)": opens the list of sections (and class teachers) that have
 * not marked today; each opens Mark Attendance for that section. While any
 * is missing, a ring in the school colours turns around the button.
 */
function PendingDropdown({ count, rows, markedKeys, date }: PendingDropdownProps) {
  const navigate = useNavigate();
  const { control, reset } = useForm<{ section: string }>({ defaultValues: { section: "" } });
  const [open, setOpen] = useState(false);
  // The list needs the marked sections; read them only when it is opened.
  const lazy = useMarkedSectionsOn(date, open && !markedKeys);
  const marked = markedKeys ?? lazy.markedKeys;
  const pending = marked ? rows.filter((row) => !marked.has(sectionValue(row))) : [];

  if (count === 0) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        All marked
      </span>
    );
  }

  const options = pending.map((row) => ({
    value: sectionValue(row),
    // "Rahul Sharma - 5th A"
    label: row.teacherName
      ? `${row.teacherName} - ${toOrdinalLabel(row.className)} ${row.section}`
      : `${toOrdinalLabel(row.className)} ${row.section}`,
  }));

  return (
    // The turning school-colour ring shows a section is still missing.
    <div className="relative w-56 shrink-0 overflow-hidden rounded-lg p-[2px]">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-[200%] animate-[spin_2.5s_linear_infinite] bg-[conic-gradient(from_0deg,#009746,#393186,#e7087e,#e31e25,#009746)] motion-reduce:animate-none"
      />
      <div className="relative rounded-[6px] bg-white">
        <CustomSelect
          control={control}
          name="section"
          placeholder={`Not marked (${count})`}
          options={options}
          searchable
          searchPlaceholder="Teacher or class"
          emptyMessage={
            !marked
              ? lazy.error ?? "Loading..."
              : "Every class teacher has marked. Other sections may still be pending."
          }
          onOpenChange={setOpen}
          // Picking a teacher opens Mark Attendance for that section.
          onValueChange={(value) => {
            const row = pending.find((item) => sectionValue(item) === value);
            reset({ section: "" });
            if (row) {
              navigate(
                `${MARK_PATH}?class=${encodeURIComponent(row.className)}&section=${encodeURIComponent(row.section)}`
              );
            }
          }}
          className="border-0 py-1.5 font-semibold data-[placeholder]:text-gray-800"
        />
      </div>
    </div>
  );
}

interface AttendanceViewProps {
  /** Numbers still loading: the layout shows, with a spinner for each value. */
  loading?: boolean;
  error?: string | null;
  present?: number;
  absent?: number;
  leave?: number;
  notMarked?: number;
  /** Sections expected to mark today. */
  sections?: number;
  action?: ReactNode;
}

/** The card's body; always laid out, numbers filled in as they arrive. */
function AttendanceView({
  loading = false,
  error = null,
  present = 0,
  absent = 0,
  leave = 0,
  notMarked = 0,
  sections = 0,
  action,
}: AttendanceViewProps) {
  const total = present + absent + leave;
  const percent = total ? Math.round((present / total) * 1000) / 10 : 0;
  const value = (number: number) => (loading ? <Spinner size="sm" label="" className="my-1" /> : number);

  const tiles = [
    { value: present, label: "Present", className: "bg-[#e4f4ea]" },
    { value: absent, label: "Absent", className: "bg-[#fce7e7]" },
    { value: notMarked, label: "Sections not marked", className: "bg-[#fff0dc]" },
    { value: leave, label: "On leave", className: "bg-[#e8ecf7]" },
  ];

  return (
    <>
      <CardTitle action={action} />
      <div className="mt-3 flex h-12 items-center text-5xl font-extrabold leading-none tracking-tight text-gray-900 tabular-nums">
        {loading ? <Spinner size="md" label="Loading attendance" /> : total ? `${percent}%` : "—"}
      </div>
      <p className="mt-2 min-h-5 text-sm text-gray-600">
        {error ? (
          <span className="text-red-600">{error}</span>
        ) : loading ? (
          "Loading today's attendance..."
        ) : total ? (
          `${present} of ${total} students present`
        ) : (
          `No attendance is marked yet today (${sections} section${sections === 1 ? "" : "s"} to mark).`
        )}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className={`rounded-xl px-4 py-2.5 ${tile.className}`}>
            <div className="flex h-8 items-center text-2xl font-bold text-gray-900 tabular-nums">
              {value(tile.value)}
            </div>
            <p className="text-sm text-gray-600">{tile.label}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * `rows` are the sections expected to mark today. `wholeSchool` (admin) adds
 * up the whole school with aggregation queries, sections marked without a
 * class teacher on record included; otherwise only `rows` are read (one each).
 */
function TodaySummary({ rows, wholeSchool = false }: { rows: TodayRow[]; wholeSchool?: boolean }) {
  const today = todayKey();
  const session = sessionOfDate(today);
  const { calendar, loading } = useHolidayCalendar(session);
  const working = useMemo(
    () => (loading ? [] : rows.filter((row) => !dayOffReason(calendar, today, row.className))),
    [loading, rows, calendar, today]
  );
  const attendance = useAttendanceTotals(today, session, wholeSchool ? null : working, !loading && working.length > 0);

  if (!loading && working.length === 0) {
    return (
      <>
        <CardTitle />
        <p className="py-6 text-base text-gray-500">No school today.</p>
      </>
    );
  }
  const totals = attendance.totals;
  if (loading || attendance.loading || !totals) {
    return <AttendanceView loading={!attendance.error} error={attendance.error} sections={working.length} />;
  }

  // Which sections are marked is known when the documents were read; with
  // aggregation only how many, so the rest is worked out from the count.
  const notMarked = totals.markedKeys
    ? working.filter((row) => !totals.markedKeys?.has(sectionValue(row))).length
    : Math.max(0, working.length - totals.marked);

  return (
    <AttendanceView
      present={totals.present}
      absent={totals.absent}
      leave={totals.leave}
      notMarked={notMarked}
      sections={working.length}
      action={<PendingDropdown count={notMarked} rows={working} markedKeys={totals.markedKeys} date={today} />}
    />
  );
}

/** Admin: every section that has a class teacher. */
function AdminSummary() {
  const { teachers, loading } = useTeachers();
  const rows = useMemo(
    () =>
      teachers.flatMap((teacher) =>
        teacher.sectionAssignments
          .filter((a) => a.isClassTeacher && a.classTeacherOf.trim())
          .map((a) => ({
            className: a.classTeacherOf.trim(),
            // Records saved before sections existed have none; like the
            // teacher's own scope, they count as the first section.
            section: a.section || TEACHER_SECTIONS[0],
            teacherName: `${teacher.firstName} ${teacher.lastName}`.trim(),
          }))
      ),
    [teachers]
  );
  if (loading) return <AttendanceView loading />;
  if (rows.length === 0) {
    return (
      <>
        <CardTitle />
        <p className="py-6 text-base text-gray-500">No class teachers are assigned yet.</p>
      </>
    );
  }
  return <TodaySummary rows={rows} wholeSchool />;
}

/** Dashboard card: today's attendance of the sections the user looks after. */
function AttendanceTodayCard({ className = "" }: { className?: string }) {
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
    notice =
      isTeacher && ownSections.length > 0
        ? "Mark Attendance is switched off for you. Ask the admin to turn it on in Permissions."
        : null;
  } else if (!isAdmin && ownSections.length === 0) {
    notice =
      "You are not the class teacher of any section, so there is no attendance to mark. The admin can make you a class teacher on the teacher's profile.";
  }
  if (!canMark && !notice) return null;

  return (
    <section
      className={`flex flex-col rounded-3xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(17,24,39,0.22)] md:p-7 ${className}`}
    >
      {notice ? (
        <>
          <CardTitle />
          <p className="mt-4 text-base text-gray-600">{notice}</p>
        </>
      ) : isAdmin ? (
        <AdminSummary />
      ) : (
        <TodaySummary rows={ownSections} />
      )}
    </section>
  );
}

export default AttendanceTodayCard;
