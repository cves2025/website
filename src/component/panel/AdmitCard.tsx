import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";
import { FaPrint, FaTrash } from "react-icons/fa";
import { CLASSES, COLLECTION } from "../../constants";
import { db } from "../../firebase/config";
import { generateAcademicYears } from "../../utils/generateAcademicYears";
import { toDateOrNull } from "../../utils/toDateOrNull";
import { toOrdinalLabel } from "../../utils/toOrdinalLabel";
import {
  ExamCategory,
  MarksScheme,
  defaultMarksScheme,
  isSchemeClass,
  marksCellLabel,
  marksSchemeBadge,
  marksSchemeFromDoc,
  subjectMarksBreakdown,
} from "../../utils/examMarksScheme";

const academicYears = generateAcademicYears();

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed";

/** Exams saved on the Add Exam page. */
interface ExamDoc {
  id: string;
  examName: string;
  examCategory: ExamCategory;
  academicYear: string;
  maxMarks: number;
  marksScheme: MarksScheme;
  applicableClasses: string[];
  examStartDate: string;
  examEndDate: string;
  status: "active" | "archived";
}

/** A subject from the Subjects page, together with the classes offering it. */
interface SubjectOption {
  name: string;
  classes: string[];
  order: number;
  types: string[];
}

/**
 * One row of the exam schedule: a subject paper with its date, reporting time
 * and the classes the paper is applicable to.
 *
 * `allClasses` keeps the row applicable to every class where the subject is
 * offered (re-evaluated live from the Subjects page), while `classes` stores
 * the explicit class selection used when `allClasses` is false.
 */
interface ScheduleRow {
  id: string;
  subject: string;
  date: string;
  fromTime: string;
  toTime: string;
  allClasses: boolean;
  classes: string[];
}

/** Student record (from the enrollments page) used to fill an admit card. */
interface CardStudent {
  /** Enrollments document id. */
  id: string;
  /** Students document id, used to pull extra details (mother's name). */
  studentId: string;
  enrollment: string;
  studentName: string;
  firstName: string;
  lastName: string;
  className: string;
  section: string;
  academicYear: string;
  fatherName: string;
  motherName: string;
}

function toExamCategory(value: unknown): ExamCategory {
  return value === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
}

function toExamDoc(snapshot: QueryDocumentSnapshot<DocumentData>): ExamDoc {
  const data = snapshot.data();
  const maxMarks = typeof data.maxMarks === "number" ? data.maxMarks : 0;
  return {
    id: snapshot.id,
    examName: typeof data.examName === "string" ? data.examName : "",
    examCategory: toExamCategory(data.examCategory),
    academicYear: typeof data.academicYear === "string" ? data.academicYear : "",
    maxMarks,
    // Older documents only stored maxMarks; this fills the class 1-8 split.
    marksScheme: marksSchemeFromDoc(data, maxMarks || undefined),
    applicableClasses: Array.isArray(data.applicableClasses)
      ? data.applicableClasses.filter(
          (cls): cls is string => typeof cls === "string"
        )
      : [],
    examStartDate: toDateInputValue(data.examStartDate),
    examEndDate: toDateInputValue(data.examEndDate),
    status: data.status === "archived" ? "archived" : "active",
  };
}

/**
 * Groups every document of the Subjects page by subject name so the schedule
 * can offer one option per subject plus the classes that teach it.
 */
function toSubjectOptions(
  docs: QueryDocumentSnapshot<DocumentData>[]
): SubjectOption[] {
  const byName = new Map<string, SubjectOption>();

  docs.forEach((documentSnapshot) => {
    const data = documentSnapshot.data();
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name) return;

    const className =
      typeof data.className === "string" ? data.className.trim() : "";
    const type = typeof data.type === "string" ? data.type : "";
    const order = typeof data.order === "number" ? data.order : 1;
    const key = name.toLowerCase();

    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, {
        name,
        classes: className ? [className] : [],
        order,
        types: type ? [type] : [],
      });
      return;
    }

    if (className && !existing.classes.includes(className)) {
      existing.classes.push(className);
    }
    if (type && !existing.types.includes(type)) {
      existing.types.push(type);
    }
    existing.order = Math.min(existing.order, order);
  });

  // Keep the classes in the same order as the CLASSES list.
  const toClassOrder = (className: string) => {
    const index = CLASSES.indexOf(className);
    return index === -1 ? CLASSES.length : index;
  };
  byName.forEach((option) => {
    option.classes.sort((a, b) => toClassOrder(a) - toClassOrder(b));
  });

  return Array.from(byName.values()).sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name)
  );
}

/** Restores the saved schedule rows of one exam document. */
function toScheduleRows(data: DocumentData): ScheduleRow[] {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row, index) => ({
      id:
        typeof row.id === "string" && row.id
          ? row.id
          : `row-${index}-${Date.now()}`,
      subject: typeof row.subject === "string" ? row.subject : "",
      date: typeof row.date === "string" ? row.date : "",
      fromTime: typeof row.fromTime === "string" ? row.fromTime : "",
      toTime: typeof row.toTime === "string" ? row.toTime : "",
      allClasses: row.allClasses === true,
      classes: Array.isArray(row.classes)
        ? row.classes.filter(
            (cls): cls is string => typeof cls === "string"
          )
        : [],
    }));
}

/** Date / Timestamp / string -> "yyyy-MM-dd" for <input type="date">. */
function toDateInputValue(value: unknown): string {
  const date = toDateOrNull(value);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "yyyy-MM-dd" (schedule field value) -> "10 Jan 2026". */
function formatScheduleDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value || "-";
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

/** "13:30" -> "1:30 PM". */
function formatScheduleTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return value || "-";
  const hours = Number(match[1]);
  if (hours > 23) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${match[2]} ${suffix}`;
}

/** True when a schedule row must appear on a card of the given class. */
function rowAppliesToClass(
  row: ScheduleRow,
  className: string,
  subjectClasses: string[]
): boolean {
  if (!row.subject) return false;
  if (row.allClasses) return subjectClasses.includes(className);
  return row.classes.includes(className);
}

function newRowId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Maps one enrollments document into an admit card student. */
function toCardStudent(
  snapshot: QueryDocumentSnapshot<DocumentData>
): CardStudent | null {
  const data = snapshot.data();
  if (data.isDeleted === true) return null;

  return {
    id: snapshot.id,
    studentId: typeof data.studentId === "string" ? data.studentId : "",
    enrollment: String(data.enrollment ?? "").trim(),
    studentName: typeof data.studentName === "string" ? data.studentName : "",
    firstName: typeof data.firstName === "string" ? data.firstName : "",
    lastName: typeof data.lastName === "string" ? data.lastName : "",
    className: typeof data.className === "string" ? data.className : "",
    section: typeof data.section === "string" ? data.section : "",
    academicYear: typeof data.academicYear === "string" ? data.academicYear : "",
    fatherName: typeof data.fatherName === "string" ? data.fatherName : "",
    motherName: typeof data.motherName === "string" ? data.motherName : "",
  };
}

function AdmitCard() {
  /* ---------------------------------------------------------------- exams */
  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? ""
  );
  const [selectedExamId, setSelectedExamId] = useState("");

  /* ------------------------------------------------------------- subjects */
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  /* ------------------------------------------------------------- schedule */
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleCreatedAt, setScheduleCreatedAt] = useState<unknown>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleErrors, setScheduleErrors] = useState<string[]>([]);

  /* ------------------------------------------------------------- generate */
  const [selectedClass, setSelectedClass] = useState("");
  const [classStudents, setClassStudents] = useState<CardStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [card, setCard] = useState<CardStudent | null>(null);

  /* Exam templates saved on the Add Exam page. */
  useEffect(() => {
    const examsQuery = query(
      collection(db, COLLECTION.EXAMS),
      orderBy("sequence", "asc")
    );

    const unsubscribe = onSnapshot(
      examsQuery,
      (snapshot) => {
        setExams(snapshot.docs.map(toExamDoc));
        setLoadingExams(false);
      },
      (error) => {
        console.error("Failed to load exams:", error);
        setLoadingExams(false);
      }
    );

    return unsubscribe;
  }, []);

  /* Subjects added on the Subjects page (all classes). */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION.SUBJECTS),
      (snapshot) => {
        setSubjectOptions(toSubjectOptions(snapshot.docs));
        setLoadingSubjects(false);
      },
      (error) => {
        console.error("Failed to load subjects:", error);
        setLoadingSubjects(false);
      }
    );

    return unsubscribe;
  }, []);

  /* Saved schedule of the selected exam (document id = exam id). */
  useEffect(() => {
    if (!selectedExamId) {
      setRows([]);
      setScheduleCreatedAt(null);
      setLoadingSchedule(false);
      return;
    }

    let cancelled = false;
    setLoadingSchedule(true);

    const unsubscribe = onSnapshot(
      doc(db, COLLECTION.EXAM_SCHEDULES, selectedExamId),
      (snapshot) => {
        if (cancelled) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          setRows(toScheduleRows(data));
          setScheduleCreatedAt(data.createdAt ?? null);
        } else {
          setRows([]);
          setScheduleCreatedAt(null);
        }
        setLoadingSchedule(false);
      },
      (error) => {
        if (cancelled) return;
        console.error("Failed to load exam schedule:", error);
        setLoadingSchedule(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [selectedExamId]);
  /* Students of the selected class, used for the admit card. */
  useEffect(() => {
    setSelectedEnrollment("");
    setCard(null);
    setGenerateError("");

    if (!selectedClass) {
      setClassStudents([]);
      setLoadingStudents(false);
      return;
    }

    let cancelled = false;
    setLoadingStudents(true);

    // Only one equality filter is used so no composite index is required; the
    // academic year is matched in memory.
    const studentsQuery = query(
      collection(db, COLLECTION.ENROLLMENTS),
      where("className", "==", selectedClass)
    );

    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        if (cancelled) return;
        const list = snapshot.docs
          .map(toCardStudent)
          .filter((student): student is CardStudent => student !== null)
          .filter(
            (student) => !selectedYear || student.academicYear === selectedYear
          )
          .sort(
            (a, b) =>
              a.section.localeCompare(b.section) ||
              a.enrollment.localeCompare(b.enrollment, undefined, {
                numeric: true,
              })
          );
        setClassStudents(list);
        setLoadingStudents(false);
      },
      (error) => {
        if (cancelled) return;
        console.error("Failed to load students:", error);
        setLoadingStudents(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [selectedClass, selectedYear]);

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

  /* Subject name -> option (keeps the classes the subject is offered in). */
  const subjectByName = useMemo(() => {
    const map = new Map<string, SubjectOption>();
    subjectOptions.forEach((option) =>
      map.set(option.name.toLowerCase(), option)
    );
    return map;
  }, [subjectOptions]);

  const classesOfSubject = (subjectName: string): string[] =>
    subjectByName.get(subjectName.trim().toLowerCase())?.classes ?? [];

  /* Classes that have at least one applicable paper in the schedule. */
  const scheduledClasses = CLASSES.filter((className) =>
    rows.some(
      (row) =>
        row.subject &&
        rowAppliesToClass(row, className, classesOfSubject(row.subject))
    )
  );

  /* Papers shown on the card of the selected class. */
  const cardRows = selectedClass
    ? rows.filter(
        (row) =>
          row.subject &&
          rowAppliesToClass(row, selectedClass, classesOfSubject(row.subject))
      )
    : [];

  const examCategory: ExamCategory = selectedExam?.examCategory ?? "UNIT_TEST";
  const examScheme: MarksScheme =
    selectedExam?.marksScheme ?? defaultMarksScheme();
  const isUnitTest = examCategory === "UNIT_TEST";
  // Classes 1 to 8 keep the notebook / Science-Computer practical columns.
  const cardUsesMarksScheme = card ? isSchemeClass(card.className) : false;

  /* ----------------------------------------------------------- handlers -- */
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: newRowId(),
        subject: "",
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
          // A new subject starts from "all classes where it is offered".
          return { ...row, ...patch, allClasses: true, classes: [] };
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

  /** Collects every problem that would stop the schedule from being saved. */
  const validateSchedule = (list: ScheduleRow[]): string[] => {
    const problems: string[] = [];

    if (!selectedExam) {
      return ["Select an exam before saving the schedule."];
    }
    if (list.length === 0) {
      return ["Add at least one subject paper to the schedule."];
    }

    const seenSubjects = new Set<string>();
    list.forEach((row, index) => {
      const subject = row.subject.trim();
      const label = subject || `Row ${index + 1}`;

      if (!subject) {
        problems.push(`Row ${index + 1}: select a subject.`);
      } else if (seenSubjects.has(subject.toLowerCase())) {
        problems.push(`${label} is added more than once.`);
      } else {
        seenSubjects.add(subject.toLowerCase());
      }

      if (!row.date) {
        problems.push(`${label}: exam date is required.`);
      }
      if (!row.fromTime || !row.toTime) {
        problems.push(`${label}: from time and to time are required.`);
      } else if (row.toTime <= row.fromTime) {
        problems.push(`${label}: "to" time must be after the "from" time.`);
      }
      if (!row.allClasses && row.classes.length === 0) {
        problems.push(
          `${label}: select at least one class or choose "All classes".`
        );
      }
      if (
        row.allClasses &&
        subject &&
        classesOfSubject(subject).length === 0
      ) {
        problems.push(
          `${label}: this subject is not added to any class yet, so it cannot be scheduled. Add it on the Subjects page first.`
        );
      }
    });

    return problems;
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

  const handleGenerate = async () => {
    setGenerateError("");
    setCard(null);

    if (!selectedExam) {
      setGenerateError("Select an exam first.");
      return;
    }
    if (!selectedClass) {
      setGenerateError("Select the class of the student.");
      return;
    }
    if (!selectedEnrollment) {
      setGenerateError("Select a student.");
      return;
    }

    const student = classStudents.find(
      (item) => item.enrollment === selectedEnrollment
    );
    if (!student) {
      setGenerateError("Student not found in the selected class.");
      return;
    }
    if (cardRows.length === 0) {
      setGenerateError(
        `No subject paper in the schedule is applicable to class ${toOrdinalLabel(
          selectedClass
        )}.`
      );
      return;
    }

    setCard(student);

    // Extra details (mother's name) live on the students document.
    if (student.studentId) {
      try {
        const snapshot = await getDoc(
          doc(db, COLLECTION.STUDENTS, student.studentId)
        );
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCard((prev) =>
            prev && prev.id === student.id
              ? {
                  ...prev,
                  motherName:
                    typeof data.motherName === "string" && data.motherName
                      ? data.motherName
                      : prev.motherName,
                  fatherName:
                    typeof data.fatherName === "string" && data.fatherName
                      ? data.fatherName
                      : prev.fatherName,
                }
              : prev
          );
        }
      } catch (error) {
        console.warn("Could not load extra student details:", error);
      }
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            Admit Card
          </h2>
          <p className="text-gray-600 mt-1">
            Prepare the exam schedule (subject, date, time and applicable
            classes) and then generate the admit card of any student.
          </p>
        </div>
        <NavLink
          to="/welcome/exam/add"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
        >
          + Add Exam
        </NavLink>
      </div>

      {/* ---------------- Step 1: exam schedule ---------------- */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              1. Exam Schedule
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Choose the exam, then add every subject paper with its date, time
              and the classes it applies to.
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
                setCard(null);
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
                setCard(null);
                setGenerateError("");
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
            <NavLink to="/welcome/exam/add" className="underline">
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
                {marksSchemeBadge(examCategory, examScheme)}
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
                  const rowClasses = classesOfSubject(row.subject);
                  return (
                    <div
                      key={row.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-500">
                          Paper {index + 1}
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
                            value={row.subject}
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
                            {subjectOptions.map((option) => (
                              <option key={option.name} value={option.name}>
                                {option.name}
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
                                  ? `"${row.subject}" is not added to any class yet. Add it on the Subjects page first.`
                                  : "Select a subject to see the classes it is applicable to."}
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {rowClasses.map((className) => (
                                  <label
                                    key={className}
                                    className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300"
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
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
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

      {/* ---------------- Step 2: generate admit card ---------------- */}
      <section className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              2. Generate Admit Card
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Pick the class and the student. Only the papers applicable to that
              class are printed on the card.
            </p>
          </div>
          <span className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
            {selectedExam
              ? `${cardRows.length} paper${
                  cardRows.length === 1 ? "" : "s"
                } for ${
                  selectedClass ? toOrdinalLabel(selectedClass) : "the class"
                }`
              : "Select an exam in step 1"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="cardClass"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Class
            </label>
            <select
              id="cardClass"
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              disabled={!selectedExam || scheduledClasses.length === 0}
              className={inputClass}
            >
              <option value="">Select Class</option>
              {scheduledClasses.map((className) => (
                <option key={className} value={className}>
                  {toOrdinalLabel(className)}
                </option>
              ))}
            </select>
            {selectedExam && scheduledClasses.length === 0 && (
              <p className="mt-1 text-xs font-semibold text-amber-700">
                No class has a scheduled paper yet.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="cardStudent"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Student
            </label>
            <select
              id="cardStudent"
              value={selectedEnrollment}
              onChange={(event) => setSelectedEnrollment(event.target.value)}
              disabled={!selectedClass || loadingStudents}
              className={inputClass}
            >
              <option value="">
                {loadingStudents ? "Loading students..." : "Select Student"}
              </option>
              {classStudents.map((student) => (
                <option key={student.id} value={student.enrollment}>
                  {student.enrollment} —{" "}
                  {student.studentName ||
                    `${student.firstName} ${student.lastName}`.trim()}
                  {student.section ? ` (Sec ${student.section})` : ""}
                </option>
              ))}
            </select>
            {!loadingStudents && selectedClass && classStudents.length === 0 && (
              <p className="mt-1 text-xs font-semibold text-amber-700">
                No student found in this class
                {selectedYear ? ` for ${selectedYear}` : ""}.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!selectedExam || !selectedClass || !selectedEnrollment}
              className="rounded-md bg-amber-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate Admit Card
            </button>
            {card && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
              >
                <FaPrint /> Print
              </button>
            )}
          </div>
        </div>

        {generateError && (
          <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            {generateError}
          </p>
        )}
      </section>

{/* ---------------- Admit card preview ---------------- */}
      {card && selectedExam && (
        <div className="mx-auto mt-6 max-w-3xl overflow-hidden rounded-xl border-4 border-double border-blue-800 bg-white shadow-lg">
          {/* Card header */}
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-4 py-4 text-center text-white">
            <h3 className="text-lg font-bold leading-tight md:text-2xl">
              CHILDREN&apos;S VALLEY ENGLISH SCHOOL
            </h3>
            <p className="text-sm md:text-base">
              Mahmoorganj, Varanasi (UP) &middot; UDISE CODE: 0967091304
            </p>
            <div className="mt-2 inline-block rounded bg-amber-400 px-6 py-1 font-bold text-blue-900">
              ADMIT CARD
            </div>
          </div>

          {/* Exam strip */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-2 border-blue-800 bg-blue-50 px-4 py-3 text-sm md:px-6">
            <p>
              <span className="font-semibold">Examination:</span>{" "}
              {selectedExam.examName}
            </p>
            <p>
              <span className="font-semibold">Session:</span>{" "}
              {card.academicYear || selectedExam.academicYear || "-"}
            </p>
            <p>
              <span className="font-semibold">Class:</span>{" "}
              {toOrdinalLabel(card.className)}{" "}
              {card.section ? `- ${card.section}` : ""}
            </p>
          </div>

          {/* Student details + photo */}
          <div className="grid grid-cols-1 gap-6 border-b border-gray-200 p-4 md:p-6 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <p>
                <span className="font-semibold">Enrollment No.:</span>{" "}
                {card.enrollment || "-"}
              </p>
              <p>
                <span className="font-semibold">Student Name:</span>{" "}
                {card.studentName ||
                  `${card.firstName} ${card.lastName}`.trim() ||
                  "-"}
              </p>
              <p>
                <span className="font-semibold">Father&apos;s Name:</span>{" "}
                {card.fatherName || "-"}
              </p>
              <p>
                <span className="font-semibold">Mother&apos;s Name:</span>{" "}
                {card.motherName || "-"}
              </p>
              <p>
                <span className="font-semibold">Marks Scheme:</span>{" "}
                {marksSchemeBadge(examCategory, examScheme)}
              </p>
            </div>
            <div className="flex h-32 w-28 items-center justify-center rounded border-2 border-dashed border-gray-400 p-2 text-center text-xs text-gray-400">
              Affix recent photograph
            </div>
          </div>

          {/* Subject wise schedule */}
          <div className="p-4 md:p-6">
            <h4 className="mb-3 text-center font-bold text-gray-800">
              Subject-wise Exam Schedule
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-800">
                    <th className="border border-gray-300 px-3 py-2 text-left">
                      Subject
                    </th>
                    {cardUsesMarksScheme && (
                      <>
                        <th className="border border-gray-300 px-3 py-2">
                          {isUnitTest ? "Test" : "Theory"}
                        </th>
                        <th className="border border-gray-300 px-3 py-2">
                          Notebook
                        </th>
                        <th className="border border-gray-300 px-3 py-2">
                          Practical
                        </th>
                        <th className="border border-gray-300 px-3 py-2">
                          Total
                        </th>
                      </>
                    )}
                    <th className="border border-gray-300 px-3 py-2">Date</th>
                    <th className="border border-gray-300 px-3 py-2">
                      Reporting Time
                    </th>
                    <th className="border border-gray-300 px-3 py-2">End Time</th>
                  </tr>
                </thead>
                <tbody>
                  {cardRows.map((row) => {
                    const breakdown = subjectMarksBreakdown(
                      row.subject,
                      examCategory,
                      examScheme
                    );
                    return (
                      <tr key={row.id}>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">
                          {row.subject}
                        </td>
                        {cardUsesMarksScheme && (
                          <>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              {breakdown.theory}
                            </td>
                            <td
                              className={`border border-gray-300 px-3 py-2 text-center ${
                                breakdown.notebook > 0
                                  ? ""
                                  : "text-gray-400"
                              }`}
                            >
                              {marksCellLabel(
                                breakdown.notebook,
                                breakdown.notebook > 0
                              )}
                            </td>
                            <td
                              className={`border border-gray-300 px-3 py-2 text-center ${
                                breakdown.hasPractical
                                  ? "font-bold text-amber-700"
                                  : "text-gray-400"
                              }`}
                            >
                              {marksCellLabel(
                                breakdown.practical,
                                breakdown.hasPractical
                              )}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center font-bold">
                              {breakdown.total}
                            </td>
                          </>
                        )}
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {formatScheduleDate(row.date)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {formatScheduleTime(row.fromTime)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {formatScheduleTime(row.toTime)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {cardUsesMarksScheme && (
              <p className="mt-3 text-xs leading-relaxed text-gray-600">
                <span className="font-semibold">
                  Marks scheme (classes 1 to 8):
                </span>{" "}
                {isUnitTest
                  ? `Notebook ${examScheme.notebookMarks} + written test ${examScheme.testMarks} = ${
                      examScheme.notebookMarks + examScheme.testMarks
                    } marks per subject.`
                  : `Theory ${examScheme.theoryMarks} for all subjects; Science & Computer ${examScheme.practicalTheoryMarks} theory + ${examScheme.practicalMarks} practical. Practical is shown as "NA" for other subjects.`}
              </p>
            )}

            {/* Instructions */}
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50/60 p-3">
              <h5 className="text-sm font-bold text-gray-800">
                Instructions to the candidate
              </h5>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-gray-700">
                <li>
                  Reach the examination hall at least 15 minutes before the
                  reporting time printed above.
                </li>
                <li>
                  Bring this admit card along with a recent passport size
                  photograph; entry is not allowed without it.
                </li>
                <li>
                  Use only blue or black ink. Mobile phones and smart watches are
                  strictly prohibited.
                </li>
                <li>
                  Read every question carefully and write the answers in your own
                  handwriting.
                </li>
                <li>
                  The school is not responsible for any loss of personal
                  belongings in the examination hall.
                </li>
              </ol>
            </div>

            {/* QR + signatures */}
            <div className="mt-6 flex flex-wrap items-end justify-between gap-6 text-sm text-gray-700">
              <div className="text-center">
                <p className="w-36 border-t-2 border-gray-400 pt-2">
                  Class Teacher
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <QRCodeCanvas value="https://cves.in" size={72} />
                <span className="text-xs font-semibold text-gray-600">
                  www.cves.in
                </span>
              </div>
              <div className="text-center">
                <p className="w-36 border-t-2 border-gray-400 pt-2">Principal</p>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-gray-500">
              This admit card is valid only for {selectedExam.examName}
              {selectedExam.academicYear
                ? ` (${selectedExam.academicYear})`
                : ""}{" "}
              and must be produced on every examination day.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdmitCard;