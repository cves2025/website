import { useMemo } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { FaPrint } from "react-icons/fa";
import PageHeader from "../../../custom-components/PageHeader";
import { useExamRules } from "../../../hooks/useExamRules";
import { useResultCardData } from "../../../hooks/useResultCardData";
import { compareStudentsByName } from "../../../utils/rollNumber";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import {
  buildResultTable,
  rollNumberFromInputs,
} from "../../../utils/resultCardModel";
import { ADMIT_CARD_PATH, useExamTemplates } from "./examScheduleShared";
import { useResultCardStudents } from "./useResultCardStudents";
import ResultCard from "./result/ResultCard";

/**
 * Printable result cards. The whole selection travels in the URL:
 * ?exams=a,b&year=2026-27&class=2&section=A&students=a,b,c (or students=all)
 */
function GeneratedResultCards() {
  const [searchParams] = useSearchParams();
  const examsRaw = searchParams.get("exams") ?? "";
  const year = searchParams.get("year") ?? "";
  const className = searchParams.get("class") ?? "";
  const section = searchParams.get("section") ?? "";
  const studentsRaw = searchParams.get("students") ?? "";

  const allStudents = studentsRaw === "all";
  const enrollments = allStudents
    ? []
    : studentsRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

  const { exams: allExams, loadingExams } = useExamTemplates();
  const selectedExams = useMemo(() => {
    const ids = examsRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return allExams.filter((exam) => ids.includes(exam.id));
  }, [allExams, examsRaw]);

  const { rules, error: rulesError } = useExamRules();
  const data = useResultCardData({
    session: year,
    className,
    section,
    exams: selectedExams,
  });
  const students = useResultCardStudents({
    year,
    className,
    section,
    enrollments,
    allStudents,
  });

  const sortedStudents = useMemo(
    () => [...students.cards].sort(compareStudentsByName),
    [students.cards]
  );

  // The class name of the URL is used (not the student's stored spelling), so
  // a "5th" spelling can never pick the wrong card layout.
  const results = useMemo(
    () =>
      sortedStudents.map((card) => {
        const inputs = data.inputsFor(card.studentId);
        return {
          card,
          rollNo: rollNumberFromInputs(inputs),
          model: buildResultTable({ className, inputs, rules }),
        };
      }),
    [sortedStudents, data.inputsFor, className, rules]
  );

  const missingSelection =
    !examsRaw || !className || !year || (!allStudents && enrollments.length === 0);

  if (missingSelection) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-amber-300 bg-amber-50 p-6 text-center">
        <p className="font-bold text-amber-900">
          No result card selection found in the URL.
        </p>
        <p className="mt-1 text-sm text-amber-800">
          Open the{" "}
          <NavLink to={ADMIT_CARD_PATH} className="underline">
            Admit Card
          </NavLink>{" "}
          page, choose exams, class and student(s), then generate again.
        </p>
      </div>
    );
  }

  const busy = data.loading || students.loading || loadingExams;
  const loadError = data.error || students.error;

  const renderPrintButton = () => (
    <button
      type="button"
      onClick={() => window.print()}
      disabled={busy || results.length === 0}
      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FaPrint />
      Print{results.length > 0 ? ` all ${results.length}` : ""}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl print:m-0 print:max-w-none print:p-0">
      <div className="print:hidden">
        <PageHeader
          title="Result Cards"
          titleStyle="text-primaryBlue"
          description={
            <p>
              {selectedExams.map((exam) => exam.examName).join(", ") ||
                "Loading exams..."}
              {className ? ` · ${toOrdinalLabel(className)}` : ""}
              {section ? ` · Section ${section}` : ""}
              {results.length > 0 ? ` · ${results.length} student(s)` : ""}
            </p>
          }
          descriptionStyle="text-gray-500"
          button={<>{renderPrintButton()}</>}
        />
      </div>

      {(loadError || rulesError) && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 print:hidden">
          {loadError || rulesError}{" "}
          {loadError && (
            <button type="button" onClick={data.reload} className="underline">
              Retry
            </button>
          )}
        </div>
      )}

      {busy && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700 print:hidden">
          Preparing result cards...
        </div>
      )}

      {!busy && !loadError && results.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-6 text-center text-sm font-semibold text-amber-800 print:hidden">
          No student found for this selection.
        </div>
      )}

      {!busy &&
        results.map(({ card, rollNo, model }) => (
          <ResultCard
            key={card.id}
            card={card}
            rollNo={rollNo}
            academicYear={year}
            model={model}
          />
        ))}

      <div className="mt-8 flex flex-wrap items-center justify-end gap-2 print:hidden">
        {renderPrintButton()}
      </div>
    </div>
  );
}

export default GeneratedResultCards;