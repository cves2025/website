import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightLeft,
  Check,
  FileSpreadsheet,
  ListChecks,
  MousePointerClick,
  Printer,
  Send,
  Users,
} from "lucide-react";
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
import {
  currentSessionMonth,
  dueReminderLink,
  duesUpTo,
} from "../../../utils/feeReport";
import { exportDuesExcel } from "../../../utils/feeExport";
import useDuesReport from "../../../hooks/useDuesReport";
import type { FeeStudent } from "../../../utils/type";
import { labelClass } from "../attendance/attendanceShared";
import CarryForwardDialog from "./CarryForwardDialog";
import FeeEmptyState from "./FeeEmptyState";
import type { EmptyStep } from "./FeeEmptyState";

const EMPTY_STEPS: EmptyStep[] = [
  {
    icon: Users,
    title: "Pick classes",
    text: "One class and section, or All classes.",
    tone: "green",
  },
  {
    icon: MousePointerClick,
    title: "Press Show report",
    text: "Dues up to the month you choose.",
    tone: "blue",
  },
  {
    icon: Send,
    title: "Remind & collect",
    text: "Send WhatsApp reminders, print or download Excel.",
    tone: "pink",
  },
];

const sessions = generateAcademicYears();
const ALL = "all";
const CLASS_FILTER = [
  { value: ALL, label: "All classes" },
  ...CLASS_OPTIONS.map((option) => ({
    ...option,
    label: toOrdinalLabel(option.label),
  })),
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
  // Nothing is read until the admin picks the classes and presses Show:
  // all classes is many reads, so it is never the default.
  const [className, setClassName] = useState("");
  const [section, setSection] = useState(ALL);
  const [applied, setApplied] = useState<{
    session: string;
    className: string;
    section: string;
  } | null>(null);
  const changed =
    !applied ||
    applied.session !== session ||
    applied.className !== className ||
    applied.section !== section;
  const showReport = () => {
    if (!className) return;
    if (!changed) reload();
    else setApplied({ session, className, section });
  };
  const [upToMonth, setUpToMonth] = useState(() =>
    currentSessionMonth(sessions[0]?.value ?? ""),
  );
  const [onlyDues, setOnlyDues] = useState(true);
  const [carryOpen, setCarryOpen] = useState(false);
  // Reminders opened on this visit, so the admin can go down the list.
  const [reminded, setReminded] = useState<Set<string>>(() => new Set());

  const { rows, loading, error, reload } = useDuesReport(
    applied?.session ?? "",
    !applied || applied.className === ALL ? "" : applied.className,
    !applied || applied.section === ALL ? "" : applied.section,
    applied !== null,
  );
  // Labels of the report on screen (what was applied, not the draft filters).
  const reportClass = applied?.className ?? ALL;
  const reportSection = applied?.section ?? ALL;
  const classLabel =
    reportClass === ALL
      ? `All classes${reportSection === ALL ? "" : ` · Section ${reportSection}`}`
      : `Class ${toOrdinalLabel(reportClass)}${reportSection === ALL ? "" : `-${reportSection}`}`;

  const report = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        upTo: duesUpTo(row.account, upToMonth),
        sessionDue: feeTotals(row.account.lines).due,
      })),
    [rows, upToMonth],
  );
  const shown = onlyDues ? report.filter((row) => row.upTo.due > 0) : report;
  const totalUpTo = report.reduce((sum, row) => sum + row.upTo.due, 0);
  const totalSession = report.reduce((sum, row) => sum + row.sessionDue, 0);
  const withDues = report.filter((row) => row.upTo.due > 0).length;

  const tiles = [
    {
      label: "Students with dues",
      value: `${withDues} / ${report.length}`,
      className: "text-gray-800",
    },
    {
      label: `Due till ${monthLabel(upToMonth)}`,
      value: formatRupees(totalUpTo),
      className: "text-red-600",
    },
    {
      label: "Remaining for the session",
      value: formatRupees(totalSession),
      className: "text-amber-700",
    },
  ];

  return (
    <div className="flex min-h-full flex-col gap-2 print:min-h-0">
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

      {/* Four filters in a row, then the actions; every control is 38px tall
          and the row lines up on the bottom edge. */}
      {/* Sticky band in the page colour: its ::before also covers <main>'s
          padding above and beside it, so the list never shows through. */}
      <div className="sticky top-0 z-20 bg-gray-100 pb-1 before:absolute before:-inset-x-4 before:-top-4 before:bottom-0 before:-z-10 before:bg-gray-100 before:content-[''] md:before:-inset-x-2 print:hidden">
        <div className="relative grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] print:hidden">
          <div>
            <label htmlFor="duesSession" className={labelClass}>
              Session
            </label>
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
            <label htmlFor="duesClass" className={labelClass}>
              Class
            </label>
            <SelectDropdown
              id="duesClass"
              value={className}
              placeholder="Select class"
              onValueChange={setClassName}
              options={CLASS_FILTER}
            />
          </div>
          <div>
            <label htmlFor="duesSection" className={labelClass}>
              Section
            </label>
            <SelectDropdown
              id="duesSection"
              value={section}
              onValueChange={setSection}
              options={SECTION_FILTER}
            />
          </div>
          <div>
            <label htmlFor="duesMonth" className={labelClass}>
              Dues up to
            </label>
            <SelectDropdown
              id="duesMonth"
              value={String(upToMonth)}
              onValueChange={(value) => setUpToMonth(Number(value))}
              options={SESSION_MONTH_OPTIONS}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-4 2xl:col-span-1">
            <label
              htmlFor="duesOnly"
              className="mr-auto flex h-[38px] items-center gap-2 whitespace-nowrap text-sm font-semibold text-gray-700 2xl:mr-0"
            >
              <Switch
                id="duesOnly"
                checked={onlyDues}
                onCheckedChange={setOnlyDues}
              />
              Only with dues
            </label>
            <button
              type="button"
              disabled={!className || loading}
              onClick={showReport}
              title={!className ? "Select a class first" : undefined}
              className="h-[38px] whitespace-nowrap rounded-md bg-cves px-5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
            >
              Show Report
            </button>
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
                    session: applied?.session ?? session,
                    classLabel,
                    upToMonth,
                  },
                )
              }
              title="Download Excel"
              aria-label="Download the dues report as Excel"
              className="grid h-[38px] w-[38px] place-items-center rounded-md border border-gray-300 text-green-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={loading || shown.length === 0}
              onClick={() => window.print()}
              title="Print"
              aria-label="Print the dues report"
              className="grid h-[38px] w-[38px] place-items-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Printer className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {!applied ? (
        <FeeEmptyState
          icon={ListChecks}
          title="See who still owes fees"
          text="Choose the classes first. Nothing is loaded until you press Show report, and All classes takes longer."
          steps={EMPTY_STEPS}
          className="flex-1"
        />
      ) : loading ? (
        <Loader label="Loading dues..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : (
        <>
          {changed && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 print:hidden">
              Filters changed. Press Show report to load them. Showing:{" "}
              {applied.session} · {classLabel}.
            </p>
          )}
          <h2 className="hidden text-lg font-bold print:block">
            Dues Report · {applied.session} · {classLabel} · up to{" "}
            {monthLabel(upToMonth)}
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {tile.label}
                </p>
                <p className={`mt-1 text-xl font-bold ${tile.className}`}>
                  {tile.value}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white print:overflow-visible">
            {shown.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">
                {report.length === 0
                  ? "No students found."
                  : "No dues up to this month. 🎉"}
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
                    <th className="px-3 py-2 text-right font-semibold">
                      Due till {monthLabel(upToMonth)}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Session due
                    </th>
                    <th className="px-3 py-2 text-center font-semibold print:hidden">
                      Remind
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shown.map((row, index) => (
                    <tr
                      key={row.student.studentId}
                      className="break-inside-avoid"
                    >
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2">
                        {toOrdinalLabel(row.student.className)}-
                        {row.student.section}
                      </td>
                      <td className="px-3 py-2">{row.rollNumber || "-"}</td>
                      <td className="px-3 py-2">
                        <Link
                          to={collectLink(applied.session, row.student)}
                          className="font-semibold text-primaryBlue hover:underline print:text-black print:no-underline"
                        >
                          {row.student.studentName}
                        </Link>
                        <p className="text-xs text-gray-500">
                          Adm. {row.student.admissionNo || "-"}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        {row.student.fatherName || "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.upTo.months
                          .map((month) => monthLabel(month).slice(0, 3))
                          .join(", ") || "-"}
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
                              ? dueReminderLink(
                                  row,
                                  row.upTo.due,
                                  row.upTo.months,
                                  upToMonth,
                                )
                              : ""
                          }
                          hasDue={row.upTo.due > 0}
                          sent={reminded.has(row.student.studentId)}
                          onSent={() =>
                            setReminded((prev) =>
                              new Set(prev).add(row.student.studentId),
                            )
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
                      {formatRupees(
                        shown.reduce((sum, row) => sum + row.upTo.due, 0),
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatRupees(
                        shown.reduce((sum, row) => sum + row.sessionDue, 0),
                      )}
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
    return (
      <span
        className="text-xs text-gray-400"
        title="No valid mobile number on the admission form"
      >
        No number
      </span>
    );
  }
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onSent}
      title="Send the fee reminder on WhatsApp"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        sent
          ? "bg-gray-100 text-gray-600"
          : "bg-green-500 text-white hover:bg-green-600"
      }`}
    >
      {sent ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <FaWhatsapp className="h-3.5 w-3.5" />
      )}
      {sent ? "Sent" : "Send"}
    </a>
  );
}

export default DuesReport;
