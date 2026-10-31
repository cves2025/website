import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../custom-components/PageHeader";
import Button from "../../../../custom-components/Button";
import SearchableMultiSelect, {
  type SearchableOption,
} from "../../../../custom-components/SearchableMultiSelect";
import { SECTIONS } from "../../../../constants";
import { toOrdinalLabel } from "../../../../utils/toOrdinalLabel";
import {
  GENERATED_RESULT_CARDS_PATH,
  academicYears,
  inputClass,
} from "../examScheduleShared";
import { useAdmitCardGenerator } from "../useAdmitCardGenerator";

/** Year + exams (many) + class + section + students -> generated result cards. */
function ResultPanel() {
  // Reused only for year / class / section / students; the exam list is separate.
  const gen = useAdmitCardGenerator({});
  const navigate = useNavigate();
  const [examIds, setExamIds] = useState<string[]>([]);

  const examOptions: SearchableOption[] = gen.yearExams
    .filter(
      (exam) =>
        !gen.selectedClass ||
        exam.applicableClasses.length === 0 ||
        exam.applicableClasses.includes(gen.selectedClass),
    )
    .map((exam) => ({
      value: exam.id,
      label: exam.examName,
      hint: exam.academicYear,
    }));

  const validExamIds = examIds.filter((id) =>
    examOptions.some((option) => option.value === id),
  );

  const studentCount = gen.allStudents
    ? gen.visibleStudents.length
    : gen.selectedEnrollments.length;

  const canGenerate =
    validExamIds.length > 0 && Boolean(gen.selectedClass) && studentCount > 0;

  const handleSubmit = () => {
    if (!canGenerate) return;
    const params = new URLSearchParams();
    params.set("exams", validExamIds.join(","));
    params.set("year", gen.selectedYear);
    params.set("class", gen.selectedClass);
    if (gen.selectedSection) params.set("section", gen.selectedSection);
    params.set(
      "students",
      gen.allStudents ? "all" : gen.selectedEnrollments.join(","),
    );
    navigate(`${GENERATED_RESULT_CARDS_PATH}?${params.toString()}`);
  };

  return (
    <div>
      <PageHeader
        title="Generate Result Card"
        titleStyle="text-primaryBlue"
        description="Select the academic year, exam(s), class, section and students to generate their result card."
        descriptionStyle="text-gray-500"
      />

      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
          Academic Year
          <select
            className={inputClass}
            value={gen.selectedYear}
            onChange={(event) => {
              gen.handleYearChange(event.target.value);
              setExamIds([]);
            }}
          >
            {academicYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
          Class
          <select
            className={inputClass}
            value={gen.selectedClass}
            onChange={(event) => gen.handleClassChange(event.target.value)}
          >
            <option value="">Select class</option>
            {gen.allowedClasses.map((className) => (
              <option key={className} value={className}>
                {toOrdinalLabel(className)}
              </option>
            ))}
          </select>
        </label>

        <SearchableMultiSelect
          label="Exams"
          required
          options={examOptions}
          values={validExamIds}
          onChange={setExamIds}
          placeholder="Select one or more exams"
          searchPlaceholder="Search exam..."
          emptyMessage="No exam found for this year and class"
          maxChips={2}
        />

        <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
          Section
          <select
            className={inputClass}
            value={gen.selectedSection}
            onChange={(event) => gen.handleSectionChange(event.target.value)}
            disabled={!gen.selectedClass}
          >
            <option value="">All Sections</option>
            {SECTIONS.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={gen.allStudents}
              disabled={!gen.selectedClass}
              onChange={(event) =>
                gen.handleSelectAllStudents(event.target.checked)
              }
            />
            All students of the class
            {gen.selectedClass ? ` (${gen.visibleStudents.length})` : ""}
          </label>

          {!gen.allStudents && (
            <SearchableMultiSelect
              label="Students"
              options={gen.studentOptions}
              values={gen.selectedEnrollments}
              onChange={gen.setSelectedEnrollments}
              placeholder="Select student(s)"
              searchPlaceholder="Search name, father, enrollment..."
              loading={gen.loadingStudents}
              disabled={!gen.selectedClass}
              emptyMessage="No student found"
            />
          )}
        </div>

        <div className="flex justify-end">
          <Button
            buttonName={
              studentCount > 1
                ? `Generate ${studentCount} Result Cards`
                : "Generate Result Card"
            }
            variant="success"
            size="md"
            buttonStyle="rounded-full bg-amber-600 hover:bg-amber-700"
            disabled={!canGenerate}
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

export default ResultPanel;
