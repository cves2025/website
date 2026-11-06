import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";

import { EXAM_SCHEDULE_PATH } from "./examScheduleShared";
import PageHeader from "../../../custom-components/PageHeader";
import Button from "../../../custom-components/Button";
import Loader from "../../../custom-components/Loader";
import { CVES_BUTTON } from "../../../constants";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { compareStudentsByRoll } from "../../../utils/rollNumber";
import { useClassRollNumbers } from "../../../hooks/useClassRollNumbers";
import { useAdmitCardTemplate } from "../../../hooks/useAdmitCardTemplate";
import { TEMPLATE_COMPONENTS } from "./exam-settings/admit-card-template/admitCardTemplates";
import { useAdmitCardGenerator } from "./useAdmitCardGenerator";
import { SelectExamStep, GenerateAdmitCardStep } from "./AdmitCardSteps";

/**
 * Admit Card: the exam / class / student filters and the generated cards on
 * one page. The selection is kept in the URL (?exam=&year=&class=&section=&
 * students=a,b,c|all), so a refresh builds the same cards again. The older
 * /admit-card/generated page keeps working for links that point to it.
 */
function AdmitCard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selection restored from the URL (only read on the first render).
  const [initial] = useState(() => {
    const studentsRaw = searchParams.get("students") ?? "";
    const allStudents = studentsRaw === "all";
    const enrollments = allStudents
      ? []
      : studentsRaw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
    const examId = searchParams.get("exam") ?? "";
    const className = searchParams.get("class") ?? "";
    return {
      examId,
      year: searchParams.get("year") ?? "",
      className,
      section: searchParams.get("section") ?? "",
      enrollments,
      allStudents,
      complete: Boolean(examId && className && (allStudents || enrollments.length > 0)),
    };
  });

  const gen = useAdmitCardGenerator({
    initialExamId: initial.examId,
    initialYear: initial.year,
    initialClass: initial.className,
    initialSection: initial.section,
    initialEnrollments: initial.enrollments,
    allStudentsInitially: initial.allStudents,
    autoGenerate: initial.complete,
  });

  const [generating, setGenerating] = useState(false);
  // Cards being rebuilt from the URL on load; ends once they (or an error) arrive.
  const [restoring, setRestoring] = useState(initial.complete);
  useEffect(() => {
    if (restoring && (gen.cards.length > 0 || gen.generateError)) setRestoring(false);
  }, [restoring, gen.cards.length, gen.generateError]);

  const { templateId } = useAdmitCardTemplate();
  const CardTemplate = TEMPLATE_COMPONENTS[templateId];

  const {
    getRollNumber,
    loading: loadingRollNumbers,
    error: rollNumberError,
  } = useClassRollNumbers({
    academicYear: gen.selectedYear,
    classNames: gen.selectedClass ? [gen.selectedClass] : [],
  });

  const cards = useMemo(
    () => [...gen.cards].sort((a, b) => compareStudentsByRoll(a, b, getRollNumber)),
    [gen.cards, getRollNumber],
  );

  const studentCount = gen.allStudents ? gen.visibleStudents.length : gen.selectedEnrollments.length;
  const canGenerate = Boolean(gen.selectedExam) && Boolean(gen.selectedClass) && studentCount > 0;
  const selectedExam = gen.selectedExam;

  const handleGenerate = async () => {
    setRestoring(false);
    setGenerating(true);
    try {
      const ok = await gen.handleGenerate();
      if (!ok) return;
      // Keep the selection in the URL so a refresh shows the same cards.
      const params = new URLSearchParams();
      if (gen.selectedExamId) params.set("exam", gen.selectedExamId);
      if (gen.selectedYear) params.set("year", gen.selectedYear);
      if (gen.selectedClass) params.set("class", gen.selectedClass);
      if (gen.selectedSection) params.set("section", gen.selectedSection);
      if (gen.allStudents) params.set("students", "all");
      else if (gen.selectedEnrollments.length > 0) {
        params.set("students", gen.selectedEnrollments.join(","));
      }
      setSearchParams(params, { replace: true });
    } finally {
      setGenerating(false);
    }
  };

  const showCards = cards.length > 0 && Boolean(selectedExam);
  const preparing = generating || restoring;

  const printButton = (
    <button
      type="button"
      onClick={() => window.print()}
      disabled={loadingRollNumbers || !showCards}
      title={`Print all ${cards.length} admit card(s)`}
      aria-label={`Print all ${cards.length} admit card(s)`}
      className="grid h-[38px] w-[38px] place-items-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Printer className="h-5 w-5" />
    </button>
  );

  return (
    <div className="flex flex-col gap-3 print:m-0 print:block print:p-0">
      <div className="print:hidden">
        <PageHeader
          title="Admit Card"
          titleStyle="text-primaryBlue"
          description="Pick the exam, class and student(s), generate the admit cards below and print them. Prepare the papers on the Exam Schedule page first."
          descriptionStyle="text-gray-500"
          button={
            <Button
              buttonName="+ Exam Schedule"
              variant="cves"
              size="md"
              buttonStyle="rounded-full"
              onClick={() => navigate(EXAM_SCHEDULE_PATH)}
            />
          }
        />
      </div>

      {/* Filters: exam first, then class and students once an exam is picked */}
      <section className="rounded-lg border border-gray-200 bg-white px-4 pb-4 print:hidden">
        <SelectExamStep generator={gen} />
        {gen.selectedExamId && (
          <div className="mt-4 border-t border-gray-100">
            <GenerateAdmitCardStep generator={gen} />
          </div>
        )}
        {gen.selectedExamId && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!canGenerate || generating}
              onClick={() => void handleGenerate()}
              className={`rounded-md px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 ${CVES_BUTTON}`}
            >
              {generating
                ? "Generating..."
                : studentCount > 1
                  ? `Generate ${studentCount} Admit Cards`
                  : "Generate Admit Card"}
            </button>
          </div>
        )}
      </section>

      {/* Generated cards */}
      {rollNumberError && showCards && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 print:hidden">
          Roll numbers could not be loaded. The cards will show "-" for the roll number.
        </div>
      )}

      {(preparing || (showCards && loadingRollNumbers)) && (
        <Loader fullScreen={false} label="Preparing admit cards..." className="print:hidden" />
      )}

      {showCards && !loadingRollNumbers && !generating && selectedExam && (
        <section className="flex flex-col gap-3 print:block">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 print:hidden">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-800">{selectedExam.examName}</span>
              {gen.selectedClass ? ` · ${toOrdinalLabel(gen.selectedClass)}` : ""}
              {gen.selectedSection ? ` · Section ${gen.selectedSection}` : ""}
              {` · ${cards.length} student(s)`}
            </p>
            {printButton}
          </div>

          <div className="mx-auto w-full max-w-5xl print:max-w-none">
            {cards.map((card) => (
              <CardTemplate
                key={card.id}
                card={card}
                rollNo={getRollNumber(card.studentId, card.id)}
                exam={selectedExam}
                writtenPapers={gen.writtenPapers}
                practicalPapers={gen.practicalPapers}
              />
            ))}
          </div>

          <div className="flex justify-end print:hidden">{printButton}</div>
        </section>
      )}
    </div>
  );
}

export default AdmitCard;
