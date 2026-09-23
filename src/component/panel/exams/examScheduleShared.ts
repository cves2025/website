/**
 * Helpers shared by the Admit Card module.
 *
 * The module is split into: the hub (`AdmitCard.tsx`), the schedule editor
 * (`ExamSchedule.tsx`) and the generated-admit-cards page
 * (`GeneratedAdmitCards.tsx`). All read the same Firestore documents, so
 * the converters and the live listeners live here once instead of being copied
 * into every page.
 */
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  collection,
  doc,
  DocumentData,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { CLASSES, COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toDateOrNull } from "../../../utils/toDateOrNull";
import { isSameClassName } from "../../../utils/normalizeClassName";
import { ExamCategory, marksSchemeFromDoc } from "../../../utils/examMarksScheme";
import {
  CardStudent,
  ExamDoc,
  ScheduleRow,
  SubjectOption,
} from "../../../utils/type";

/** Route of the Admit Card hub. */
export const ADMIT_CARD_PATH = "/welcome/admit-card";
/** Route of the exam schedule editor. */
export const EXAM_SCHEDULE_PATH = "/welcome/admit-card/schedule";
/** Route of the page that shows the generated admit cards. */
export const GENERATED_ADMIT_CARDS_PATH = "/welcome/admit-card/generated";
/** Route of the Exam templates page. */
export const ADD_EXAM_PATH = "/welcome/exam/add";

// Kept local to avoid re-computing on every render; the list only grows over time.
export const academicYears = generateAcademicYears();

export const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed";

export function toExamCategory(value: unknown): ExamCategory {
  return value === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
}

export function toExamDoc(
  snapshot: QueryDocumentSnapshot<DocumentData>
): ExamDoc {
  const data = snapshot.data();
  const maxMarks = typeof data.maxMarks === "number" ? data.maxMarks : 0;
  return {
    id: snapshot.id,
    examName: typeof data.examName === "string" ? data.examName : "",
    examCategory: toExamCategory(data.examCategory),
    academicYear:
      typeof data.academicYear === "string" ? data.academicYear : "",
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
export function toSubjectOptions(
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
export function toScheduleRows(data: DocumentData): ScheduleRow[] {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row, index) => ({
      id:
        typeof row.id === "string" && row.id
          ? row.id
          : `row-${index}-${Date.now()}`,
      subject: typeof row.subject === "string" ? row.subject : "",
      subjectType:
        typeof row.subjectType === "string" ? row.subjectType : "",
      date: typeof row.date === "string" ? row.date : "",
      fromTime: typeof row.fromTime === "string" ? row.fromTime : "",
      toTime: typeof row.toTime === "string" ? row.toTime : "",
      allClasses: row.allClasses === true,
      classes: Array.isArray(row.classes)
        ? row.classes.filter((cls): cls is string => typeof cls === "string")
        : [],
    }));
}


/**
 * "English" + "Written" -> "English (Written)". Returns the plain name when no
 * type is given, so legacy subjects keep showing as before.
 */
export function formatSubjectWithType(name: string, type: string): string {
  const trimmedName = name.trim();
  const trimmedType = type.trim();
  return trimmedType ? `${trimmedName} (${trimmedType})` : trimmedName;
}

/** Date / Timestamp / string -> "yyyy-MM-dd" for <input type="date">. */
export function toDateInputValue(value: unknown): string {
  const date = toDateOrNull(value);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "yyyy-MM-dd" (schedule field value) -> "10 Jan 2026". */
export function formatScheduleDate(value: string): string {
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
export function formatScheduleTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return value || "-";
  const hours = Number(match[1]);
  if (hours > 23) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${match[2]} ${suffix}`;
}

/** True when a schedule row must appear on a card of the given class. */
export function rowAppliesToClass(
  row: ScheduleRow,
  className: string,
  subjectClasses: string[]
): boolean {
  if (!row.subject) return false;
  if (row.allClasses) return subjectClasses.includes(className);
  return row.classes.includes(className);
}

export function newRowId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Maps one enrollments document into an admit card student. */
export function toCardStudent(
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
    academicYear:
      typeof data.academicYear === "string" ? data.academicYear : "",
    fatherName: typeof data.fatherName === "string" ? data.fatherName : "",
    motherName: typeof data.motherName === "string" ? data.motherName : "",
  };
}

/** Section / enrollment order used by every student picker. */
export function sortCardStudents(a: CardStudent, b: CardStudent): number {
  return (
    a.section.localeCompare(b.section) ||
    a.enrollment.localeCompare(b.enrollment, undefined, { numeric: true })
  );
}

/**
 * One-shot fallback for students whose class was stored in a different spelling
 * ("5th" / "Class 5" / "V") by an older bulk import.
 *
 * The normal path is a single indexed equality query; this is only used when
 * that query returns nothing, so it costs one extra read and keeps students of
 * such classes visible on the admit card and exam pages.
 */
export async function loadStudentsWithClassNameVariants(
  className: string
): Promise<CardStudent[]> {
  const snapshot = await getDocs(collection(db, COLLECTION.ENROLLMENTS));
  return snapshot.docs
    .map(toCardStudent)
    .filter((student): student is CardStudent => student !== null)
    .filter((student) => isSameClassName(student.className, className))
    .sort(sortCardStudents);
}

/* --------------------------------------------------------------- links -- */

/**
 * Builds a link to the card / schedule page already focused on one exam, so the
 * pages keep the same exam selected while the user moves between them.
 */
export function examPageLink(
  path: string,
  examId: string,
  academicYear: string
): string {
  const params = new URLSearchParams();
  if (examId) params.set("exam", examId);
  if (academicYear) params.set("year", academicYear);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export interface RequestedExam {
  /** Exam id from ?exam=<id>, empty when the page was opened directly. */
  examId: string;
  /** Academic year from ?year=<value>, empty when not provided. */
  academicYear: string;
}

/** Reads the exam / year the page was opened with (?exam=<id>&year=<value>). */
export function useRequestedExam(): RequestedExam {
  const [searchParams] = useSearchParams();
  return {
    examId: searchParams.get("exam") ?? "",
    academicYear: searchParams.get("year") ?? "",
  };
}

/**
 * Keeps the academic year filter in sync with the exam asked for in the URL.
 * The request is applied only once, so the user can still change the year
 * filter afterwards without being pulled back.
 */
export function useRequestedExamYear(
  requestedExamId: string,
  exams: ExamDoc[],
  loadingExams: boolean,
  applyYear: (academicYear: string) => void
): void {
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !requestedExamId || loadingExams) return;
    const exam = exams.find((item) => item.id === requestedExamId);
    if (!exam) return;
    applied.current = true;
    if (exam.academicYear) applyYear(exam.academicYear);
  }, [requestedExamId, exams, loadingExams, applyYear]);
}

/* --------------------------------------------------------------- hooks -- */

/** Exam templates saved on the Add Exam page, kept in sync with Firestore. */
export function useExamTemplates(): {
  exams: ExamDoc[];
  loadingExams: boolean;
} {
  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

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

  return { exams, loadingExams };
}

/** Subjects added on the Subjects page (all classes) + class lookup helpers. */
export function useSubjectOptions(): {
  subjectOptions: SubjectOption[];
  loadingSubjects: boolean;
  classesOfSubject: (subjectName: string) => string[];
  classesOfSubjectType: (subjectName: string, subjectType: string) => string[];
  typeOfSubjectInClass: (subjectName: string, className: string) => string[];
} {
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [subjectTypesByClass, setSubjectTypesByClass] = useState<
    Map<string, string[]>
  >(new Map());
  const [classesBySubjectType, setClassesBySubjectType] = useState<
    Map<string, string[]>
  >(new Map());
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION.SUBJECTS),
      (snapshot) => {
        setSubjectOptions(toSubjectOptions(snapshot.docs));

        /* Type of every <class, subject> pair. The admit card "Type" column
           reads this so the type of the printed class is never mixed with the
           type another class gave to the same subject (e.g. English is
           "Written + Oral" in Nursery but "Theory" in Class 1). */
        const typesByClass = new Map<string, string[]>();
        snapshot.docs.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();
          const name =
            typeof data.name === "string" ? data.name.trim() : "";
          const className =
            typeof data.className === "string" ? data.className.trim() : "";
          const type = typeof data.type === "string" ? data.type : "";
          if (!name || !className || !type) return;
          const key = `${className.toLowerCase()}::${name.toLowerCase()}`;
          const list = typesByClass.get(key) ?? [];
          if (!list.includes(type)) list.push(type);
          typesByClass.set(key, list);
        });
        setSubjectTypesByClass(typesByClass);

        /* Classes that teach each <subject, type> pair. The Exam Schedule page
           uses this to know which classes a paper like "English (Written)" is
           applicable to. */
        const classesByType = new Map<string, string[]>();
        snapshot.docs.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();
          const name =
            typeof data.name === "string" ? data.name.trim() : "";
          const className =
            typeof data.className === "string" ? data.className.trim() : "";
          const type = typeof data.type === "string" ? data.type : "";
          if (!name || !className || !type) return;
          const key = `${name.toLowerCase()}::${type.toLowerCase()}`;
          const classes = classesByType.get(key) ?? [];
          if (!classes.includes(className)) classes.push(className);
          classesByType.set(key, classes);
        });
        const toClassOrder = (className: string) => {
          const index = CLASSES.indexOf(className);
          return index === -1 ? CLASSES.length : index;
        };
        classesByType.forEach((classes) =>
          classes.sort((a, b) => toClassOrder(a) - toClassOrder(b))
        );
        setClassesBySubjectType(classesByType);

        setLoadingSubjects(false);
      },
      (error) => {
        console.error("Failed to load subjects:", error);
        setLoadingSubjects(false);
      }
    );

    return unsubscribe;
  }, []);

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

  /* Classes that teach one <subject, type> pair (case-insensitive). */
  const classesOfSubjectType = (
    subjectName: string,
    subjectType: string
  ): string[] =>
    classesBySubjectType.get(
      `${subjectName.trim().toLowerCase()}::${subjectType.trim().toLowerCase()}`
    ) ?? [];

  /* Types of one subject in one class (case-insensitive subject & class). */
  const typeOfSubjectInClass = (
    subjectName: string,
    className: string
  ): string[] =>
    subjectTypesByClass.get(
      `${className.trim().toLowerCase()}::${subjectName.trim().toLowerCase()}`
    ) ?? [];

  return {
    subjectOptions,
    loadingSubjects,
    classesOfSubject,
    classesOfSubjectType,
    typeOfSubjectInClass,
  };
}

export interface ExamScheduleDraft {
  rows: ScheduleRow[];
  setRows: Dispatch<SetStateAction<ScheduleRow[]>>;
  loadingSchedule: boolean;
  /** createdAt of the saved schedule, kept when the schedule is re-saved. */
  scheduleCreatedAt: unknown;
}

/**
 * Saved schedule of the selected exam (document id = exam id) plus the local
 * draft the editor page changes before saving.
 */
export function useExamScheduleDraft(examId: string): ExamScheduleDraft {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleCreatedAt, setScheduleCreatedAt] = useState<unknown>(null);

  useEffect(() => {
    if (!examId) {
      setRows([]);
      setScheduleCreatedAt(null);
      setLoadingSchedule(false);
      return;
    }

    let cancelled = false;
    setLoadingSchedule(true);

    const unsubscribe = onSnapshot(
      doc(db, COLLECTION.EXAM_SCHEDULES, examId),
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
  }, [examId]);

  return { rows, setRows, loadingSchedule, scheduleCreatedAt };
}