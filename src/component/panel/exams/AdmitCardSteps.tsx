import { NavLink } from "react-router-dom";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { marksSchemeBadge } from "../../../utils/examMarksScheme";
import SearchableMultiSelect from "../../../custom-components/SearchableMultiSelect";
import {
  ADD_EXAM_PATH,
  EXAM_SCHEDULE_PATH,
  academicYears,
  examPageLink,
  formatScheduleDate,
  inputClass,
} from "./examScheduleShared";
import type { AdmitCardGenerator } from "./useAdmitCardGenerator";

interface SelectExamStepProps {
  generator: AdmitCardGenerator;
}

/** Step 1 of the flow — pick the academic year and the examination. */
function SelectExamStep({ generator }: SelectExamStepProps) {
  const {
    loadingExams,
    selectedYear,
    handleYearChange,
    selectedExamId,
    handleExamChange,
    yearExams,
    selectedExam,
    loadingSchedule,
    rows,
  } = generator;

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold text-gray-800">Select Examination</h3>
      <p className="text-sm text-gray-600 mt-0.5">
        The papers of the selected exam are read from the Exam Schedule page.
      </p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="modalCardYear"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Academic Year
          </label>
          <select
            id="modalCardYear"
            value={selectedYear}
            onChange={(event) => handleYearChange(event.target.value)}
            className={inputClass}
          >
            <option value="">All Academic Years</option>
            {academicYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="modalCardExam"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Exam
          </label>
          <select
            id="modalCardExam"
            value={selectedExamId}
            onChange={(event) => handleExamChange(event.target.value)}
            disabled={loadingExams}
            className={inputClass}
          >
            <option value="">
              {loadingExams ? "Loading exams..." : "Select Exam"}
            </option>
            {yearExams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.examName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!loadingExams && yearExams.length === 0 && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
          No active exam found{selectedYear ? ` for ${selectedYear}` : ""}.
          Create one on the{" "}
          <NavLink to={ADD_EXAM_PATH} className="underline">
            Add Exam
          </NavLink>{" "}
          page first.
        </p>
      )}

      {selectedExam && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <span className="font-bold">{selectedExam.examName}</span>
          <span className="rounded bg-white px-2 py-0.5 font-semibold">
            {marksSchemeBadge(
              selectedExam.examCategory,
              selectedExam.marksScheme,
            )}
          </span>
          {selectedExam.examStartDate && (
            <span>
              Exam window: {formatScheduleDate(selectedExam.examStartDate)}
              {selectedExam.examEndDate
                ? ` – ${formatScheduleDate(selectedExam.examEndDate)}`
                : ""}
            </span>
          )}
          <span>
            Applicable classes:{" "}
            {selectedExam.applicableClasses.map(toOrdinalLabel).join(", ") ||
              "-"}
          </span>
        </div>
      )}

      {loadingSchedule && (
        <p className="mt-3 text-sm font-semibold text-gray-500">
          Loading saved schedule...
        </p>
      )}

      {selectedExam && !loadingSchedule && rows.length === 0 && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
          No subject paper is saved for this exam yet. Add the papers on the{" "}
          <NavLink
            to={examPageLink(
              EXAM_SCHEDULE_PATH,
              selectedExamId,
              selectedExam.academicYear || selectedYear,
            )}
            className="underline"
          >
            Exam Schedule
          </NavLink>{" "}
          page, then generate the card again.
        </p>
      )}
    </div>
  );
}

interface GenerateAdmitCardStepProps {
  generator: AdmitCardGenerator;
}

/** Step 2 of the flow — pick the class and the student(s), then generate. */
function GenerateAdmitCardStep({ generator }: GenerateAdmitCardStepProps) {
  const {
    selectedExam,
    selectedYear,
    loadingSchedule,
    cardPapers,
    selectedClass,
    handleClassChange,
    scheduledClasses,
    loadingStudents,
    selectedEnrollments,
    setSelectedEnrollments,
    allStudents,
    studentOptions,
    visibleStudents,
    studentListNote,
    otherSessionStudents,
    showOtherSessions,
    setShowOtherSessions,
    generateError,
  } = generator;

  const studentCount = allStudents
    ? visibleStudents.length
    : selectedEnrollments.length;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-start justify-end gap-3">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
            {!selectedExam
              ? "Select an exam above"
              : loadingSchedule
                ? "Loading schedule..."
                : `${cardPapers.length} paper${
                    cardPapers.length === 1 ? "" : "s"
                  } for ${
                    selectedClass ? toOrdinalLabel(selectedClass) : "the class"
                  }`}
          </span>
          <span className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
            {studentCount} student{studentCount === 1 ? "" : "s"} selected
          </span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <label
            htmlFor="modalCardClass"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Class
          </label>
          <select
            id="modalCardClass"
            value={selectedClass}
            onChange={(event) => handleClassChange(event.target.value)}
            disabled={!selectedExam || scheduledClasses.length === 0}
            className={inputClass}
          >
            <option value="">Select Class</option>
            {scheduledClasses.map((className) => (
              <option key={className} value={className}>
                {toOrdinalLabel(className)}
              </option>
            ))}
          </select>
          {selectedExam && scheduledClasses.length === 0 && (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              No class has a scheduled paper yet.
            </p>
          )}
        </div>

        <div className="lg:col-span-9">
          <SearchableMultiSelect
            id="modalCardStudent"
            label="Student"
            required
            options={studentOptions}
            values={selectedEnrollments}
            onChange={setSelectedEnrollments}
            disabled={!selectedClass || loadingStudents}
            loading={loadingStudents}
            loadingLabel="Loading students..."
            placeholder={
              selectedClass
                ? `Select student(s) of ${toOrdinalLabel(selectedClass)}`
                : "Select a class first"
            }
            searchPlaceholder="Search by name, father's name, enrollment..."
            emptyMessage={
              selectedClass
                ? `No student found for ${toOrdinalLabel(selectedClass)}`
                : "Select a class first"
            }
          />
        </div>

        </div>

      {otherSessionStudents.length > 0 && (
        <label className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          <input
            type="checkbox"
            checked={showOtherSessions}
            onChange={(event) => setShowOtherSessions(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {otherSessionStudents.length} student(s) of this class belong to
          another session
          {selectedYear ? ` (not ${selectedYear})` : ""} and are hidden. Show
          them in the list above.
        </label>
      )}

      {studentListNote && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
          {studentListNote}
        </p>
      )}

      {!loadingStudents && selectedClass && visibleStudents.length === 0 && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
          No student found in {toOrdinalLabel(selectedClass)}
          {selectedYear ? ` for ${selectedYear}` : ""}.
          {otherSessionStudents.length > 0 ? (
            ` ${otherSessionStudents.length} student(s) of this class belong to another session - tick the box above to show them.`
          ) : (
            <>
              {" "}
              Import the class list from the{" "}
              <NavLink to="/welcome/student/add" className="underline">
                Add Student
              </NavLink>{" "}
              page (Bulk Upload tab) or add the students first.
            </>
          )}
        </p>
      )}

      {generateError && (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
          {generateError}
        </p>
      )}
    </div>
  );
}

export { SelectExamStep, GenerateAdmitCardStep };
