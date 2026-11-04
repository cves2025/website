import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, Check, FileSpreadsheet, Printer } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import Loader from "../../../custom-components/Loader";
import { Switch } from "@/components/ui/switch";
import {
  CLASS_OPTIONS,
  FEE_COLLECT_PATH,
  SECTIONS,
  SESSION_MONTH_OPTIONS,
} from "../../../constants";
import {
  generateAcademicYears,
  previousAcademicYear,
} from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { formatRupees, monthLabel } from "../../../utils/feeStructure";
import { feeTotals } from "../../../utils/feeAccount";
import { currentSessionMonth, dueReminderLink, duesUpTo } from "../../../utils/feeReport";
import { exportDuesExcel } from "../../../utils/feeExport";
import useDuesReport from "../../../hooks/useDuesReport";
import type { FeeStudent } from "../../../utils/type";
import { labelClass } from "../attendance/attendanceShared";
import CarryForwardDialog from "./CarryForwardDialog";

const sessions = generateAcademicYears();
const ALL = "all";
const CLASS_FILTER = [
  { value: ALL, label: "All classes" },
  ...CLASS_OPTIONS.map((option) => ({ ...option, label: toOrdinalLabel(option.label) })),
];
const SECTION_FILTER = [
  { value: ALL, label: "All sections" },
  ...SECTIONS.map((section) => ({ value: section, label: section })),
];

const collectLink = (session: string, student: FeeStudent) =>
  `${FEE_COLLECT_PATH}?${new URLSearchParams({
    session,
    class: student.className,
    section: student.section,
    student: student.studentId,
  }).toString()}`;

/**
 * Dues Report (admin only): what every student owes up to a month, with the
 * pending months, and the remaining due of the whole session. Students who
 * have not paid anything yet are included (their fees come from the fee
 * structure).
 */
function DuesReport() {
  const [session, setSession] = useState(sessions[0]?.value ?? "");
  const [className, setClassName] = useState(ALL);
  const [section, setSection] = useState(ALL);
  const [upToMonth, setUpToMonth] = useState(() => currentSessionMonth(sessions[0]?.value ?? ""));
  const [onlyDues, setOnlyDues] = useState(true);
  const [carryOpen, setCarryOpen] = useState(false);
  // Reminders opened on this visit, so the admin can go down the list.
  const [reminded, setReminded] = useState<Set<string>>(() => new Set());

  const { rows, loading, error, reload } = useDuesReport(
    session,
    className === ALL ? "" : className,
    section === ALL ? "" : section
  );

  const report = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        upTo: duesUpTo(row.account, upToMonth),
        sessionDue: feeTotals(row.account.lines).due,
      })),
    [rows, upToMonth]
  );
  const shown = onlyDues ? report.filter((row) => row.upTo.due > 0) : report;
  const totalUpTo = report.reduce((sum, row) => sum + row.upTo.due, 0);
  const totalSession = report.reduce((sum, row) => sum + row.sessionDue, 0);
  const withDues = report.filter((row) => row.upTo.due > 0).length;

  const tiles = [
    { label: "Students with dues", value: `${withDues} / ${report.length}`, className: "text-gray-800" },
    { label: `Due till ${monthLabel(upToMonth)}`, value: formatRupees(totalUpTo), className: "text-red-600" },
    { label: "Remaining for the session", value: formatRupees(totalSession), className: "text-amber-700" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <style>{"@page { size: A4 landscape; margin: 8mm; }"}</style>
      <div className="print:hidden">
        <PageHeader
          title="Dues Report"
          titleStyle="text-primaryBlue"
          description="Fees still to be paid, up to the selected month. Click a name to collect the fee."
          descriptionStyle="text-gray-500"
          button={
            <button
              type="button"
              onClick={() => setCarryOpen(true)}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Carry forward from {previousAcademicYear(session)}
            </button>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
        <div>
          <label htmlFor="duesSession" className={labelClass}>Session</label>
          <SelectDropdown
            id="duesSession"
            value={session}
            onValueChange={(value) => {
              setSession(value);
              setUpToMonth(currentSessionMonth(value));
            }}
            options={sessions}
          />
        </div>
        <div>
          <label htmlFor="duesClass" className={labelClass}>Class</label>
          <SelectDropdown id="duesClass" value={className} onValueChange={setClassName} options={CLASS_FILTER} />
        </div>
        <div>
          <label htmlFor="duesSection" className={labelClass}>Section</label>
          <SelectDropdown id="duesSection" value={section} onValueChange={setSection} options={SECTION_FILTER} />
        </div>
        <div>
          <label htmlFor="duesMonth" className={labelClass}>Dues up to</label>
          <SelectDropdown
            id="duesMonth"
            value={String(upToMonth)}
            onValueChange={(value) => setUpToMonth(Number(value))}
            options={SESSION_MONTH_OPTIONS}
          />
        </div>
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="duesOnly" className="flex items-center gap-2 pb-2 text-sm font-semibold text-gray-700">
            <Switch id="duesOnly" checked={onlyDues} onCheckedChange={setOnlyDues} />
            Only with dues
          </label>
          <div className="mb-0.5 flex gap-2">
            <button
              type="button"
              disabled={loading || shown.length === 0}
              onClick={() =>
                exportDuesExcel(
                  shown.map((row) => ({
                    row,
                    due: row.upTo.due,
                    months: row.upTo.months,
                    sessionDue: row.sessionDue,
                  })),
                  {
                    session,
                    classLabel:
                      className === ALL
                        ? "All classes"
                        : `Class ${toOrdinalLabel(className)}${section === ALL ? "" : `-${section}`}`,
                    upToMonth,
                  }
                )
              }
              title="Download Excel"
              aria-label="Download the dues report as Excel"
              className="rounded-md border border-gray-300 p-2 text-green-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={loading || shown.length === 0}
              onClick={() => window.print()}
              title="Print"
              aria-label="Print the dues report"
              className="rounded-md border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Printer className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader label="Loading dues..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <>
          <h2 className="hidden text-lg font-bold print:block">
            Dues Report · {session} · {className === ALL ? "All classes" : `Class ${toOrdinalLabel(className)}`}
            {section === ALL ? "" : `-${section}`} · up to {monthLabel(upToMonth)}
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tile.label}</p>
                <p className={`mt-1 text-xl font-bold ${tile.className}`}>{tile.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white print:overflow-visible">
            {shown.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">
                {report.length === 0 ? "No students found." : "No dues up to this month. 🎉"}
              </p>
            ) : (
              <table className="w-full min-w-[820px] text-sm print:min-w-0 print:text-xs">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Class</th>
                    <th className="px-3 py-2 font-semibold">Roll</th>
                    <th className="px-3 py-2 font-semibold">Student</th>
                    <th className="px-3 py-2 font-semibold">Father</th>
                    <th className="px-3 py-2 font-semibold">Pending months</th>
                    <th className="px-3 py-2 text-right font-semibold">Due till {monthLabel(upToMonth)}</th>
                    <th className="px-3 py-2 text-right font-semibold">Session due</th>
                    <th className="px-3 py-2 text-center font-semibold print:hidden">Remind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shown.map((row, index) => (
                    <tr key={row.student.studentId} className="break-inside-avoid">
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2">
                        {toOrdinalLabel(row.student.className)}-{row.student.section}
                      </td>
                      <td className="px-3 py-2">{row.rollNumber || "-"}</td>
                      <td className="px-3 py-2">
                        <Link
                          to={collectLink(session, row.student)}
                          className="font-semibold text-primaryBlue hover:underline print:text-black print:no-underline"
                        >
                          {row.student.studentName}
                        </Link>
                        <p className="text-xs text-gray-500">Adm. {row.student.admissionNo || "-"}</p>
                      </td>
                      <td className="px-3 py-2">{row.student.fatherName || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.upTo.months.map((month) => monthLabel(month).slice(0, 3)).join(", ") || "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">
                        {row.upTo.due ? formatRupees(row.upTo.due) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {row.sessionDue ? formatRupees(row.sessionDue) : "-"}
                      </td>
                      <td className="px-3 py-2 text-center print:hidden">
                        <ReminderButton
                          link={
                            row.upTo.due
                              ? dueReminderLink(row, row.upTo.due, row.upTo.months, upToMonth)
                              : ""
                          }
                          hasDue={row.upTo.due > 0}
                          sent={reminded.has(row.student.studentId)}
                          onSent={() =>
                            setReminded((prev) => new Set(prev).add(row.student.studentId))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td className="px-3 py-2" colSpan={6}>
                      Total ({shown.length} students)
                    </td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {formatRupees(shown.reduce((sum, row) => sum + row.upTo.due, 0))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatRupees(shown.reduce((sum, row) => sum + row.sessionDue, 0))}
                    </td>
                    <td className="print:hidden" />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      <CarryForwardDialog
        isOpen={carryOpen}
        session={session}
        onClose={() => setCarryOpen(false)}
        onDone={reload}
      />
    </div>
  );
}

interface ReminderButtonProps {
  /** wa.me link; "" when the parent's phone is missing or not valid. */
  link: string;
  hasDue: boolean;
  sent: boolean;
  onSent: () => void;
}

/** Opens WhatsApp with the fee reminder for the parent. */
function ReminderButton({ link, hasDue, sent, onSent }: ReminderButtonProps) {
  if (!hasDue) return <span className="text-gray-300">-</span>;
  if (!link) {
    return <span className="text-xs text-gray-400" title="No valid mobile number on the admission form">No number</span>;
  }
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onSent}
      title="Send the fee reminder on WhatsApp"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        sent ? "bg-gray-100 text-gray-600" : "bg-green-500 text-white hover:bg-green-600"
      }`}
    >
      {sent ? <Check className="h-3.5 w-3.5" /> : <FaWhatsapp className="h-3.5 w-3.5" />}
      {sent ? "Sent" : "Send"}
    </a>
  );
}

export default DuesReport;
