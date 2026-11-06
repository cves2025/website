import { useContext, useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { Undo2 } from "lucide-react";

import { CLASSES, SECTIONS } from "../../../constants";
import {
  generateAcademicYears,
  nextAcademicYear,
} from "../../../utils/generateAcademicYears";
import {
  PASSED_OUT,
  fetchPromotionCandidates,
  isLastClass,
  loadPromotionResults,
  nextClassOf,
  promoteStudents,
  suggestTargetClass,
  undoPromotionBatch,
  undoPromotions,
  type PromoteOutcome,
  type PromotionCandidate,
  type PromotionItem,
  type PromotionMode,
  type PromotionResult,
  type UndoOutcome,
} from "../../../utils/studentPromotion";
import { useExamList } from "../../../hooks/useExamList";
import { useExamRules } from "../../../hooks/useExamRules";
import Modal from "../../../custom-components/Modal";
import PageHeader from "../../../custom-components/PageHeader";
import Button from "../../../custom-components/Button";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import SearchableMultiSelect from "../../../custom-components/SearchableMultiSelect";
import { Button as UIButton } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { myContext } from "../../context/MyContextProvider";

const academicYears = generateAcademicYears();

const CLASS_OPTIONS = CLASSES.map((className) => ({
  label: className,
  value: className,
}));

const SECTION_OPTIONS = SECTIONS.map((section) => ({
  label: section,
  value: section,
}));

/** Value of the bulk "Section" dropdown that keeps every student's section. */
const SAME_SECTION = "";

const PASSED_OUT_LABEL = "Passed Out / TC";

function targetClassOptions(sourceClass: string) {
  return [
    ...CLASS_OPTIONS,
    ...(isLastClass(sourceClass)
      ? [{ label: PASSED_OUT_LABEL, value: PASSED_OUT }]
      : []),
  ];
}

function targetLabel(targetClass: string, targetSection: string): string {
  if (targetClass === PASSED_OUT) return PASSED_OUT_LABEL;
  return targetSection ? `${targetClass} - ${targetSection}` : targetClass;
}

function formatDate(value: unknown): string {
  return value instanceof Timestamp
    ? value.toDate().toLocaleDateString("en-IN")
    : "-";
}

function firestoreErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("permission")) {
      return "You do not have permission to promote students. Please login with an admin account.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function ResultBadge({ result }: { result: PromotionResult | null }) {
  if (!result || result.result === null) {
    return <span className="text-xs font-semibold text-gray-400">No result</span>;
  }
  const passed = result.result === "pass";
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {passed ? "PASS" : "FAIL"}
      </span>
      <span className="text-xs text-gray-600">
        {result.grandTotal}/{result.grandMax} ({result.percentage}%)
      </span>
    </span>
  );
}

/** Toast summary of a promote run (skipped students are listed one by one). */
function reportPromotion(outcome: PromoteOutcome) {
  const done = outcome.promoted + outcome.passedOut;
  if (done > 0) {
    const parts = [
      outcome.promoted ? `${outcome.promoted} promoted` : "",
      outcome.passedOut ? `${outcome.passedOut} passed out` : "",
    ].filter(Boolean);
    toast.success(`Done: ${parts.join(", ")}.`);
  }
  outcome.skipped.forEach((student) =>
    toast.error(`${student.studentName}: ${student.reason}`),
  );
  if (!outcome.rollNumbersUpdated) {
    toast.error(
      "Promotion saved, but roll numbers could not be refreshed. Please regenerate them from Settings.",
    );
  }
}

function reportUndo(outcome: UndoOutcome) {
  if (outcome.undone > 0) {
    toast.success(
      `Promotion undone for ${outcome.undone} student(s). ${outcome.examDocsDeleted} marks/attendance record(s) removed.`,
    );
  }
  outcome.skipped.forEach((student) =>
    toast.error(`${student.studentName}: ${student.reason}`),
  );
  if (!outcome.rollNumbersUpdated) {
    toast.error(
      "Undo saved, but roll numbers could not be refreshed. Please regenerate them from Settings.",
    );
  }
}

type UndoTarget =
  | { kind: "student"; candidate: PromotionCandidate }
  | { kind: "batch"; batchId: string; count: number };

interface RowTarget {
  targetClass: string;
  targetSection: string;
}

/**
 * Student promotion page.
 *
 * - "One Student": pick a student; the result of all exams of the session
 *   suggests the class (pass -> next, fail -> same), the admin may change it.
 * - "Whole Class": every not-yet-promoted student of the chosen class /
 *   sections at once. Everybody defaults to the class + section on top
 *   ("Same as previous" keeps each student's section); single rows can be
 *   changed. Failed students are only highlighted - they move on as well
 *   unless their row is changed.
 * - The history below lists the promoted students of the class with an undo
 *   per student and per bulk run.
 */
function StudentPromote() {
  const { user } = useContext(myContext);
  const { exams, loadingExam } = useExamList();
  const { rules, loading: rulesLoading, error: rulesError } = useExamRules();

  const [fromYear, setFromYear] = useState(academicYears[0]?.value ?? "");
  const [className, setClassName] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [mode, setMode] = useState<PromotionMode>("single");
  const toYear = nextAcademicYear(fromYear);

  const [candidates, setCandidates] = useState<PromotionCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Single student
  const [selectedId, setSelectedId] = useState("");
  const [singleResult, setSingleResult] = useState<PromotionResult | null>(null);
  const [singleTarget, setSingleTarget] = useState<RowTarget>({
    targetClass: "",
    targetSection: "",
  });

  // Whole class
  const [classResults, setClassResults] = useState<Map<string, PromotionResult>>(
    new Map(),
  );
  const [topClass, setTopClass] = useState("");
  const [topSection, setTopSection] = useState(SAME_SECTION);
  const [rowTargets, setRowTargets] = useState<Record<string, RowTarget>>({});

  const [loadingResults, setLoadingResults] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoTarget, setUndoTarget] = useState<UndoTarget | null>(null);
  const [undoing, setUndoing] = useState(false);

  const resultsReady = !loadingExam && !rulesLoading;

  useEffect(() => {
    if (!fromYear || !className) {
      setCandidates([]);
      return;
    }
    let cancelled = false;
    setLoadingCandidates(true);
    fetchPromotionCandidates(fromYear, className, sections)
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch((error) => {
        console.error("Failed to load students:", error);
        if (!cancelled) {
          setCandidates([]);
          toast.error(firestoreErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromYear, className, sections, reloadNonce]);

  // A new class / session starts every selection over.
  useEffect(() => {
    setSelectedId("");
    setTopClass(nextClassOf(className));
    setTopSection(SAME_SECTION);
    setRowTargets({});
  }, [fromYear, className]);

  const activeCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.status === "active"),
    [candidates],
  );
  const promotedCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.status !== "active"),
    [candidates],
  );
  const selected = activeCandidates.find(
    (candidate) => candidate.enrollmentId === selectedId,
  );

  // Single student: result of just that student (a handful of reads).
  useEffect(() => {
    if (mode !== "single" || !selected || !resultsReady) {
      setSingleResult(null);
      return;
    }
    let cancelled = false;
    setLoadingResults(true);
    loadPromotionResults({
      academicYear: fromYear,
      className,
      exams,
      rules,
      studentUid: selected.studentId,
    })
      .then((results) => {
        if (cancelled) return;
        const result = results.get(selected.studentId) ?? null;
        setSingleResult(result);
        setSingleTarget({
          targetClass: suggestTargetClass(className, result),
          targetSection: selected.section,
        });
      })
      .catch((error) => {
        console.error("Failed to load result:", error);
        if (!cancelled) {
          setSingleResult(null);
          toast.error("The result of this student could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingResults(false);
      });
    return () => {
      cancelled = true;
    };
    // `selected` is re-created on every candidates load; its id is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected?.enrollmentId, fromYear, className, exams, rules, resultsReady]);

  // Whole class: one marks query for the class.
  useEffect(() => {
    if (mode !== "bulk" || !fromYear || !className || !resultsReady) {
      setClassResults(new Map());
      return;
    }
    let cancelled = false;
    setLoadingResults(true);
    loadPromotionResults({ academicYear: fromYear, className, exams, rules })
      .then((results) => {
        if (!cancelled) setClassResults(results);
      })
      .catch((error) => {
        console.error("Failed to load results:", error);
        if (!cancelled) {
          setClassResults(new Map());
          toast.error("Results of this class could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingResults(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, fromYear, className, exams, rules, resultsReady, reloadNonce]);

  const rowTargetOf = (candidate: PromotionCandidate): RowTarget =>
    rowTargets[candidate.enrollmentId] ?? {
      targetClass: topClass,
      targetSection: topSection || candidate.section,
    };

  const setRowTarget = (
    candidate: PromotionCandidate,
    change: Partial<RowTarget>,
  ) =>
    setRowTargets((current) => ({
      ...current,
      [candidate.enrollmentId]: { ...rowTargetOf(candidate), ...change },
    }));

  const bulkItems: PromotionItem[] = activeCandidates.map((candidate) => {
    const target = rowTargetOf(candidate);
    return {
      enrollmentId: candidate.enrollmentId,
      targetClass: target.targetClass,
      targetSection:
        target.targetClass === PASSED_OUT ? "" : target.targetSection,
      result: classResults.get(candidate.studentId) ?? null,
    };
  });

  const isItemComplete = (item: PromotionItem) =>
    item.targetClass === PASSED_OUT ||
    (item.targetClass !== "" && item.targetSection !== "");

  const singleItem: PromotionItem | null = selected
    ? {
        enrollmentId: selected.enrollmentId,
        targetClass: singleTarget.targetClass,
        targetSection:
          singleTarget.targetClass === PASSED_OUT
            ? ""
            : singleTarget.targetSection,
        result: singleResult,
      }
    : null;

  const pendingItems =
    mode === "single" ? (singleItem ? [singleItem] : []) : bulkItems;
  const canSubmit =
    pendingItems.length > 0 &&
    pendingItems.every(isItemComplete) &&
    !loadingResults &&
    !saving &&
    Boolean(toYear);

  const summary = useMemo(() => {
    const passedOut = pendingItems.filter(
      (item) => item.targetClass === PASSED_OUT,
    ).length;
    const retained = pendingItems.filter(
      (item) => item.targetClass === className,
    ).length;
    const failedMovingOn = pendingItems.filter(
      (item) =>
        item.result?.result === "fail" && item.targetClass !== className,
    ).length;
    return {
      total: pendingItems.length,
      passedOut,
      retained,
      promoted: pendingItems.length - passedOut - retained,
      failedMovingOn,
    };
  }, [pendingItems, className]);

  const bulkBatches = useMemo(() => {
    const batches = new Map<string, { count: number; promotedAt: unknown }>();
    promotedCandidates.forEach((candidate) => {
      const promotion = candidate.promotion;
      if (!promotion || promotion.mode !== "bulk" || !promotion.batchId) return;
      const batch = batches.get(promotion.batchId) ?? {
        count: 0,
        promotedAt: promotion.promotedAt,
      };
      batch.count += 1;
      batches.set(promotion.batchId, batch);
    });
    return [...batches].map(([batchId, batch]) => ({ batchId, ...batch }));
  }, [promotedCandidates]);

  const handlePromote = async () => {
    if (!user || !canSubmit) return;
    setSaving(true);
    try {
      const outcome = await promoteStudents({
        fromAcademicYear: fromYear,
        toAcademicYear: toYear,
        mode,
        items: pendingItems,
        promotedBy: {
          uid: user.uid,
          name: user.fullName || user.email || "",
        },
      });
      reportPromotion(outcome);
      setConfirmOpen(false);
      setSelectedId("");
      setRowTargets({});
      setReloadNonce((value) => value + 1);
    } catch (error) {
      console.error("Promotion failed:", error);
      toast.error(firestoreErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    if (!undoTarget) return;
    setUndoing(true);
    try {
      const outcome =
        undoTarget.kind === "batch"
          ? await undoPromotionBatch(undoTarget.batchId)
          : await undoPromotions([undoTarget.candidate.enrollmentId]);
      reportUndo(outcome);
      setUndoTarget(null);
      setReloadNonce((value) => value + 1);
    } catch (error) {
      console.error("Undo failed:", error);
      toast.error(firestoreErrorMessage(error));
    } finally {
      setUndoing(false);
    }
  };

  const undoSession =
    undoTarget?.kind === "student"
      ? undoTarget.candidate.promotion?.toAcademicYear || toYear
      : toYear;

  return (
    <div className="mx-auto w-full space-y-4">
      <PageHeader
        title="Promote Students"
        description={`Move students from session ${fromYear || "-"} to ${
          toYear || "-"
        }. The ${fromYear || "old"} records, marks and result cards stay as they are.`}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 rounded-lg bg-white px-4 py-3 md:grid-cols-4">
        <div>
          <Label htmlFor="promote-year" className="mb-1 block font-bold">
            From Session
          </Label>
          <SelectDropdown
            id="promote-year"
            value={fromYear}
            onValueChange={setFromYear}
            options={academicYears}
          />
        </div>

        <div>
          <Label className="mb-1 block font-bold">To Session</Label>
          <div className="rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
            {toYear || "-"}
          </div>
        </div>

        <div>
          <Label htmlFor="promote-class" className="mb-1 block font-bold">
            Class
          </Label>
          <SelectDropdown
            id="promote-class"
            value={className}
            onValueChange={setClassName}
            placeholder="Select class"
            options={CLASS_OPTIONS}
          />
        </div>

        <div>
          <Label htmlFor="promote-sections" className="mb-1 block font-bold">
            Sections
          </Label>
          <SearchableMultiSelect
            id="promote-sections"
            options={SECTION_OPTIONS}
            values={sections}
            onChange={setSections}
            placeholder="All sections"
            disabled={!className}
          />
        </div>
      </div>

      {/* Mode */}
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        {(
          [
            { value: "single", label: "One Student" },
            { value: "bulk", label: "Whole Class" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
              mode === option.value
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {rulesError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Exam rules could not be loaded, so Pass / Fail may be wrong: {rulesError}
        </div>
      )}

      {!className ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Select a class to start.
        </div>
      ) : loadingCandidates ? (
        <div className="rounded-lg bg-white px-4 py-6 text-center text-sm text-gray-500">
          Loading students...
        </div>
      ) : mode === "single" ? (
        <div className="space-y-4 rounded-lg bg-white px-4 py-4">
          <div className="max-w-xl">
            <Label htmlFor="promote-student" className="mb-1 block font-bold">
              Student
            </Label>
            <SelectDropdown
              id="promote-student"
              searchable
              value={selectedId}
              onValueChange={(enrollmentId) => {
                setSelectedId(enrollmentId);
                // Next class right away; a FAIL result switches it to the
                // same class once the result has loaded.
                setSingleTarget({
                  targetClass: nextClassOf(className),
                  targetSection:
                    activeCandidates.find(
                      (candidate) => candidate.enrollmentId === enrollmentId,
                    )?.section ?? "",
                });
              }}
              options={activeCandidates.map((candidate) => ({
                value: candidate.enrollmentId,
                label: `${candidate.studentName} (${candidate.enrollment}) - ${candidate.className}-${candidate.section}`,
                keywords: candidate.fatherName,
              }))}
              placeholder={
                activeCandidates.length
                  ? "Select student"
                  : "All students of this class are already promoted"
              }
              searchPlaceholder="Search by name, enrollment or father's name"
              disabled={activeCandidates.length === 0}
            />
          </div>

          {selected && (
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-4">
              <div className="space-y-1 text-sm">
                <p className="font-bold text-gray-800">{selected.studentName}</p>
                <p className="text-gray-500">
                  Enrollment {selected.enrollment} | {selected.className}-
                  {selected.section}
                </p>
                <p className="text-gray-500">Father: {selected.fatherName || "-"}</p>
              </div>

              <div className="space-y-1">
                <Label className="block font-bold">Result {fromYear}</Label>
                {loadingResults ? (
                  <span className="text-xs text-gray-400">Calculating...</span>
                ) : (
                  <ResultBadge result={singleResult} />
                )}
              </div>

              <div>
                <Label className="mb-1 block font-bold">New Class</Label>
                <SelectDropdown
                  value={singleTarget.targetClass}
                  onValueChange={(value) =>
                    setSingleTarget((current) => ({
                      ...current,
                      targetClass: value,
                    }))
                  }
                  placeholder="Select class"
                  options={targetClassOptions(className)}
                  disabled={loadingResults}
                />
              </div>

              <div>
                <Label className="mb-1 block font-bold">New Section</Label>
                <SelectDropdown
                  value={singleTarget.targetSection}
                  onValueChange={(value) =>
                    setSingleTarget((current) => ({
                      ...current,
                      targetSection: value,
                    }))
                  }
                  placeholder="Select section"
                  options={SECTION_OPTIONS}
                  disabled={
                    loadingResults || singleTarget.targetClass === PASSED_OUT
                  }
                />
              </div>
            </div>
          )}

          {selected && !loadingResults && !singleResult && (
            <p className="text-sm font-semibold text-amber-700">
              No marks found for {fromYear}. The next class is selected - change it if needed.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              buttonName="Promote Student"
              variant="cves"
              disabled={!canSubmit}
              onClick={() => setConfirmOpen(true)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg bg-white px-4 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            All students of this class are promoted together. Everybody keeps
            the section and other details of {fromYear} unless changed below.
            Students who failed are marked in red; they are promoted too unless
            you change their row.
            {isLastClass(className) &&
              ` Class ${className} students are marked "${PASSED_OUT_LABEL}" by default - students who should repeat the class can be changed here or undone later.`}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <Label className="mb-1 block font-bold">New Class (all)</Label>
              <SelectDropdown
                value={topClass}
                onValueChange={(value) => {
                  setTopClass(value);
                  setRowTargets({});
                }}
                placeholder="Select class"
                options={targetClassOptions(className)}
              />
            </div>
            <div>
              <Label className="mb-1 block font-bold">New Section (all)</Label>
              <SelectDropdown
                value={topSection}
                onValueChange={(value) => {
                  setTopSection(value);
                  setRowTargets({});
                }}
                options={[
                  { label: "Same as previous", value: SAME_SECTION },
                  ...SECTION_OPTIONS,
                ]}
                disabled={topClass === PASSED_OUT}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <Table
              className="min-w-[860px]"
              containerClassName="max-h-[calc(100dvh-12rem)]"
            >
              <TableHeader className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_theme(colors.gray.200)]">
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-bold text-gray-700">Sr. No.</TableHead>
                  <TableHead className="font-bold text-gray-700">Enrollment</TableHead>
                  <TableHead className="font-bold text-gray-700">Name</TableHead>
                  <TableHead className="font-bold text-gray-700">Section</TableHead>
                  <TableHead className="font-bold text-gray-700">Result</TableHead>
                  <TableHead className="font-bold text-gray-700">New Class</TableHead>
                  <TableHead className="font-bold text-gray-700">New Section</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCandidates.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                      No students left to promote in this class.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeCandidates.map((candidate, index) => {
                    const result = classResults.get(candidate.studentId) ?? null;
                    const target = rowTargetOf(candidate);
                    return (
                      <TableRow
                        key={candidate.enrollmentId}
                        className={result?.result === "fail" ? "bg-red-50" : ""}
                      >
                        <TableCell className="text-gray-500">{index + 1}</TableCell>
                        <TableCell>{candidate.enrollment}</TableCell>
                        <TableCell className="font-medium text-gray-800">
                          {candidate.studentName}
                        </TableCell>
                        <TableCell>{candidate.section}</TableCell>
                        <TableCell>
                          {loadingResults ? (
                            <span className="text-xs text-gray-400">...</span>
                          ) : (
                            <ResultBadge result={result} />
                          )}
                        </TableCell>
                        <TableCell className="w-44">
                          <SelectDropdown
                            value={target.targetClass}
                            onValueChange={(value) =>
                              setRowTarget(candidate, { targetClass: value })
                            }
                            placeholder="Class"
                            options={targetClassOptions(className)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="w-36">
                          <SelectDropdown
                            value={
                              target.targetClass === PASSED_OUT
                                ? ""
                                : target.targetSection
                            }
                            onValueChange={(value) =>
                              setRowTarget(candidate, { targetSection: value })
                            }
                            placeholder="Section"
                            options={SECTION_OPTIONS}
                            disabled={target.targetClass === PASSED_OUT}
                            className="h-8"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button
              buttonName={`Promote Whole Class (${activeCandidates.length})`}
              variant="cves"
              disabled={!canSubmit}
              onClick={() => setConfirmOpen(true)}
            />
          </div>
        </div>
      )}

      {/* History */}
      {className && promotedCandidates.length > 0 && (
        <div className="space-y-3 rounded-lg bg-white px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-800">
              Already promoted from {fromYear} ({promotedCandidates.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {bulkBatches.map((batch) => (
                <Button
                  key={batch.batchId}
                  variant="danger"
                  size="sm"
                  buttonName={
                    <>
                      <Undo2 className="h-4 w-4" />
                      Undo whole class ({batch.count}) - {formatDate(batch.promotedAt)}
                    </>
                  }
                  onClick={() =>
                    setUndoTarget({
                      kind: "batch",
                      batchId: batch.batchId,
                      count: batch.count,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <Table className="min-w-[860px]">
              <TableHeader className="bg-gray-50">
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-bold text-gray-700">Enrollment</TableHead>
                  <TableHead className="font-bold text-gray-700">Name</TableHead>
                  <TableHead className="font-bold text-gray-700">From</TableHead>
                  <TableHead className="font-bold text-gray-700">Result</TableHead>
                  <TableHead className="font-bold text-gray-700">Moved To</TableHead>
                  <TableHead className="font-bold text-gray-700">By / Date</TableHead>
                  <TableHead className="text-center font-bold text-gray-700">Undo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotedCandidates.map((candidate) => {
                  const promotion = candidate.promotion;
                  return (
                    <TableRow key={candidate.enrollmentId}>
                      <TableCell>{candidate.enrollment}</TableCell>
                      <TableCell className="font-medium text-gray-800">
                        {candidate.studentName}
                      </TableCell>
                      <TableCell>
                        {candidate.className}-{candidate.section}
                      </TableCell>
                      <TableCell>
                        <ResultBadge result={promotion?.result ?? null} />
                      </TableCell>
                      <TableCell>
                        {candidate.status === "passedOut"
                          ? PASSED_OUT_LABEL
                          : `${targetLabel(
                              promotion?.toClassName ?? "",
                              promotion?.toSection ?? "",
                            )} (${promotion?.toAcademicYear ?? "-"})`}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {promotion?.promotedByName || "-"}
                        <br />
                        {formatDate(promotion?.promotedAt)}
                        {promotion?.mode === "bulk" ? " | whole class" : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <UIButton
                            type="button"
                            size="icon"
                            variant="destructive"
                            title="Undo promotion"
                            aria-label={`Undo promotion of ${candidate.studentName}`}
                            onClick={() =>
                              setUndoTarget({ kind: "student", candidate })
                            }
                            className="h-8 w-8 bg-red-600 text-white hover:bg-red-700"
                          >
                            <Undo2 className="h-4 w-4" />
                          </UIButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Modal
        isOpen={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        title={mode === "bulk" ? "Promote Whole Class" : "Promote Student"}
        description={
          mode === "bulk"
            ? `All ${summary.total} student(s) of class ${className} are promoted together from ${fromYear} to ${toYear}. Sections and other details stay as in ${fromYear} unless changed.`
            : selected
              ? `${selected.studentName}: ${selected.className}-${selected.section} (${fromYear}) -> ${targetLabel(
                  singleTarget.targetClass,
                  singleTarget.targetSection,
                )}${singleTarget.targetClass === PASSED_OUT ? "" : ` (${toYear})`}`
              : ""
        }
        cancelText="Cancel"
        submitText="Confirm"
        loading={saving}
        onSubmit={handlePromote}
      >
        {mode === "bulk" && (
          <ul className="space-y-1 text-sm text-gray-700">
            <li>Promoted to another class: {summary.promoted}</li>
            <li>Repeating class {className}: {summary.retained}</li>
            {summary.passedOut > 0 && (
              <li>{PASSED_OUT_LABEL}: {summary.passedOut}</li>
            )}
            {summary.failedMovingOn > 0 && (
              <li className="font-semibold text-red-600">
                {summary.failedMovingOn} failed student(s) will move on as well.
              </li>
            )}
          </ul>
        )}
      </Modal>

      <Modal
        isOpen={undoTarget !== null}
        onClose={() => !undoing && setUndoTarget(null)}
        title="Undo Promotion"
        description={
          undoTarget?.kind === "batch"
            ? `The promotion of ${undoTarget.count} student(s) of class ${className} will be undone.`
            : undoTarget
              ? `The promotion of ${undoTarget.candidate.studentName} will be undone.`
              : ""
        }
        cancelText="Cancel"
        submitText="Undo"
        submitClassName="bg-red-600 hover:bg-red-700"
        loading={undoing}
        onSubmit={handleUndo}
      >
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          The {undoSession} enrollment will be deleted, together with ALL exam
          marks and attendance saved for {undoSession}. This cannot be reversed.
          The {fromYear} record becomes active again.
        </div>
      </Modal>
    </div>
  );
}

export default StudentPromote;
