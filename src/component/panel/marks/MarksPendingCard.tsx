/**
 * Dashboard card: how far the marks entry of an exam of the current session
 * is, per class + section - complete, in progress (which subjects still
 * miss marks) or not started. Admins see the whole school, a teacher only
 * the classes and subjects they teach (and their class-teacher classes).
 * Reads one progress document per exam (kept by saveStudentMarks), plus
 * student counts for sections it does not know yet.
 */
import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";

import { ADMISSION_SECTIONS, MARKS_PATH } from "../../../constants";
import CustomSelect from "../../../custom-components/CustomSelect";
import { Spinner } from "../../../custom-components/Loader";
import { useExamList } from "../../../hooks/useExamList";
import useMarksProgress from "../../../hooks/useMarksProgress";
import { NO_SCOPE, PERMISSIONS, scopedSections, subjectAccess } from "../../../permissions";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { todayKey } from "../../../utils/holidayCalendar";
import { marksPendingRows } from "../../../utils/marksProgress";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import type { ExamDoc, MarksPendingRow } from "../../../utils/type";
import { myContext } from "../../context/MyContextProvider";

const sessions = generateAcademicYears();
/** The latest session (the list runs oldest first). */
const currentSession = sessions[sessions.length - 1]?.value ?? "";

const cardClass =
  "flex flex-col rounded-3xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(17,24,39,0.22)] md:p-7";

/** Exams of the session whose marks may be entered now (active, started). */
function startedExams(exams: readonly ExamDoc[]): ExamDoc[] {
  const today = todayKey();
  return exams
    .filter(
      (exam) =>
        exam.academicYear === currentSession &&
        exam.status === "active" &&
        exam.applicableClasses.length > 0 &&
        (!exam.examStartDate || exam.examStartDate <= today)
    )
    .sort((a, b) => (b.examStartDate || "").localeCompare(a.examStartDate || ""));
}

const rowLabel = (row: MarksPendingRow) => {
  const name = `${toOrdinalLabel(row.className)} ${row.section}`;
  if (row.status === "notStarted") return `${name} - Not started`;
  return `${name} - ${row.pending.map((item) => `${item.name} (${item.missing})`).join(", ")}`;
};

/** "Pending (N)": the classes still missing marks; one opens its marks sheet. */
function PendingList({ rows, examId }: { rows: MarksPendingRow[]; examId: string }) {
  const navigate = useNavigate();
  const { control, reset } = useForm<{ row: string }>({ defaultValues: { row: "" } });
  const pending = rows.filter((row) => row.status !== "complete");

  if (pending.length === 0) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        All entered
      </span>
    );
  }

  return (
    // The turning school-colour ring shows something is still missing.
    <div className="relative w-full overflow-hidden rounded-lg p-[2px]">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-[200%] animate-[spin_2.5s_linear_infinite] bg-[conic-gradient(from_0deg,#009746,#393186,#e7087e,#e31e25,#009746)] motion-reduce:animate-none"
      />
      <div className="relative rounded-[6px] bg-white">
        <CustomSelect
          control={control}
          name="row"
          placeholder={`Pending (${pending.length}) - open a class`}
          options={pending.map((row) => ({ value: `${row.className}|${row.section}`, label: rowLabel(row) }))}
          searchable
          searchPlaceholder="Class or subject"
          onValueChange={(value) => {
            const [className, section] = value.split("|");
            reset({ row: "" });
            navigate(
              `${MARKS_PATH}?${new URLSearchParams({ session: currentSession, exam: examId, class: className, section }).toString()}`
            );
          }}
          className="border-0 py-1.5 font-semibold data-[placeholder]:text-gray-800"
        />
      </div>
    </div>
  );
}

function MarksSummary({ exams }: { exams: ExamDoc[] }) {
  const { user } = useContext(myContext);
  const scope = user?.scope ?? NO_SCOPE;
  const isAdmin = scope.kind === "all";

  // The exam (the latest one started by default).
  const { control, watch } = useForm<{ examId: string }>({ defaultValues: { examId: exams[0]?.id ?? "" } });
  const examId = watch("examId");
  const exam = exams.find((item) => item.id === examId) ?? exams[0];

  // A teacher only follows the classes they teach or look after.
  const classes = useMemo(
    () =>
      (exam?.applicableClasses ?? []).filter(
        (className) => isAdmin || scopedSections(scope, className, ADMISSION_SECTIONS).length > 0
      ),
    [exam, isAdmin, scope]
  );
  const { progress, studentsOf, loading, error } = useMarksProgress(
    currentSession,
    exam?.id ?? "",
    classes,
    ADMISSION_SECTIONS,
    Boolean(exam)
  );

  const rows = loading
    ? []
    : marksPendingRows({
        progress,
        classes,
        sections: ADMISSION_SECTIONS,
        studentsOf,
        seesSection: (className, section) =>
          isAdmin || scopedSections(scope, className, ADMISSION_SECTIONS).includes(section),
        seesSubject: (className, section, subject) =>
          isAdmin || subjectAccess(scope, className, section, subject) === "edit",
      });
  const count = (status: MarksPendingRow["status"]) => rows.filter((row) => row.status === status).length;
  const pendingCount = rows.length - count("complete");
  const missingMarks = rows.reduce((total, row) => total + row.missingMarks, 0);
  const value = (number: number) => (loading ? <Spinner size="sm" label="" className="my-1" /> : number);

  const tiles = [
    { value: count("complete"), label: "Complete", className: "bg-[#e4f4ea]" },
    { value: count("progress"), label: "In progress", className: "bg-[#fff0dc]" },
    { value: count("notStarted"), label: "Not started", className: "bg-[#fce7e7]" },
    { value: missingMarks, label: "Marks left", className: "bg-[#e8ecf7]" },
  ];

  return (
    <>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">Marks Entry</h3>
        <div className="w-44">
          <CustomSelect
            control={control}
            name="examId"
            placeholder={null}
            options={exams.map((item) => ({ value: item.id, label: item.examName }))}
            className="py-1.5"
          />
        </div>
      </div>

      <div className="mt-3 flex h-12 items-center text-5xl font-extrabold leading-none tracking-tight text-gray-900 tabular-nums">
        {loading ? <Spinner size="md" label="Loading marks progress" /> : pendingCount}
      </div>
      <p className="mt-2 min-h-5 text-sm text-gray-600">
        {error ? (
          <span className="text-red-600">{error}</span>
        ) : loading ? (
          "Checking the marks entry..."
        ) : rows.length === 0 ? (
          isAdmin ? "No students in the classes of this exam." : "None of your classes take this exam."
        ) : (
          `${pendingCount === 1 ? "class" : "classes"} still missing marks · ${count("complete")} of ${rows.length} complete`
        )}
      </p>

      <div className="mt-4">{!loading && !error && rows.length > 0 && exam && <PendingList rows={rows} examId={exam.id} />}</div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className={`rounded-xl px-4 py-2.5 ${tile.className}`}>
            <div className="flex h-8 items-center text-2xl font-bold text-gray-900 tabular-nums">{value(tile.value)}</div>
            <p className="text-sm text-gray-600">{tile.label}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/** The card itself (reads the exams). */
function MarksCard({ className }: { className: string }) {
  const { exams, loadingExam } = useExamList();
  const started = useMemo(() => startedExams(exams), [exams]);

  return (
    <section className={`${cardClass} ${className}`}>
      {loadingExam ? (
        <>
          <h3 className="text-lg font-bold text-gray-900">Marks Entry</h3>
          <div className="flex justify-center py-8">
            <Spinner size="md" label="Loading exams" />
          </div>
        </>
      ) : started.length === 0 ? (
        <>
          <h3 className="text-lg font-bold text-gray-900">Marks Entry</h3>
          <p className="py-6 text-base text-gray-500">No exam of {currentSession} has started yet.</p>
        </>
      ) : (
        <MarksSummary key={started.map((exam) => exam.id).join(",")} exams={started} />
      )}
    </section>
  );
}

/** Dashboard card for admins and for teachers who enter or see marks (nothing is read otherwise). */
function MarksPendingCard({ className = "" }: { className?: string }) {
  const { user, can } = useContext(myContext);
  const isAdmin = user?.scope?.kind === "all";
  const allowed = isAdmin || can(PERMISSIONS.MARKS_ENTER) || can(PERMISSIONS.MARKS_VIEW);
  return allowed ? <MarksCard className={className} /> : null;
}

export default MarksPendingCard;
