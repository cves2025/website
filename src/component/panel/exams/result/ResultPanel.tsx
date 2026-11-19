import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../custom-components/PageHeader";
import Button from "../../../../custom-components/Button";
import SearchableMultiSelect, {
  type SearchableOption,
} from "../../../../custom-components/SearchableMultiSelect";
import { SECTIONS } from "../../../../constants";
import { toOrdinalLabel } from "../../../../utils/toOrdinalLabel";
import SelectDropdown from "../../../../custom-components/SelectDropdown";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  GENERATED_RESULT_CARDS_PATH,
  academicYears,
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
        {/*
          One row on a laptop. Every label is one 20px line (leading-5), so all
          the boxes start at the same height; exams and students get more room
          for their chips.
        */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1.8fr)] lg:items-start">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="resultYear"
              className="font-semibold leading-5 text-gray-700"
            >
              Academic Year
            </Label>
            <SelectDropdown
              id="resultYear"
              value={gen.selectedYear}
              onValueChange={(value) => {
                gen.handleYearChange(value);
                setExamIds([]);
              }}
              options={academicYears}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="resultClass"
              className="font-semibold leading-5 text-gray-700"
            >
              Class
            </Label>
            <SelectDropdown
              id="resultClass"
              value={gen.selectedClass}
              onValueChange={gen.handleClassChange}
              placeholder="Select class"
              options={gen.allowedClasses.map((className) => ({
                label: toOrdinalLabel(className),
                value: className,
              }))}
            />
          </div>

          <SearchableMultiSelect
            label="Exams"
            required
            options={examOptions}
            values={validExamIds}
            onChange={setExamIds}
            placeholder="Select exam(s)"
            searchPlaceholder="Search exam..."
            emptyMessage="No exam found for this year and class"
            maxChips={1}
          />

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="resultSection"
              className="font-semibold leading-5 text-gray-700"
            >
              Section
            </Label>
            <SelectDropdown
              id="resultSection"
              value={gen.selectedSection}
              onValueChange={gen.handleSectionChange}
              disabled={!gen.selectedClass}
              options={[
                { label: "All Sections", value: "" },
                ...SECTIONS.map((section) => ({
                  label: section,
                  value: section,
                })),
              ]}
            />
          </div>

          {/* Students: the "All" checkbox sits on the label line; with it on, the box is locked. */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold leading-5 text-gray-700">
                Students
              </span>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold leading-5 text-gray-700">
                <Checkbox
                  checked={gen.allStudents}
                  disabled={!gen.selectedClass}
                  onCheckedChange={(checked) =>
                    gen.handleSelectAllStudents(checked === true)
                  }
                />
                All
                {gen.selectedClass ? ` (${gen.visibleStudents.length})` : ""}
              </label>
            </div>
            <SearchableMultiSelect
              options={gen.studentOptions}
              values={gen.allStudents ? [] : gen.selectedEnrollments}
              onChange={gen.setSelectedEnrollments}
              placeholder={
                gen.allStudents
                  ? "All students of the class"
                  : "Select student(s)"
              }
              searchPlaceholder="Search name, father, enrollment..."
              loading={gen.loadingStudents}
              disabled={!gen.selectedClass || gen.allStudents}
              emptyMessage="No student found"
              maxChips={1}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            buttonName={
              studentCount > 1
                ? `Generate ${studentCount} Result Cards`
                : "Generate Result Card"
            }
            variant="cves"
            size="md"
            buttonStyle="rounded-full"
            disabled={!canGenerate}
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

export default ResultPanel;
