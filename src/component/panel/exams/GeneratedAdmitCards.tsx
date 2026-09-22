import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { FaPrint } from "react-icons/fa";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { useAdmitCardGenerator } from "./useAdmitCardGenerator";
import AdmitCardCard from "./AdmitCardCard";
import { ADMIT_CARD_PATH } from "./examScheduleShared";
import PageHeader from "../../../custom-components/PageHeader";
import Button from "../../../custom-components/Button";

/**
 * Shows the admit cards that were generated through the Admit Card hub modal.
 *
 * The whole selection (exam, year, class and student enrollments) travels in
 * the URL — ?exam=<id>&year=<value>&class=<name>&students=a,b,c (or
 * students=all) — so refreshing the page simply re-builds the same cards.
 * Print buttons at the top and bottom call the same window.print() flow used
 * by the old generator page.
 */
function GeneratedAdmitCards() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examId = searchParams.get("exam") ?? "";
  const year = searchParams.get("year") ?? "";
  const className = searchParams.get("class") ?? "";
  const studentsRaw = searchParams.get("students") ?? "";

  const allStudents = studentsRaw === "all";
  const enrollments = allStudents
    ? []
    : studentsRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

  const gen = useAdmitCardGenerator({
    initialExamId: examId,
    initialYear: year,
    initialClass: className,
    initialEnrollments: enrollments,
    allStudentsInitially: allStudents,
    autoGenerate: true,
  });

  const missingSelection =
    !examId || !className || (!allStudents && enrollments.length === 0);

  // Local copy so TypeScript narrows the (nullable) exam inside the card list.
  const selectedExam = gen.selectedExam;

  if (missingSelection) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-amber-300 bg-amber-50 p-6 text-center">
        <p className="font-bold text-amber-900">
          No admit card selection found in the URL.
        </p>
        <p className="mt-1 text-sm text-amber-800">
          Open the{" "}
          <NavLink to={ADMIT_CARD_PATH} className="underline">
            Admit Card
          </NavLink>{" "}
          page, pick an exam, class and student(s), then generate the cards
          again.
        </p>
      </div>
    );
  }

  const renderPrintButton = () => (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
    >
      <FaPrint />
      Print{gen.cards.length > 0 ? ` all ${gen.cards.length}` : ""}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl">
      {/* Top bar */}
      <div className="print:hidden">
      <PageHeader
        title="Admit Cards"
        titleStyle="text-primaryBlue"
        description={
          <p>
            {selectedExam ? selectedExam.examName : "Loading exam..."}
            {gen.selectedClass ? ` · ${toOrdinalLabel(gen.selectedClass)}` : ""}
            {gen.cards.length > 0 ? ` · ${gen.cards.length} student(s)` : ""}
          </p>
        }
        descriptionStyle="text-gray-500"
        button={<>{renderPrintButton()}</>}
      />
      </div>      

      {gen.generateError && gen.cards.length === 0 && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 print:hidden">
          {gen.generateError}
        </div>
      )}

      {gen.cards.length === 0 && !gen.generateError && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700 print:hidden">
          Preparing admit cards...
        </div>
      )}

      {/* The cards */}
      {selectedExam &&
        gen.cards.map((card) => (
          <AdmitCardCard
            key={card.id}
            card={card}
            exam={selectedExam}
            writtenPapers={gen.writtenPapers}
            practicalPapers={gen.practicalPapers}
          />
        ))}

      {/* Bottom bar */}
      <div className="mt-8 flex flex-wrap items-center justify-end gap-2 print:hidden">
        {renderPrintButton()}
      </div>
    </div>
  );
}

export default GeneratedAdmitCards;
