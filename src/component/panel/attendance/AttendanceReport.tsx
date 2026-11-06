import { useContext, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Printer } from "lucide-react";

import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import Loader from "../../../custom-components/Loader";
import { myContext } from "../../context/MyContextProvider";
import { NO_SCOPE } from "../../../permissions";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import useHolidayCalendar from "../../../hooks/useHolidayCalendar";
import useSectionStudents, {
  type SectionStudent,
} from "../../../hooks/useSectionStudents";
import { loadAttendanceRange } from "../../../utils/attendanceService";
import {
  buildAttendanceReport,
  type ReportDay,
} from "../../../utils/attendanceReport";
import {
  datesOfMonth,
  fromDateKey,
  sessionDateRange,
  sessionMonths,
  todayKey,
} from "../../../utils/holidayCalendar";
import type { AttendanceStatus, DailyAttendanceDoc } from "../../../utils/type";
import {
  STATUS_META,
  attendanceSections,
  classOptionsOf,
  labelClass,
  pickSection,
  sectionLabel,
  sectionOptionsOf,
  type SectionOption,
} from "./attendanceShared";

/** Month value that shows the whole session (totals only). */
const WHOLE_SESSION = "all";

const sessions = generateAcademicYears();

const monthLabel = (month: string) =>
  format(fromDateKey(`${month}-01`), "MMMM yyyy");

function cellText(day: ReportDay, status: AttendanceStatus | null): string {
  if (day.kind === "off") return "H";
  if (day.kind === "notMarked") return "?";
  if (day.kind === "upcoming") return "";
  return status ?? "-";
}

function dayCellClass(day: ReportDay): string {
  if (day.kind === "off") return "bg-gray-100 text-gray-400";
  if (day.kind === "notMarked") return "bg-red-50 text-red-400";
  return "";
}

function AttendanceReport() {
  const { user } = useContext(myContext);
  const scope = user?.scope ?? NO_SCOPE;
  const today = todayKey();

  const sections = useMemo(() => attendanceSections(scope), [scope]);
  const [selected, setSelected] = useState<SectionOption>(
    () => sections[0] ?? { className: "", section: "" }
  );
  const [session, setSession] = useState(sessions[0]?.value ?? "");
  const months = useMemo(() => sessionMonths(session), [session]);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const activeMonth =
    month === WHOLE_SESSION || months.includes(month) ? month : months[0];

  const { className, section } = selected;
  const { calendar, loading: calendarLoading } = useHolidayCalendar(session);
  const { students, loading: studentsLoading, error: studentsError } =
    useSectionStudents(session, className, section);

  const dates = useMemo(() => {
    if (activeMonth !== WHOLE_SESSION) return datesOfMonth(activeMonth);
    return months.flatMap(datesOfMonth);
  }, [activeMonth, months]);

  const [docs, setDocs] = useState<Map<string, DailyAttendanceDoc>>(
    () => new Map()
  );
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  useEffect(() => {
    if (!className || !section || dates.length === 0) return;
    let cancelled = false;
    setDocsLoading(true);
    setDocsError(null);
    const { from, to } =
      activeMonth === WHOLE_SESSION
        ? sessionDateRange(session)
        : { from: dates[0], to: dates[dates.length - 1] };
    loadAttendanceRange(session, className, section, from, to)
      .then((data) => {
        if (!cancelled) setDocs(data);
      })
      .catch((cause) => {
        console.error("Failed to load attendance report:", cause);
        if (!cancelled) setDocsError("Attendance could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, className, section, activeMonth, dates]);

  const report = useMemo(
    () =>
      buildAttendanceReport<SectionStudent>({
        dates,
        className,
        calendar,
        docs,
        students,
        today,
      }),
    [dates, className, calendar, docs, students, today]
  );

  const showDays = activeMonth !== WHOLE_SESSION;
  const periodLabel = showDays ? monthLabel(activeMonth) : `Session ${session}`;
  const title = `${sectionLabel({ className, section })} · ${periodLabel}`;

  const exportExcel = () => {
    const header = [
      "Roll No.",
      "Student Name",
      "Adm. No.",
      ...(showDays ? report.days.map((day) => day.date.slice(8)) : []),
      "Present",
      "Absent",
      "Leave",
      "Attendance %",
    ];
    const body = report.rows.map((row) => [
      row.student.rollNumber || "",
      row.student.studentName,
      row.student.admissionNo,
      ...(showDays
        ? report.days.map((day) => cellText(day, row.cells[day.date] ?? null))
        : []),
      row.present,
      row.absent,
      row.leave,
      row.percentage ?? "",
    ]);
    const sheet = XLSX.utils.aoa_to_sheet([
      [title],
      [`Marked days: ${report.markedDays}`],
      [],
      header,
      ...body,
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Attendance");
    XLSX.writeFile(
      workbook,
      `Attendance_${className}-${section}_${showDays ? activeMonth : session}.xlsx`
    );
  };

  if (sections.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <PageHeader title="Attendance Report" titleStyle="text-primaryBlue" />
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600">
          You are not the class teacher of any section.
        </div>
      </div>
    );
  }

  const loading = calendarLoading || studentsLoading || docsLoading;
  const error = studentsError || docsError;

  return (
    <div className="flex flex-col gap-2 print:block">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="print:hidden">
        <PageHeader
          title="Attendance Report"
          titleStyle="text-primaryBlue"
          description="Day-wise attendance of a section with totals and percentage. H = holiday, ? = working day not marked."
          descriptionStyle="text-gray-500"
          button={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportExcel}
                disabled={loading || report.rows.length === 0}
                title="Download Excel"
                aria-label="Download the attendance report as Excel"
                className="grid h-[38px] w-[38px] place-items-center rounded-md border border-gray-300 bg-white text-green-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={loading || report.rows.length === 0}
                title="Print"
                aria-label="Print the attendance report"
                className="grid h-[38px] w-[38px] place-items-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Printer className="h-5 w-5" />
              </button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <div>
          <label htmlFor="reportSession" className={labelClass}>
            Session
          </label>
          <SelectDropdown
            id="reportSession"
            value={session}
            onValueChange={setSession}
            options={sessions}
          />
        </div>
        <div>
          <label htmlFor="reportClass" className={labelClass}>
            Class
          </label>
          <SelectDropdown
            id="reportClass"
            value={className}
            onValueChange={(value) =>
              setSelected(pickSection(sections, value, section))
            }
            options={classOptionsOf(sections)}
          />
        </div>
        <div>
          <label htmlFor="reportSection" className={labelClass}>
            Section
          </label>
          <SelectDropdown
            id="reportSection"
            value={section}
            onValueChange={(value) => setSelected({ className, section: value })}
            options={sectionOptionsOf(sections, className)}
          />
        </div>
        <div>
          <label htmlFor="reportMonth" className={labelClass}>
            Month
          </label>
          <SelectDropdown
            id="reportMonth"
            value={activeMonth}
            onValueChange={setMonth}
            options={[
              ...months.map((value) => ({ value, label: monthLabel(value) })),
              { value: WHOLE_SESSION, label: "Whole session (totals)" },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <Loader label="Loading attendance..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : report.rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600">
          No students in this section for session {session}.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white print:border-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-100 p-3 text-sm sm:p-4">
            <h2 className="font-bold text-gray-800">{title}</h2>
            <span className="text-gray-600">
              Marked days: <b>{report.markedDays}</b>
            </span>
            {report.notMarkedDates.length > 0 && (
              <span className="text-red-600 print:hidden">
                Not marked: {report.notMarkedDates.length} working day(s)
                {showDays &&
                  ` (${report.notMarkedDates.map((d) => Number(d.slice(8))).join(", ")})`}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-left">
                    Roll
                  </th>
                  <th className="sticky left-10 z-10 min-w-[10rem] bg-gray-50 px-2 py-2 text-left">
                    Student
                  </th>
                  {showDays &&
                    report.days.map((day) => (
                      <th
                        key={day.date}
                        title={day.offReason ?? undefined}
                        className={`min-w-[1.75rem] px-0.5 py-1 text-center font-semibold ${dayCellClass(day)}`}
                      >
                        <div>{Number(day.date.slice(8))}</div>
                        <div className="text-[10px] font-normal">
                          {format(fromDateKey(day.date), "EEEEE")}
                        </div>
                      </th>
                    ))}
                  <th className="px-2 py-2 text-center text-green-700">P</th>
                  <th className="px-2 py-2 text-center text-red-700">A</th>
                  <th className="px-2 py-2 text-center text-amber-700">L</th>
                  <th className="px-2 py-2 text-center">%</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr
                    key={row.student.studentId}
                    className="border-t border-gray-100"
                  >
                    <td className="sticky left-0 z-10 bg-white px-2 py-1.5 text-gray-500">
                      {row.student.rollNumber || "-"}
                    </td>
                    <td className="sticky left-10 z-10 truncate bg-white px-2 py-1.5 font-medium text-gray-800">
                      {row.student.studentName}
                    </td>
                    {showDays &&
                      report.days.map((day) => {
                        const status = row.cells[day.date] ?? null;
                        return (
                          <td
                            key={day.date}
                            className={`px-0.5 py-1.5 text-center font-semibold ${
                              day.kind === "marked" && status
                                ? STATUS_META[status].text
                                : dayCellClass(day)
                            }`}
                          >
                            {cellText(day, status)}
                          </td>
                        );
                      })}
                    <td className="px-2 py-1.5 text-center font-semibold text-green-700">
                      {row.present}
                    </td>
                    <td className="px-2 py-1.5 text-center font-semibold text-red-700">
                      {row.absent}
                    </td>
                    <td className="px-2 py-1.5 text-center font-semibold text-amber-700">
                      {row.leave}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-center font-bold ${
                        row.percentage !== null && row.percentage < 75
                          ? "text-red-600"
                          : "text-gray-800"
                      }`}
                    >
                      {row.percentage === null ? "-" : `${row.percentage}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceReport;
