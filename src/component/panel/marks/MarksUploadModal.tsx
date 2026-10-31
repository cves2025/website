import {
  ChangeEvent,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CLASSES } from "../../../constants";
import { useExamRules } from "../../../hooks/useExamRules";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { formatMarks } from "../../../utils/marks";
import type { MarksSubjectColumn } from "../../../utils/marksEntry";
import { downloadMarksTemplate } from "../../../utils/marksTemplate";
import {
  buildUploadPlan,
  evaluateStudentWrite,
  parseMarksWorkbook,
  type CellState,
  type ParsedMarksSheet,
  type PlannedStudent,
  type StudentWrite,
} from "../../../utils/marksUpload";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import type { ExamDoc } from "../../../utils/type";
import {
  NO_SCOPE,
  PERMISSIONS,
  scopedClasses,
  subjectAccess,
} from "../../../permissions";
import Button from "../../../custom-components/Button";
import Modal from "../../../custom-components/Modal";
import { myContext } from "../../context/MyContextProvider";
import toast from "react-hot-toast";
import { useMarksUploadData } from "./useMarksUploadData";
import { useMarksUploadSave, type UploadSaveJob } from "./useMarksUploadSave";

const academicYears = generateAcademicYears();

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

type RowFilter = "all" | "attention" | "errors" | "conflicts";

const STATE_CLASS: Record<CellState, string> = {
  new: "bg-green-50 text-green-700",
  overwrite: "bg-amber-50 text-amber-800",
  same: "bg-gray-100 text-gray-600",
  kept: "bg-blue-50 text-blue-700",
};

const STATE_LABEL: Record<CellState, string> = {
  new: "new",
  overwrite: "overwrite",
  same: "same",
  kept: "kept",
};

function countStates(write: StudentWrite): Record<CellState, number> {
  const counts: Record<CellState, number> = {
    new: 0,
    overwrite: 0,
    same: 0,
    kept: 0,
  };
  Object.values(write.outcomes).forEach((outcome) => {
    counts[outcome.state] += 1;
  });
  if (write.attendance) counts[write.attendance.state] += 1;
  return counts;
}

interface MarksUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Exam templates already loaded by the Marks page. */
  exams: ExamDoc[];
}

function MarksUploadModal({ isOpen, onClose, exams }: MarksUploadModalProps) {
  const { user, can } = useContext(myContext);
  const scope = user?.scope ?? NO_SCOPE;
  const canEnter = can(PERMISSIONS.MARKS_ENTER);

  const rulesState = useExamRules();
  const rules = rulesState.rules;

  const [year, setYear] = useState(academicYears[0]?.value ?? "");
  const [examId, setExamId] = useState("");
  const [className, setClassName] = useState("");
  const [parsed, setParsed] = useState<ParsedMarksSheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [overwriteBy, setOverwriteBy] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<RowFilter>("all");
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});

  const clearFile = () => {
    setParsed(null);
    setFileName("");
    setParseError("");
    setOverwriteBy({});
    setFilter("all");
    setOpenRows({});
  };

  useEffect(() => {
    if (!isOpen) return;
    setYear(academicYears[0]?.value ?? "");
    setExamId("");
    setClassName("");
    clearFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const yearExams = exams.filter(
    (item) => item.status === "active" && item.academicYear === year,
  );
  const exam = yearExams.find((item) => item.id === examId) ?? null;
  const allowedClasses = scopedClasses(scope, CLASSES);
  const selectionReady = Boolean(
    year && exam && className && allowedClasses.includes(className),
  );

  const data = useMarksUploadData({
    session: year,
    exam: selectionReady ? exam : null,
    className: selectionReady ? className : "",
  });
  const rulesReady = !rulesState.loading && !rulesState.error;
  const dataReady =
    selectionReady && !data.loading && data.error === null && rulesReady;

  /** Per-section permission: edit rights differ between sections. */
  const canEditSubject = useCallback(
    (section: string, column: MarksSubjectColumn): boolean =>
      canEnter &&
      subjectAccess(scope, className, section, column.name) === "edit",
    [canEnter, scope, className],
  );

  const { writableSections, templateColumns } = useMemo(() => {
    const sections = Array.from(
      new Set(data.roster.map((student) => student.section)),
    );
    const writable = new Set(
      sections.filter((section) =>
        data.columns.some((column) => canEditSubject(section, column)),
      ),
    );
    const columns = data.columns.filter((column) =>
      Array.from(writable).some((section) => canEditSubject(section, column)),
    );
    return { writableSections: writable, templateColumns: columns };
  }, [data.roster, data.columns, canEditSubject]);

  const canUseTemplate =
    dataReady && data.roster.length > 0 && templateColumns.length > 0;

  const handleDownload = () => {
    if (!exam || !canUseTemplate) return;
    downloadMarksTemplate({
      session: year,
      exam,
      className,
      columns: templateColumns,
      students: data.roster
        .filter((student) => writableSections.has(student.section))
        .map((student) => ({
          admissionNumber: student.admissionNumber,
          studentName: student.studentName,
          fatherName: student.fatherName,
          section: student.section,
        })),
    });
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    clearFile();
    try {
      const result = await parseMarksWorkbook(file);
      setParsed(result);
      setFileName(file.name);
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "Could not read the file.",
      );
    }
  };

  const plan = useMemo(() => {
    if (!parsed || !exam || !dataReady) return null;
    return buildUploadPlan({
      parsed,
      session: year,
      exam,
      className,
      columns: data.columns,
      canEditSubject,
      roster: data.roster,
      savedMarks: data.savedMarks,
      savedAttendance: data.savedAttendance,
      includeAttendance: true,
      rules,
    });
  }, [
    parsed,
    exam,
    dataReady,
    year,
    className,
    data.columns,
    data.roster,
    data.savedMarks,
    data.savedAttendance,
    canEditSubject,
    rules,
  ]);

  const rows = useMemo(() => {
    if (!plan) return [];
    return plan.students.map((planned: PlannedStudent) => ({
      planned,
      write: evaluateStudentWrite(
        plan,
        planned,
        overwriteBy[planned.student?.studentUid ?? ""] === true,
      ),
    }));
  }, [plan, overwriteBy]);

  const counts = useMemo(() => {
    const result = { ready: 0, nothing: 0, errors: 0, conflicts: 0 };
    rows.forEach(({ planned, write }) => {
      if (planned.errors.length > 0) result.errors += 1;
      else if (write?.hasChanges) result.ready += 1;
      else result.nothing += 1;
      if (write?.hasConflict) result.conflicts += 1;
    });
    return result;
  }, [rows]);

  const { saving, progress, report, save, resetReport } = useMarksUploadSave({
    session: year,
    exam,
    className,
    columns: data.columns,
    rules,
  });

  // A new file, a new selection or reopening the modal clears the old report.
  useEffect(() => {
    resetReport();
  }, [parsed, year, examId, className, isOpen, resetReport]);

  const saveJobs = useMemo<UploadSaveJob[]>(() => {
    if (!plan) return [];
    return rows.flatMap(({ planned, write }) => {
      if (!planned.student || !write || !write.hasChanges) return [];
      return [
        {
          student: planned.student,
          write,
          rollNumber: data.rollNumbers.get(planned.student.studentUid) ?? 0,
          existed: Boolean(data.savedMarks[planned.student.studentUid]),
        },
      ];
    });
  }, [plan, rows, data.savedMarks, data.rollNumbers]);

  const handleSave = async () => {
    const result = await save(saveJobs);
    if (!result) return;
    setOverwriteBy({});
    data.reload();
    if (result.failed.length === 0) {
      toast.success(`Marks saved for ${result.saved} student(s).`);
    } else if (result.saved > 0) {
      toast.error(
        `${result.saved} saved, ${result.failed.length} failed. See the report.`,
      );
    } else {
      toast.error("Nothing could be saved. See the report.");
    }
  };

  const headerOf = useMemo(() => {
    const map = new Map<string, string>();
    if (!parsed) return map;
    parsed.keys.forEach((key, index) => {
      if (key) map.set(key, parsed.headers[index] || key);
    });
    return map;
  }, [parsed]);

  const visibleRows = rows.filter(({ planned, write }) => {
    if (filter === "errors") return planned.errors.length > 0;
    if (filter === "conflicts") return Boolean(write?.hasConflict);
    if (filter === "attention") {
      return (
        planned.errors.length > 0 ||
        planned.warnings.length > 0 ||
        Boolean(write?.hasConflict)
      );
    }
    return true;
  });

  const setAllOverwrite = (value: boolean) => {
    const next: Record<string, boolean> = {};
    rows.forEach(({ planned, write }) => {
      if (planned.student && write?.hasConflict) {
        next[planned.student.studentUid] = value;
      }
    });
    setOverwriteBy(next);
  };

  const fileProblems = plan?.fileProblems ?? [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => undefined : onClose}
      title="Upload Marks from Excel"
      description="Pick the exam and class, download the template, fill it and upload it. You see exactly what will be saved before anything is written."
      cancelText="Close"
      onSubmit={() => void handleSave()}
      submitText={saving ? "Saving..." : `Save ${counts.ready} student(s)`}
      submitDisabled={saving || counts.ready === 0 || !canEnter}
      hideSubmit={!plan || fileProblems.length > 0}
      modalClassName="max-w-6xl"
    >
      {!canEnter && (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          You do not have permission to enter marks.
        </p>
      )}

      {rulesState.error && (
        <div
          className="mt-4 flex items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>
            {rulesState.error} Upload is disabled until the settings load.
          </span>
          <Button
            buttonName="Retry"
            variant="outline"
            size="sm"
            onClick={rulesState.reload}
          />
        </div>
      )}

      {/* ---- Step 1: selection --------------------------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Academic Year
          </label>
          <select
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setExamId("");
              clearFile();
            }}
            className={inputClass}
          >
            {academicYears.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Exam
          </label>
          <select
            value={examId}
            onChange={(event) => {
              setExamId(event.target.value);
              clearFile();
            }}
            className={inputClass}
          >
            <option value="">Select Exam</option>
            {yearExams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.examName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Class Name
          </label>
          <select
            value={className}
            onChange={(event) => {
              setClassName(event.target.value);
              clearFile();
            }}
            className={inputClass}
          >
            <option value="">Select Class</option>
            {allowedClasses.map((item) => (
              <option key={item} value={item}>
                {toOrdinalLabel(item)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectionReady ? (
        <p className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          Select the academic year, exam and class. Every section of the class
          is covered by one file.
        </p>
      ) : data.loading ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Loading students, subjects and saved marks...
        </div>
      ) : data.error ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <span>{data.error}</span>
          <Button
            buttonName="Retry"
            variant="outline"
            size="sm"
            onClick={data.reload}
          />
        </div>
      ) : data.roster.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No students found for this class and academic year.
        </p>
      ) : data.columns.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No subject is enabled for marks entry in this class.
        </p>
      ) : templateColumns.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No subject is assigned to you for this class.
        </p>
      ) : (
        <>
          {/* ---- Step 2 and 3: template + file -------------------------- */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-4">
            <Button
              buttonName="1. Download Template"
              variant="outline"
              size="sm"
              onClick={handleDownload}
            />
            <label className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
              2. Choose Filled File
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFile}
              />
            </label>
            {fileName && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                {fileName}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {
                data.roster.filter((s) => writableSections.has(s.section))
                  .length
              }{" "}
              student(s) in the template
            </span>
          </div>

          {parseError && (
            <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {parseError}
            </p>
          )}

          {fileProblems.length > 0 && (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {fileProblems.map((problem) => (
                <p key={problem}>{problem}</p>
              ))}
              <p className="mt-1 font-normal">
                Download the template for the selected exam and class and fill
                that file.
              </p>
            </div>
          )}

          {/* ---- Step 4: preview --------------------------------------- */}
          {/* ---- Step 4: preview --------------------------------------- */}
          {plan && fileProblems.length === 0 && (
            <div className="mt-4">
              {saving && (
                <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-sm font-semibold text-blue-700">
                    Saving {progress.done} of {progress.total} student(s)...
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{
                        width: `${
                          progress.total === 0
                            ? 0
                            : Math.round((progress.done / progress.total) * 100)
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {report && (
                <div
                  className={`mb-3 rounded-md border px-4 py-3 text-sm ${
                    report.failed.length === 0
                      ? "border-green-300 bg-green-50 text-green-800"
                      : "border-red-300 bg-red-50 text-red-700"
                  }`}
                  role="status"
                >
                  <p className="font-semibold">
                    {report.saved} student(s) saved
                    {report.failed.length > 0
                      ? `, ${report.failed.length} failed.`
                      : "."}
                  </p>
                  {report.failed.map((item) => (
                    <p key={`${item.admissionNumber}-${item.studentName}`}>
                      {item.admissionNumber} - {item.studentName}: {item.reason}
                    </p>
                  ))}
                  {report.warnings.map((text) => (
                    <p key={text} className="text-amber-800">
                      {text}
                    </p>
                  ))}
                  {report.failed.length > 0 && (
                    <p className="mt-1 font-normal">
                      The preview below is refreshed. Failed students show as
                      &quot;Ready&quot; again, so you can press Save once more.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["Rows in file", rows.length, "text-gray-800"],
                  ["Ready to save", counts.ready, "text-green-700"],
                  ["Nothing to save", counts.nothing, "text-gray-600"],
                  ["Skipped (errors)", counts.errors, "text-red-700"],
                  ["Not in file", plan.notInFile.length, "text-amber-700"],
                ].map(([label, value, color]) => (
                  <div
                    key={String(label)}
                    className="rounded-md border border-gray-200 bg-white px-3 py-2"
                  >
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {plan.ignoredColumns.length > 0 && (
                <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                  <p className="font-bold">Columns that are not used:</p>
                  {plan.ignoredColumns.map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as RowFilter)
                  }
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="all">All rows</option>
                  <option value="attention">Needs attention</option>
                  <option value="errors">Errors only</option>
                  <option value="conflicts">Existing marks only</option>
                </select>
                {counts.conflicts > 0 && (
                  <>
                    <span className="text-sm text-gray-600">
                      {counts.conflicts} student(s) already have different
                      marks:
                    </span>
                    <button
                      type="button"
                      onClick={() => setAllOverwrite(true)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Overwrite all
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllOverwrite(false)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Fill empty only (all)
                    </button>
                  </>
                )}
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-left text-white">
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Enrollment</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Sec</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-center">Overwrite</th>
                      <th className="px-3 py-2">Changes</th>
                      <th className="px-3 py-2">Total after upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(({ planned, write }) => {
                      const uid = planned.student?.studentUid ?? "";
                      const hasErrors = planned.errors.length > 0;
                      const states = write ? countStates(write) : null;
                      const isRowOpen = openRows[planned.rowNumber] === true;
                      const detailItems = write
                        ? [
                            ...Object.values(write.outcomes),
                            ...(write.attendance ? [write.attendance] : []),
                          ]
                        : [];
                      return (
                        <Fragment key={planned.rowNumber}>
                          <tr
                            className={
                              hasErrors
                                ? "border-t bg-red-50"
                                : "border-t bg-white"
                            }
                          >
                            <td className="px-3 py-2 text-gray-500">
                              {planned.rowNumber}
                            </td>
                            <td className="px-3 py-2">
                              {planned.enrollment || "-"}
                            </td>
                            <td className="px-3 py-2">
                              {planned.student?.studentName ??
                                (planned.sheetName || "-")}
                            </td>
                            <td className="px-3 py-2">
                              {planned.student?.section || "-"}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {hasErrors ? (
                                <span className="text-red-700">Skipped</span>
                              ) : write?.hasChanges ? (
                                <span className="text-green-700">Ready</span>
                              ) : (
                                <span className="text-gray-500">
                                  Nothing to save
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {write?.hasConflict ? (
                                <input
                                  type="checkbox"
                                  checked={overwriteBy[uid] === true}
                                  disabled={saving}
                                  onChange={(event) =>
                                    setOverwriteBy((previous) => ({
                                      ...previous,
                                      [uid]: event.target.checked,
                                    }))
                                  }
                                  title="Replace the saved marks of this student with the file's values"
                                />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {states ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {(Object.keys(states) as CellState[])
                                    .filter((state) => states[state] > 0)
                                    .map((state) => (
                                      <span
                                        key={state}
                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_CLASS[state]}`}
                                      >
                                        {states[state]} {STATE_LABEL[state]}
                                      </span>
                                    ))}
                                  {detailItems.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenRows((previous) => ({
                                          ...previous,
                                          [planned.rowNumber]: !isRowOpen,
                                        }))
                                      }
                                      className="ml-1 text-xs font-semibold text-blue-700 underline"
                                    >
                                      {isRowOpen ? "hide" : "details"}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {write?.hasChanges
                                ? `${formatMarks(write.summary.totalMarks)} / ${formatMarks(
                                    write.summary.totalMaxMarks,
                                  )} (${formatMarks(write.summary.percentage)}%) ${write.summary.result.toUpperCase()}`
                                : "-"}
                            </td>
                          </tr>
                          {(planned.errors.length > 0 ||
                            planned.warnings.length > 0 ||
                            (isRowOpen && detailItems.length > 0)) && (
                            <tr
                              className={hasErrors ? "bg-red-50" : "bg-white"}
                            >
                              <td colSpan={8} className="px-3 pb-2 text-xs">
                                {planned.errors.map((text) => (
                                  <p key={text} className="text-red-700">
                                    {text}
                                  </p>
                                ))}
                                {planned.warnings.map((text) => (
                                  <p key={text} className="text-amber-700">
                                    {text}
                                  </p>
                                ))}
                                {isRowOpen &&
                                  detailItems.map((item) => (
                                    <p key={item.key} className="text-gray-700">
                                      <span
                                        className={`mr-2 rounded-full px-2 py-0.5 font-semibold ${STATE_CLASS[item.state]}`}
                                      >
                                        {STATE_LABEL[item.state]}
                                      </span>
                                      {item.key === "attendance"
                                        ? "Attendance"
                                        : (headerOf.get(item.key) ?? item.key)}
                                      : {item.existing || "-"} → {item.incoming}
                                    </p>
                                  ))}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {plan.notInFile.length > 0 && (
                <details className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
                  <summary className="cursor-pointer font-semibold text-gray-700">
                    {plan.notInFile.length} student(s) of the class are not in
                    the file (nothing will change for them)
                  </summary>
                  <div className="mt-2 text-xs text-gray-600">
                    {plan.notInFile.map((student) => (
                      <p key={student.studentUid}>
                        {student.admissionNumber} - {student.studentName} (Sec{" "}
                        {student.section || "-"})
                      </p>
                    ))}
                  </div>
                </details>
              )}

              <p className="mt-3 text-xs text-gray-500">
                Students with an error are skipped completely. Empty cells never
                change saved marks.
              </p>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export default MarksUploadModal;
