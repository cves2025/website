import { useEffect, useMemo, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
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
import { COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";

interface AttendanceSummary {
  attendancePresent: number;
  attendanceTotal: number;
}

function examPriority(examName: string): number {
  const name = examName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (/unit test 1\b/.test(name) || /unit test i\b/.test(name)) return 0;
  if (/half yearly|half year|halfyearly/.test(name)) return 1;
  if (/unit test 2\b/.test(name) || /unit test ii\b/.test(name)) return 2;
  if (/annual|yearly/.test(name)) return 3;
  return 99;
}

/** Printable result cards. The whole selection travels in the URL. */
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
    return allExams
      .filter((exam) => ids.includes(exam.id))
      .sort((a, b) => examPriority(a.examName) - examPriority(b.examName));
  }, [allExams, examsRaw]);
  const attendanceExam = useMemo(() => {
    const known = selectedExams.filter(
      (exam) => examPriority(exam.examName) < 99,
    );
    const candidates = known.length ? known : selectedExams;
    return candidates.length ? candidates[candidates.length - 1] : null;
  }, [selectedExams]);

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
    enrollments: [],
    allStudents: true,
  });
  const [attendanceByStudent, setAttendanceByStudent] = useState<
    Record<string, AttendanceSummary>
  >({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  useEffect(() => {
    if (!year || !className || !attendanceExam) {
      setAttendanceByStudent({});
      setAttendanceLoading(false);
      setAttendanceError("");
      return;
    }
    let active = true;
    setAttendanceLoading(true);
    setAttendanceError("");
    const filters = [
      where("session", "==", year),
      where("examId", "==", attendanceExam.id),
      where("className", "==", className),
    ];
    if (section && section !== "all")
      filters.push(where("section", "==", section));
    void getDocs(query(collection(db, COLLECTION.ATTENDANCE), ...filters))
      .then((snapshot) => {
        if (!active) return;
        const next: Record<string, AttendanceSummary> = {};
        snapshot.docs.forEach((attendanceDoc) => {
          const item = attendanceDoc.data();
          const studentUid = String(item.studentUid ?? "");
          if (
            !studentUid ||
            typeof item.presentDays !== "number" ||
            typeof item.totalDays !== "number"
          )
            return;
          next[studentUid] = {
            attendancePresent: item.presentDays,
            attendanceTotal: item.totalDays,
          };
        });
        setAttendanceByStudent(next);
      })
      .catch((error) => {
        console.error("Failed to load result-card attendance:", error);
        if (active) setAttendanceError("Attendance could not be loaded.");
      })
      .finally(() => {
        if (active) setAttendanceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [year, className, section, attendanceExam]);

  const sortedStudents = useMemo(
    () => [...students.cards].sort(compareStudentsByName),
    [students.cards],
  );

  const allResults = useMemo(
    () =>
      sortedStudents.map((card) => {
        const inputs = data.inputsFor(card.studentId);

        return {
          card,
          rollNo: rollNumberFromInputs(inputs),
          model: buildResultTable({
            className,
            inputs,
            rules,
          }),
        };
      }),
    [sortedStudents, data.inputsFor, className, rules],
  );

  const rankByStudent = useMemo(() => {
    const rankedStudents = allResults
      .filter(
        ({ model }) => model.grandTotals.hasMarks && model.grandTotals.max > 0,
      )
      .map(({ card, model }) => ({
        studentId: card.studentId,
        total: model.grandTotals.obtained,
      }))
      .sort((a, b) => b.total - a.total);

    const ranks: Record<string, number> = {};
    let previousTotal: number | null = null;
    let currentRank = 0;

    rankedStudents.forEach((student, index) => {
      if (student.total !== previousTotal) {
        currentRank = index + 1;
        previousTotal = student.total;
      }

      ranks[student.studentId] = currentRank;
    });

    return ranks;
  }, [allResults]);

  const results = useMemo(
    () =>
      allResults.filter(
        ({ card }) => allStudents || enrollments.includes(card.enrollment),
      ),
    [allResults, allStudents, enrollments],
  );

  const missingSelection =
    !examsRaw ||
    !className ||
    !year ||
    (!allStudents && enrollments.length === 0);
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

  const busy =
    data.loading || students.loading || loadingExams || attendanceLoading;
  const loadError = data.error || students.error || attendanceError;
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
              {attendanceExam
                ? ` · Attendance: ${attendanceExam.examName}`
                : ""}
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
            extras={{
              ...attendanceByStudent[card.studentId],
              rank: rankByStudent[card.studentId],
            }}
          />
        ))}
      <div className="mt-8 flex flex-wrap items-center justify-end gap-2 print:hidden">
        {renderPrintButton()}
      </div>
    </div>
  );
}

export default GeneratedResultCards;
