import React, { ChangeEvent, useMemo, useState } from "react";
import { CLASSES, SECTIONS } from "../../../../constants";
import { toOrdinalLabel } from "../../../../utils/toOrdinalLabel";
import { academicYears } from "../examScheduleShared";
import PageHeader from "../../../../custom-components/PageHeader";
import useExamList from "../../../../hooks/useExamList";
import useDeskSlipStudents from "../../../../hooks/useDeskSlipStudents";
import useClassRollNumbers from "../../../../hooks/useClassRollNumbers";
import DeskSlipCard from "./DeskSlipCard";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

const DeskSlip: React.FC = () => {
  const [session, setSession] = useState(academicYears[0]?.value ?? "");
  const [examId, setExamId] = useState("");
  const [selectedClass, setSelectedClass] = useState("PG");
  const [selectedSection, setSelectedSection] = useState("all");

  const { exams, loadingExam } = useExamList();

  const sessionExams = useMemo(
    () => exams.filter((exam) => exam.academicYear === session),
    [exams, session],
  );
  const selectedExam = sessionExams.find((exam) => exam.id === examId) ?? null;

  const readyToLoad = Boolean(session && selectedExam);

  const { students, loading, error } = useDeskSlipStudents({
    academicYear: session,
    className: selectedClass,
    section: selectedSection,
    enabled: readyToLoad,
  });

  const { getRollNumber, loading: loadingRollNumbers } = useClassRollNumbers({
    academicYear: session,
    classNames: selectedClass === "all" ? CLASSES : [selectedClass],
    enabled: readyToLoad,
  });

  const isLoading = loading || loadingRollNumbers;

  return (
    <div className="flex flex-col gap-2 print:block print:m-0 print:w-full print:p-0">
      {" "}
      {/* <-- yahan */}
      <style>{`
      @page { size: A4; margin: 10mm; }
      @media print {
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
      <div className="print:hidden">
        <PageHeader
          title="Desk Slip"
          titleStyle="text-primaryBlue"
          description="Generate desk slip for exams"
          descriptionStyle="text-gray-500"
        />
      </div>
      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <div>
          <label
            htmlFor="deskSlipSession"
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            Session
          </label>
          <select
            id="deskSlipSession"
            value={session}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              setSession(event.target.value);
              setExamId("");
            }}
            className={inputClass}
          >
            <option value="">Select Session</option>
            {academicYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="deskSlipExam"
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            Exam
          </label>
          <select
            id="deskSlipExam"
            value={examId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setExamId(event.target.value)
            }
            disabled={!session || loadingExam}
            className={inputClass}
          >
            <option value="">Select Exam</option>
            {sessionExams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.examName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="deskSlipClass"
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            Class
          </label>
          <select
            id="deskSlipClass"
            value={selectedClass}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setSelectedClass(event.target.value)
            }
            className={inputClass}
          >
            <option value="all">All Classes</option>
            {CLASSES.map((className) => (
              <option key={className} value={className}>
                {toOrdinalLabel(className)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="deskSlipSection"
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            Section
          </label>
          <select
            id="deskSlipSection"
            value={selectedSection}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setSelectedSection(event.target.value)
            }
            className={inputClass}
          >
            <option value="all">All Sections</option>
            {SECTIONS.map((section) => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Toolbar */}
      {readyToLoad && !isLoading && students.length > 0 && (
        <div className="flex items-center justify-between print:hidden">
          <span className="text-sm text-gray-500">
            {students.length} desk slip{students.length > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Print Desk Slips
          </button>
        </div>
      )}
      {/* Slips */}
      {!readyToLoad ? (
        <p className="rounded-lg bg-white p-10 text-center text-gray-500">
          Select a session and an exam.
        </p>
      ) : isLoading ? (
        <p className="rounded-lg bg-white p-10 text-center">
          Loading students...
        </p>
      ) : error ? (
        <p className="rounded-lg bg-white p-10 text-center text-red-600">
          {error.message}
        </p>
      ) : students.length === 0 ? (
        <p className="rounded-lg bg-white p-10 text-center text-gray-500">
          No students found.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,9cm)] gap-4 print:grid-cols-[9cm_9cm] print:justify-center print:gap-x-[4mm] print:gap-y-[4mm]">
          {students.map((student) => (
            <DeskSlipCard
              key={student.id}
              admissionNo={student.admissionNo}
              className={toOrdinalLabel(student.className)}
              section={student.section}
              examName={selectedExam?.examName ?? ""}
              session={session}
              studentName={student.studentName}
              fatherName={student.fatherName}
              photoUrl={student.photoUrl}
              rollNo={getRollNumber(student.studentId, student.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DeskSlip;
