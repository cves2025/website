import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import schoolLogo from "../../../../assets/image/schoolLogo1.png";

type AdmitCardTemplateId = "template1";

interface TemplateOption {
  id: AdmitCardTemplateId;
  name: string;
  description: string;
}

interface StudentData {
  enrollment: string;
  rollNo: number;
  studentName: string;
  fatherName: string;
  motherName: string;
  className: string;
  section: string;
  academicYear: string;
  studentPhoto?: string;
}

interface ExamData {
  examName: string;
  academicYear: string;
}

interface SchedulePaper {
  id: string;
  subject: string;
  type: string;
  date: string;
  fromTime: string;
  toTime: string;
}

const DUMMY_STUDENT: StudentData = {
  enrollment: "CVES2026001",
  rollNo: 12,
  studentName: "Aarav Sharma",
  fatherName: "Rajesh Sharma",
  motherName: "Priya Sharma",
  className: "5",
  section: "A",
  academicYear: "2026-27",
};

const DUMMY_EXAM: ExamData = {
  examName: "Annual Examination",
  academicYear: "2026-27",
};

const DUMMY_WRITTEN_PAPERS: SchedulePaper[] = [
  {
    id: "english",
    subject: "English",
    type: "Written",
    date: "2027-03-10",
    fromTime: "10:00",
    toTime: "12:00",
  },
  {
    id: "mathematics",
    subject: "Mathematics",
    type: "Written",
    date: "2027-03-12",
    fromTime: "10:00",
    toTime: "12:00",
  },
  {
    id: "science",
    subject: "Science",
    type: "Written",
    date: "2027-03-15",
    fromTime: "10:00",
    toTime: "12:00",
  },
  {
    id: "social-science",
    subject: "Social Science",
    type: "Written",
    date: "2027-03-17",
    fromTime: "10:00",
    toTime: "12:00",
  },
];

const DUMMY_PRACTICAL_PAPERS: SchedulePaper[] = [
  {
    id: "computer",
    subject: "Computer",
    type: "Practical",
    date: "2027-03-19",
    fromTime: "10:00",
    toTime: "11:00",
  },
];

/*
 * --------------------------------------------------------------------------
 * Template options
 * --------------------------------------------------------------------------
 *
 * Currently there is only one template.
 * More templates can be added later.
 */

const TEMPLATES: TemplateOption[] = [
  {
    id: "template1",
    name: "Current Admit Card",
    description: "Current school admit card design",
  },
];

/*
 * --------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------
 */

function formatDate(date: string): string {
  if (!date) return "-";

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
}

function formatTime(time: string): string {
  if (!time) return "-";

  const [hourString, minute] = time.split(":");

  const hour = Number(hourString);

  if (Number.isNaN(hour)) return time;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

function toOrdinalLabel(value: string): string {
  const number = Number(value);

  if (Number.isNaN(number)) return value;

  if (number % 100 >= 11 && number % 100 <= 13) {
    return `${number}th`;
  }

  switch (number % 10) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
}

/*
 * --------------------------------------------------------------------------
 * Schedule Table
 * --------------------------------------------------------------------------
 */

function AdmitScheduleTable({
  papers,
}: {
  papers: SchedulePaper[];
}) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full table-fixed border border-gray-300 text-sm">
        <colgroup>
          <col style={{ width: "28%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "15%" }} />
        </colgroup>

        <thead>
          <tr className="bg-gray-100 text-gray-800">
            <th className="border border-gray-300 px-2 py-1 text-left">
              Subject
            </th>

            <th className="border border-gray-300 px-2 py-1 text-center">
              Type
            </th>

            <th className="border border-gray-300 px-2 py-1 text-center">
              Date
            </th>

            <th className="border border-gray-300 px-2 py-1 text-center">
              Reporting Time
            </th>

            <th className="border border-gray-300 px-2 py-1 text-center">
              End Time
            </th>

            <th className="border border-gray-300 px-2 py-1 text-center">
              Invigilator Sign
            </th>
          </tr>
        </thead>

        <tbody>
          {papers.map((paper) => (
            <tr
              key={paper.id}
              className="print:break-inside-avoid"
            >
              <td className="overflow-hidden border border-gray-300 px-2 py-1 font-semibold">
                {paper.subject}
              </td>

              <td className="border border-gray-300 px-2 py-1 text-center">
                {paper.type || "-"}
              </td>

              <td className="border border-gray-300 px-2 py-1 text-center">
                {formatDate(paper.date)}
              </td>

              <td className="border border-gray-300 px-2 py-1 text-center">
                {formatTime(paper.fromTime)}
              </td>

              <td className="border border-gray-300 px-2 py-1 text-center">
                {formatTime(paper.toTime)}
              </td>

              <td className="border border-gray-300 px-2 py-1 text-center text-gray-400">
                &nbsp;
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/*
 * --------------------------------------------------------------------------
 * Student Detail Row
 * --------------------------------------------------------------------------
 */

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p className="flex gap-1.5">
      <span className="w-28 shrink-0 font-semibold text-gray-600">
        {label}
      </span>

      <span className="flex-1 truncate">
        : {value}
      </span>
    </p>
  );
}

/*
 * --------------------------------------------------------------------------
 * Admit Card Preview
 * --------------------------------------------------------------------------
 */

function AdmitCardPreview() {
  const student = DUMMY_STUDENT;
  const exam = DUMMY_EXAM;

  return (
    <div className="mx-auto mt-2 max-w-4xl print:m-0 print:h-[296mm] print:w-[210mm] print:max-w-none print:overflow-hidden print:break-after-page print:box-border print:p-[10px] print:last:break-after-auto">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border-4 border-double border-blue-800 bg-white shadow-lg print:rounded-none print:shadow-none">

        {/* ================================================================
            HEADER
        ================================================================ */}

        <div className="border-b-4 border-double border-blue-800 bg-white px-4 py-2 md:px-6">

          {/* School Code / Affiliation */}
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-black">
            <span className="flex-1">
              School Code: 09670911304
            </span>

            <span className="flex-1 text-right">
              Affiliation No.: 14203-05
            </span>
          </div>

          {/* School Logo + Name */}
          <div className="mt-1 flex items-start justify-center gap-3 sm:gap-4">

            {/* Logo */}
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded sm:h-28 sm:w-28">
              <img
                src={schoolLogo}
                alt="School logo"
                className="h-full w-full scale-125 object-cover grayscale"
              />
            </div>

            {/* School Information */}
            <div className="min-w-0 flex-1 text-left sm:text-center">

              <h3 className="text-lg font-extrabold leading-tight tracking-tight text-black sm:text-2xl">
                CHILDREN&apos;S VALLEY ENGLISH SCHOOL
              </h3>

              <p className="mt-0.5 text-xs font-semibold italic text-black md:text-sm">
                D 59/295 A, Mahmoorganj, Varanasi · 0542-2220107,
                9336576690
              </p>

              <div className="mt-1 text-xs font-bold text-black sm:text-sm">
                <span className="mr-3">
                  A Gov. Affiliated
                </span>

                <span className="mr-3">
                  C.B.S.E. Pattern
                </span>

                <span>
                  Co - Education
                </span>
              </div>

              {/* Admit Card Badge */}
              <div className="mt-2 flex justify-center">
                <div className="inline-block rounded bg-black px-8 py-1 text-sm font-bold tracking-wide text-white [-webkit-print-color-adjust:exact] [print-color-adjust:exact] md:text-base">
                  ADMIT CARD
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================
            EXAM STRIP
        ================================================================ */}

        <div className="flex items-center justify-between gap-x-4 border-b-2 border-blue-800 bg-blue-50 px-4 py-1 text-sm md:px-6">

          <span className="flex-1">
            <span className="font-semibold">
              Session:
            </span>{" "}
            {student.academicYear}
          </span>

          <span className="flex-[2] text-center">
            <span className="font-semibold">
              Examination:
            </span>{" "}
            {exam.examName}
          </span>

          <span className="flex-1 text-right">
            <span className="font-semibold">
              Class:
            </span>{" "}
            {toOrdinalLabel(student.className)}
            {student.section
              ? ` - ${student.section}`
              : ""}
          </span>
        </div>

        {/* ================================================================
            STUDENT DETAILS
        ================================================================ */}

        <div className="grid grid-cols-1 items-start gap-6 border-b border-gray-200 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_auto] md:px-6 print:grid-cols-[minmax(0,1fr)_auto] print:px-6">

          {/* Details */}
          <div className="grid min-w-0 grid-cols-1 content-start gap-y-1.5 text-sm">

            <DetailRow
              label="Enrollment No."
              value={student.enrollment}
            />

            <DetailRow
              label="Roll No."
              value={String(student.rollNo)}
            />

            <DetailRow
              label="Student Name"
              value={student.studentName}
            />

            <DetailRow
              label="Father's Name"
              value={student.fatherName}
            />

            <DetailRow
              label="Mother's Name"
              value={student.motherName}
            />
          </div>

          {/* Student Photo */}
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-400 bg-white text-center text-xs text-gray-400">

            {student.studentPhoto ? (
              <img
                src={student.studentPhoto}
                alt="Student"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="px-2">
                Affix recent photograph
              </span>
            )}
          </div>
        </div>

        {/* ================================================================
            SCHEDULE
        ================================================================ */}

        <div className="flex flex-1 flex-col p-2 md:p-1">

          {/* Written Exam */}
          {DUMMY_WRITTEN_PAPERS.length > 0 && (
            <>
              <h4 className="mb-1 text-center font-bold text-gray-800">
                Exam Schedule
              </h4>

              <AdmitScheduleTable
                papers={DUMMY_WRITTEN_PAPERS}
              />
            </>
          )}

          {/* Practical Exam */}
          {DUMMY_PRACTICAL_PAPERS.length > 0 && (
            <>
              <h4 className="mb-1 mt-2 text-center font-bold text-gray-800">
                Practical Exam Schedule
              </h4>

              <AdmitScheduleTable
                papers={DUMMY_PRACTICAL_PAPERS}
              />
            </>
          )}

          {/* ==============================================================
              INSTRUCTIONS
          ============================================================== */}

          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50/60 p-3">

            <h5 className="text-sm font-bold text-gray-800">
              Instructions to the candidate
            </h5>

            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-gray-700">

              <li>
                Reach the examination hall at least 15 minutes
                before the reporting time printed above.
              </li>

              <li>
                Please carry this admit card to the examination.
              </li>

              <li>
                Use only blue or black ink. Mobile phones and
                smart watches are strictly prohibited.
              </li>

              <li>
                Read every question carefully and write the answers.
              </li>

              <li>
                The school is not responsible for any loss of
                personal belongings in the examination hall.
              </li>
            </ol>
          </div>

          {/* ================================================================
              QR + SIGNATURES
          ================================================================ */}

          <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-6 text-sm text-gray-700">

            {/* Class Teacher */}
            <div className="text-center">
              <p className="w-36 border-t-2 border-gray-400 pt-2">
                Class Teacher
              </p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-1">
              <QRCodeCanvas
                value="https://cves.in"
                size={72}
              />

              <span className="text-xs font-semibold text-gray-600">
                www.cves.in
              </span>
            </div>

            {/* Principal */}
            <div className="text-center">
              <div className="mx-auto mb-1 flex h-20 w-32 items-center justify-center text-xs text-gray-400">
                Principal Signature
              </div>

              <p className="w-36 border-t-2 border-gray-400 pt-2">
                Principal
              </p>
            </div>
          </div>

          {/* ================================================================
              FOOTER
          ================================================================ */}

          <div className="mt-3 text-xs text-gray-500">
            <p className="text-center">
              This admit card is valid only for{" "}
              {exam.examName}
              {exam.academicYear
                ? ` (${exam.academicYear})`
                : ""}{" "}
              and must be produced on every examination day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------------------------------
 * Main Page
 * --------------------------------------------------------------------------
 */

function AdmitCardTemplate() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<AdmitCardTemplateId>("template1");

  return (
    <div className="w-full space-y-6">

      {/* ================================================================
          PAGE TITLE
      ================================================================ */}

      <div>
        <h1 className="text-2xl font-bold text-primaryBlue">
          Admit Card Template
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Select the template used for generating student
          admit cards.
        </p>
      </div>

      {/* ================================================================
          TEMPLATE SELECTION
      ================================================================ */}

      <section className="rounded-lg bg-white p-4 shadow-sm">

        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Select Template
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

          {TEMPLATES.map((template) => {
            const isSelected =
              selectedTemplate === template.id;

            return (
              <label
                key={template.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                  isSelected
                    ? "border-primaryBlue bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {/* Radio */}
                <input
                  type="radio"
                  name="admitCardTemplate"
                  value={template.id}
                  checked={isSelected}
                  onChange={() =>
                    setSelectedTemplate(template.id)
                  }
                  className="mt-1 h-4 w-4 accent-primaryBlue"
                />

                {/* Template Information */}
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">
                    {template.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {template.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {/* ================================================================
          PREVIEW
      ================================================================ */}

      <section className="rounded-lg bg-white p-4 shadow-sm">

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Template Preview
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            This is a preview using sample student and
            examination data.
          </p>
        </div>

        {/* Current Template */}
        {selectedTemplate === "template1" && (
          <AdmitCardPreview />
        )}
      </section>
    </div>
  );
}

export default AdmitCardTemplate;