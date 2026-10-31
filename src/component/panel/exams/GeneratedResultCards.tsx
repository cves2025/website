import { useContext, useEffect, useMemo, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { FaPrint } from "react-icons/fa";
import PageHeader from "../../../custom-components/PageHeader";
import { useExamRules } from "../../../hooks/useExamRules";
import { useResultCardData } from "../../../hooks/useResultCardData";
import { useClassRollNumbers } from "../../../hooks/useClassRollNumbers";
import { compareStudentsByRoll } from "../../../utils/rollNumber";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { buildResultTable } from "../../../utils/resultCardModel";
import { ADMIT_CARD_PATH, useExamTemplates } from "./examScheduleShared";
import { useResultCardStudents } from "./useResultCardStudents";
import ResultCard from "./result/ResultCard";
import { CLASSES, COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import { useSuggestedRemarks } from "../../../hooks/useSuggestedRemarks";
import { myContext } from "../../context/MyContextProvider";
import { NO_SCOPE, scopedClasses } from "../../../permissions";

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

  // A teacher can only ever generate result cards of their own classes, even
  // if this URL (built from the Result page's selection) is edited by hand.
  const { user } = useContext(myContext);
  const scope = user?.scope ?? NO_SCOPE;
  const isAdmin = scope.kind === "all";
  const allowedClasses = scopedClasses(scope, CLASSES);
  const classAllowed = isAdmin || allowedClasses.includes(className);
  const effectiveClassName = classAllowed ? className : "";

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
  const {
    getRemark,
    loading: remarksLoading,
    error: remarksError,
    getDistributionDate,
  } = useSuggestedRemarks();

  const data = useResultCardData({
    session: year,
    className: effectiveClassName,
    section,
    exams: selectedExams,
  });
  const students = useResultCardStudents({
    year,
    className: effectiveClassName,
    section,
    enrollments: [],
    allStudents: true,
  });

  const {
    getRollNumber,
    loading: rollNumbersLoading,
    error: rollNumbersError,
  } = useClassRollNumbers({
    academicYear: year,
    classNames: effectiveClassName ? [effectiveClassName] : [],
  });

  const [attendanceByStudent, setAttendanceByStudent] = useState<
    Record<string, AttendanceSummary>
  >({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  const distributionDate = useMemo(() => {
    const ordered = [
      ...(attendanceExam ? [attendanceExam] : []),
      ...[...selectedExams].reverse(),
    ];
    for (const exam of ordered) {
      const value = getDistributionDate(exam.id);
      if (value) return value;
    }
    return "";
  }, [attendanceExam, selectedExams, getDistributionDate]);

  useEffect(() => {
    if (!year || !effectiveClassName || !attendanceExam) {
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
      where("className", "==", effectiveClassName),
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
  }, [year, effectiveClassName, section, attendanceExam]);

  const sortedStudents = useMemo(
    () =>
      [...students.cards].sort((a, b) =>
        compareStudentsByRoll(a, b, getRollNumber),
      ),
    [students.cards, getRollNumber],
  );

  const allResults = useMemo(
    () =>
      sortedStudents.map((card) => {
        const inputs = data.inputsFor(card.studentId);

        return {
          card,
          rollNo: getRollNumber(card.studentId, card.id),
          model: buildResultTable({
            className,
            inputs,
            rules,
          }),
        };
      }),
    [sortedStudents, data.inputsFor, className, rules, getRollNumber],
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

  if (className && !classAllowed) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-red-300 bg-red-50 p-6 text-center">
        <p className="font-bold text-red-900">
          You don&apos;t have access to this class.
        </p>
        <p className="mt-1 text-sm text-red-800">
          Result cards can only be generated for the classes assigned to you.
        </p>
      </div>
    );
  }

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
    data.loading ||
    students.loading ||
    loadingExams ||
    attendanceLoading ||
    remarksLoading ||
    rollNumbersLoading;
  const loadError =
    data.error || students.error || attendanceError || remarksError;
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
      {rollNumbersError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 print:hidden">
          Roll numbers could not be loaded. The cards will show "-" for the roll
          number.
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
              remarks: model.grandTotals.hasMarks
                ? getRemark(attendanceExam?.id, model.grandTotals.percentage)
                : "",
              resultDate: distributionDate,
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
