import React, { useContext, useMemo, useState } from "react";
import { CLASSES, SECTIONS } from "../../../../constants";
import { toOrdinalLabel } from "../../../../utils/toOrdinalLabel";
import { academicYears } from "../examScheduleShared";
import PageHeader from "../../../../custom-components/PageHeader";
import SelectDropdown from "../../../../custom-components/SelectDropdown";
import useExamList from "../../../../hooks/useExamList";
import useDeskSlipStudents from "../../../../hooks/useDeskSlipStudents";
import useClassRollNumbers from "../../../../hooks/useClassRollNumbers";
import DeskSlipCard from "./DeskSlipCard";
import { myContext } from "../../../context/MyContextProvider";
import { NO_SCOPE, scopedClasses } from "../../../../permissions";

// SelectDropdown trigger with the same look and height as the old selects.
const selectTriggerClass =
  "h-auto border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 disabled:bg-gray-100";

const DeskSlip: React.FC = () => {
  // A teacher only sees students of the classes they are assigned to.
  const { user } = useContext(myContext);
  const scope = user?.scope ?? NO_SCOPE;
  const isAdmin = scope.kind === "all";
  const allowedClasses = scopedClasses(scope, CLASSES);

  const [session, setSession] = useState(academicYears[0]?.value ?? "");
  const [examId, setExamId] = useState("");
  const [selectedClass, setSelectedClass] = useState(
    () => allowedClasses[0] ?? "",
  );
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
    classNames: selectedClass === "all" ? allowedClasses : [selectedClass],
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
          <SelectDropdown
            id="deskSlipSession"
            value={session}
            onValueChange={(value) => {
              setSession(value);
              setExamId("");
            }}
            placeholder="Select Session"
            options={academicYears}
            className={selectTriggerClass}
          />
        </div>

        <div>
          <label
            htmlFor="deskSlipExam"
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            Exam
          </label>
          <SelectDropdown
            id="deskSlipExam"
            value={examId}
            onValueChange={setExamId}
            disabled={!session || loadingExam}
            placeholder="Select Exam"
            options={sessionExams.map((exam) => ({
              label: exam.examName,
              value: exam.id,
            }))}
            className={selectTriggerClass}
          />
        </div>

        <div>
          <label
            htmlFor="deskSlipClass"
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            Class
          </label>
          <SelectDropdown
            id="deskSlipClass"
            value={selectedClass}
            onValueChange={setSelectedClass}
            options={[
              ...(isAdmin ? [{ label: "All Classes", value: "all" }] : []),
              ...allowedClasses.map((className) => ({
                label: toOrdinalLabel(className),
                value: className,
              })),
            ]}
            className={selectTriggerClass}
          />
        </div>

        <div>
          <label
            htmlFor="deskSlipSection"
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            Section
          </label>
          <SelectDropdown
            id="deskSlipSection"
            value={selectedSection}
            onValueChange={setSelectedSection}
            options={[
              { label: "All Sections", value: "all" },
              ...SECTIONS.map((section) => ({
                label: `Section ${section}`,
                value: section,
              })),
            ]}
            className={selectTriggerClass}
          />
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
