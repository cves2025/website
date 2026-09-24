import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { FaTrash } from "react-icons/fa";
import { COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { marksSchemeBadge } from "../../../utils/examMarksScheme";
import { ScheduleRow } from "../../../utils/type";
import {
  ADD_EXAM_PATH,
  academicYears,
  findPaperClassClashes,
  findScheduleRowProblems,
  formatScheduleDate,
  formatSubjectWithType,
  inputClass,
  newRowId,
  paperKeyOfRow,
  rowClassScope,
  scheduleRowName,
  useExamScheduleDraft,
  useExamTemplates,
  useRequestedExam,
  useRequestedExamYear,
  useSubjectOptions,
} from "./examScheduleShared";
import PageHeader from "../../../custom-components/PageHeader";
import Button from "../../../custom-components/Button";

/**
 * One subject dropdown option: a subject name combined with one of its types
 * (e.g. "English (Written)"). `type` is empty for legacy subjects that were
 * saved without a type.
 */
interface SubjectChoice {
  /** Value used by the dropdown, e.g. "English (Written)". */
  value: string;
  /** Subject name without the type, e.g. "English". */
  name: string;
  /** Subject type, e.g. "Written". */
  type: string;
}

/**
 * Exam Schedule page (step 1 of the Admit Card module).
 *
 * The schedule of one exam is edited here and saved against the exam id, so the
 * admit card flow can print the same papers later.
 */
function ExamSchedule() {
  /* ---------------------------------------------------------------- exams */
  const { exams, loadingExams } = useExamTemplates();
  // A link from the other Admit Card pages can carry ?exam=<id>&year=<value>.
  const { examId: requestedExamId, academicYear: requestedYear } =
    useRequestedExam();
  const [selectedYear, setSelectedYear] = useState(
    requestedYear || academicYears[0]?.value || ""
  );
  const [selectedExamId, setSelectedExamId] = useState(requestedExamId);

  /* ------------------------------------------------------------- subjects */
  const { subjectOptions, loadingSubjects, classesOfSubject, classesOfSubjectType } =
    useSubjectOptions();

  /* One dropdown option per <subject name, type> pair. A subject like English
     that is created with several types (Written, Oral, Written + Oral, ...)
     shows one option for each, e.g. "English (Written)". */
  const { subjectChoices, subjectByValue } = useMemo(() => {
    // Types in the same order the Subjects page lists them.
    const TYPE_ORDER = [
      "Written",
      "Oral",
      "Written + Oral",
      "Theory",
      "Practical",
      "Scholastic",
    ];
    const typeRank = (type: string) => {
      const index = TYPE_ORDER.indexOf(type);
      return index === -1 ? TYPE_ORDER.length : index;
    };

    const choices: SubjectChoice[] = [];
    const byValue = new Map<string, SubjectChoice>();
    subjectOptions.forEach((option) => {
      const types =
        option.types.length > 0
          ? [...option.types].sort((a, b) => typeRank(a) - typeRank(b))
          : [""];
      types.forEach((type) => {
        const value = formatSubjectWithType(option.name, type);
        const choice: SubjectChoice = { value, name: option.name, type };
        choices.push(choice);
        byValue.set(value, choice);
      });
    });
    return { subjectChoices: choices, subjectByValue: byValue };
  }, [subjectOptions]);

  /* Classes a scheduled paper applies to: only classes teaching the exact
     subject + type when a type was picked, otherwise every class of the subject
     (legacy rows saved before types existed). */
  const rowClassesOf = (subjectName: string, subjectType: string): string[] =>
    subjectType.trim()
      ? classesOfSubjectType(subjectName, subjectType)
      : classesOfSubject(subjectName);

  /* Classes that teach the paper of one row (used by the "All classes" mode and
     by the clash checks below). */
  const subjectClassesOfRow = (row: ScheduleRow): string[] =>
    rowClassesOf(row.subject, row.subjectType);

  /* ------------------------------------------------------------- schedule */
  const { rows, setRows, loadingSchedule, scheduleCreatedAt } =
    useExamScheduleDraft(selectedExamId);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleErrors, setScheduleErrors] = useState<string[]>([]);
  const navigate = useNavigate();

  /* Keeps the year filter aligned with the exam asked for in the URL. */
  useRequestedExamYear(requestedExamId, exams, loadingExams, setSelectedYear);

  /* ------------------------------------------------------------ derived -- */
  const yearExams = useMemo(
    () =>
      exams.filter(
        (exam) =>
          exam.status === "active" &&
          (!selectedYear || exam.academicYear === selectedYear)
      ),
    [exams, selectedYear]
  );

  const selectedExam =
    yearExams.find((exam) => exam.id === selectedExamId) ?? null;

  /* One class that two papers of the same subject + type both cover. The same
     paper may be scheduled several times - normally for another group of classes
     on another date (Science (Theory) for UKG on 10 Jan, for class 5 on 12 Jan) -
     but no class may receive it twice, or its admit card would show two dates for
     one paper. Recomputed on every render on purpose: the subjects list decides
     which classes the "All classes" mode covers. */
  const paperClashes = findPaperClassClashes(rows, subjectClassesOfRow);

  /* ----------------------------------------------------------- handlers -- */
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: newRowId(),
        subject: "",
        subjectType: "",
        // Prefill with the exam window start so most rows need no typing.
        date: selectedExam?.examStartDate || "",
        fromTime: "",
        toTime: "",
        allClasses: true,
        classes: [],
      },
    ]);
  };

  const handleRowChange = (id: string, patch: Partial<ScheduleRow>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (patch.subject !== undefined) {
          // The dropdown value is "Name (Type)"; split it back into the plain
          // subject name and its type so the admit card prints exactly the
          // selected paper (e.g. "English" -> Written).
          const choice = patch.subject
            ? subjectByValue.get(patch.subject)
            : undefined;
          if (choice) {
            const samePaper = (other: ScheduleRow) =>
              other.id !== id &&
              paperKeyOfRow(other) ===
                paperKeyOfRow({
                  ...row,
                  subject: choice.name,
                  subjectType: choice.type,
                });

            /* Classes another paper of the same subject + type already covers
               (e.g. Science (Theory) scheduled for UKG on 10 Jan). */
            const coveredClasses = new Set<string>();
            prev.filter(samePaper).forEach((other) =>
              rowClassScope(
                other,
                rowClassesOf(other.subject, other.subjectType)
              ).forEach((className) => coveredClasses.add(className))
            );

            /* When the paper is already scheduled for some classes, this new
               paper starts on the classes that are still free, so only its own
               date has to be filled in. When no class is free (or none is known
               yet) the row keeps the "All classes" default and the clash warning
               asks the user to split the class groups. */
            const freeClasses = rowClassesOf(choice.name, choice.type).filter(
              (className) => !coveredClasses.has(className)
            );
            if (coveredClasses.size > 0 && freeClasses.length > 0) {
              return {
                ...row,
                subject: choice.name,
                subjectType: choice.type,
                allClasses: false,
                classes: freeClasses,
              };
            }
            return {
              ...row,
              subject: choice.name,
              subjectType: choice.type,
              // A new paper starts from "all classes where it is offered".
              allClasses: true,
              classes: [],
            };
          }
          // Blank option, or an unknown value from a legacy saved schedule.
          return { ...row, ...patch, subjectType: "", allClasses: true, classes: [] };
        }
        return { ...row, ...patch };
      })
    );
  };

  const handleToggleRowClass = (
    id: string,
    className: string,
    checked: boolean
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              classes: checked
                ? Array.from(new Set([...row.classes, className]))
                : row.classes.filter((item) => item !== className),
            }
          : row
      )
    );
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleClearSchedule = () => {
    setRows([]);
    setScheduleErrors([]);
  };

  /**
   * Collects every problem that would stop the schedule from being saved: the
   * exam selection here, then the subject-paper rows (including the check that no
   * class is scheduled twice for the same paper) through the shared helper.
   */
  const validateSchedule = (list: ScheduleRow[]): string[] => {
    if (!selectedExam) {
      return ["Select an exam before saving the schedule."];
    }
    if (list.length === 0) {
      return ["Add at least one subject paper to the schedule."];
    }

    return findScheduleRowProblems(list, subjectClassesOfRow);
  };

  const handleSaveSchedule = async () => {
    const problems = validateSchedule(rows);
    setScheduleErrors(problems);

    if (problems.length > 0) {
      toast.error("Please fix the schedule before saving.");
      return;
    }
    if (!selectedExam) return;

    setSavingSchedule(true);
    try {
      // One schedule document per exam, so the card can be regenerated later.
      await setDoc(
        doc(db, COLLECTION.EXAM_SCHEDULES, selectedExam.id),
        {
          examId: selectedExam.id,
          examName: selectedExam.examName,
          examCategory: selectedExam.examCategory,
          academicYear: selectedExam.academicYear,
          rows: rows.map((row) => ({
            id: row.id,
            subject: row.subject.trim(),
            subjectType: row.subjectType.trim(),
            date: row.date,
            fromTime: row.fromTime,
            toTime: row.toTime,
            allClasses: row.allClasses,
            classes: row.allClasses ? [] : row.classes,
          })),
          createdAt: scheduleCreatedAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Exam schedule saved.");
    } catch (error) {
      console.error("Failed to save exam schedule:", error);
      toast.error("Failed to save the schedule. Please try again.");
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Exam Schedule"
        titleStyle="text-primaryBlue"
        description="Add every subject paper of the selected exam with its date, time and the classes it applies to."
        descriptionStyle="text-gray-500"
        button={
          <Button
            buttonName="+ Add Exam"
            variant="success"
            size="md"
            buttonStyle="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate(`/welcome/exam/list/?add-exam`)}
          />
        }
      />

      {/* ---------------- Subject papers of the selected exam ---------------- */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 md:p-4 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Subject Papers</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Choose the exam, then add every subject paper with its date, time
              and the classes it applies to.
            </p>
            <p className="mt-1 text-sm text-gray-600">
              The same paper can be scheduled more than once for a different group
              of classes, each group with its own date and time — for example{" "}
              <span className="font-semibold text-gray-700">
                Science (Theory) for UKG on 10 Jan
              </span>{" "}
              and{" "}
              <span className="font-semibold text-gray-700">
                Science (Theory) for Class 5 on 12 Jan
              </span>
              . Add one paper per class group with “Specific classes”. A class can
              appear only once per paper, so the class groups must not overlap.
            </p>
          </div>
          <span className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            {rows.length} paper{rows.length === 1 ? "" : "s"} in schedule
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="scheduleYear"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Academic Year
            </label>
            <select
              id="scheduleYear"
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(event.target.value);
                setSelectedExamId("");
                setScheduleErrors([]);
              }}
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
              htmlFor="scheduleExam"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Exam
            </label>
            <select
              id="scheduleExam"
              value={selectedExamId}
              onChange={(event) => {
                setSelectedExamId(event.target.value);
                setScheduleErrors([]);
              }}
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
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              <span className="font-bold">{selectedExam.examName}</span>
              <span className="rounded bg-white px-2 py-0.5 font-semibold">
                {marksSchemeBadge(
                  selectedExam.examCategory,
                  selectedExam.marksScheme
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

            {loadingSchedule ? (
              <p className="mt-4 text-sm font-semibold text-gray-500">
                Loading saved schedule...
              </p>
            ) : rows.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No subject paper added yet. Click &quot;+ Add Subject Paper&quot;
                to start building the schedule.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {rows.map((row, index) => {
                  const rowClasses = rowClassesOf(row.subject, row.subjectType);

                  /* Papers of this row's subject + type that also schedule one of
                     this paper's classes, grouped by the other paper. */
                  const clashesByOtherPaper = new Map<number, string[]>();
                  paperClashes
                    .filter((clash) => clash.rowIndex === index)
                    .forEach((clash) => {
                      const classNames =
                        clashesByOtherPaper.get(clash.otherRowIndex) ?? [];
                      classNames.push(clash.className);
                      clashesByOtherPaper.set(clash.otherRowIndex, classNames);
                    });

                  /* Class -> index of the earlier paper that already covers it. */
                  const classTakenBy = new Map<string, number>();
                  clashesByOtherPaper.forEach((classNames, otherIndex) =>
                    classNames.forEach((className) =>
                      classTakenBy.set(className, otherIndex)
                    )
                  );

                  /* Papers of the same subject + type scheduled elsewhere. The
                     same paper for another group of classes on another date is
                     valid and normal, so it is only shown as information. */
                  const siblingPapers = rows
                    .map((sibling, siblingIndex) => ({ sibling, siblingIndex }))
                    .filter(
                      ({ sibling, siblingIndex }) =>
                        siblingIndex !== index &&
                        sibling.subject.trim() &&
                        paperKeyOfRow(sibling) === paperKeyOfRow(row)
                    );
                  return (
<div
                      key={row.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex flex-wrap items-baseline gap-x-2 text-xs font-bold text-gray-500">
                          Paper {index + 1}
                          {row.subject && (
                            <span className="font-semibold text-gray-600">
                              {formatSubjectWithType(row.subject, row.subjectType)}
                              {" · "}
                              {rowClassScope(row, rowClasses)
                                .map(toOrdinalLabel)
                                .join(", ") || "no class yet"}
                              {row.date
                                ? ` · ${formatScheduleDate(row.date)}`
                                : ""}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          title="Remove this paper"
                          onClick={() => handleRemoveRow(row.id)}
                          className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white transition-colors hover:bg-red-700"
                        >
                          <FaTrash /> Remove
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="lg:col-span-1">
                          <label className="mb-1 block text-xs font-semibold text-gray-600">
                            Subject
                          </label>
                          <select
                            value={formatSubjectWithType(row.subject, row.subjectType)}
                            onChange={(event) =>
                              handleRowChange(row.id, {
                                subject: event.target.value,
                              })
                            }
                            disabled={loadingSubjects}
                            className={inputClass}
                          >
                            <option value="">
                              {loadingSubjects
                                ? "Loading subjects..."
                                : "Select subject"}
                            </option>
                            {subjectChoices.map((choice) => (
                              <option key={choice.value} value={choice.value}>
                                {choice.value}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-600">
                            Exam Date
                          </label>
                          <input
                            type="date"
                            value={row.date}
                            onChange={(event) =>
                              handleRowChange(row.id, {
                                date: event.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-600">
                            From (reporting time)
                          </label>
                          <input
                            type="time"
                            value={row.fromTime}
                            onChange={(event) =>
                              handleRowChange(row.id, {
                                fromTime: event.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-600">
                            To (end time)
                          </label>
                          <input
                            type="time"
                            value={row.toTime}
                            onChange={(event) =>
                              handleRowChange(row.id, {
                                toTime: event.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* Applicable classes for this paper */}
                      <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                              type="radio"
                              name={`classes-${row.id}`}
                              checked={row.allClasses}
                              onChange={() =>
                                handleRowChange(row.id, { allClasses: true })
                              }
                              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            All classes
                            <span className="text-xs font-normal text-gray-500">
                              {rowClasses.length > 0
                                ? `(${rowClasses.map(toOrdinalLabel).join(", ")})`
                                : "(this subject is not added to any class)"}
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                              type="radio"
                              name={`classes-${row.id}`}
                              checked={!row.allClasses}
                              onChange={() =>
                                handleRowChange(row.id, { allClasses: false })
                              }
                              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Specific classes
                          </label>
                        </div>

                        {!row.allClasses && (
                          <div className="mt-2">
                            {rowClasses.length === 0 ? (
                              <p className="text-xs font-semibold text-amber-700">
                                {row.subject
                                  ? `"${formatSubjectWithType(row.subject, row.subjectType)}" is not added to any class yet. Add it on the Subjects page first.`
                                  : "Select a subject to see the classes it is applicable to."}
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {rowClasses.map((className) => {
                                  /* Class already scheduled for the same paper on
                                     another date: ticking it would print the paper
                                     twice on one admit card. */
                                  const takenBy = classTakenBy.get(className);
                                  return (
                                    <label
                                      key={className}
                                      className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm font-medium ${
                                        takenBy === undefined
                                          ? "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                                          : "border-red-300 bg-red-50 text-red-700"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={row.classes.includes(className)}
                                        onChange={(event) =>
                                          handleToggleRowClass(
                                            row.id,
                                            className,
                                            event.target.checked
                                          )
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      {toOrdinalLabel(className)}
                                      {takenBy !== undefined && (
                                        <span className="text-[11px] font-semibold">
                                          · already on{" "}
                                          {formatScheduleDate(
                                            rows[takenBy].date
                                          )}{" "}
                                          (Paper {takenBy + 1})
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Class groups of one paper may carry different dates, but a
                            class can never be in two of them. */}
                        {Array.from(clashesByOtherPaper.entries()).map(
                          ([otherIndex, classNames]) => (
                            <p
                              key={otherIndex}
                              className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                            >
                              {classNames.map(toOrdinalLabel).join(", ")}: this
                              same paper is already scheduled on{" "}
                              {formatScheduleDate(rows[otherIndex].date)} (
                              {scheduleRowName(rows[otherIndex], otherIndex)}). A
                              class can have only one date for the same paper, so
                              untick the class here or on that paper.
                            </p>
                          )
                        )}

                        {clashesByOtherPaper.size === 0 &&
                          siblingPapers.length > 0 && (
                            <p className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                              The same paper is also scheduled for{" "}
                              {siblingPapers
                                .map(({ sibling, siblingIndex }) =>
                                  [
                                    rowClassScope(
                                      sibling,
                                      rowClassesOf(
                                        sibling.subject,
                                        sibling.subjectType
                                      )
                                    )
                                      .map(toOrdinalLabel)
                                      .join(", ") || "no class yet",
                                    `on ${
                                      sibling.date
                                        ? formatScheduleDate(sibling.date)
                                        : "no date yet"
                                    } (Paper ${siblingIndex + 1})`,
                                  ].join(" ")
                                )
                                .join("; ")}.
                            </p>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAddRow}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700"
              >
                + Add Subject Paper
              </button>
              <button
                type="button"
                onClick={() => void handleSaveSchedule()}
                disabled={savingSchedule || rows.length === 0}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingSchedule ? "Saving..." : "Save Schedule"}
              </button>
              <button
                type="button"
                onClick={handleClearSchedule}
                disabled={rows.length === 0}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
              <span className="self-center text-xs text-gray-500">
                The schedule is saved with the exam, so admit cards can be
                generated again later.
              </span>
            </div>

            {scheduleErrors.length > 0 && (
              <ul className="mt-3 list-inside list-disc space-y-1 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {scheduleErrors.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}

            </div>
        )}
      </section>
    </div>
  );
}

export default ExamSchedule;