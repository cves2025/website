import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { CLASSES, COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { CardStudent } from "../../../utils/type";
import type { SearchableOption } from "../../../custom-components/SearchableMultiSelect";
import {
  academicYears,
  loadStudentsWithClassNameVariants,
  rowAppliesToClass,
  sortCardStudents,
  toCardStudent,
  useExamScheduleDraft,
  useExamTemplates,
  useSubjectOptions,
} from "./examScheduleShared";

/** One printed paper: a schedule row expanded per subject type. */
export interface CardPaper {
  id: string;
  subject: string;
  type: string;
  date: string;
  fromTime: string;
  toTime: string;
}

interface UseAdmitCardGeneratorOptions {
  /** Academic year the page starts on (from the URL / modal). */
  initialYear?: string;
  /** Exam opened from the URL (?exam=<id>). */
  initialExamId?: string;
  /** Class selected from the URL (?class=<name>). */
  initialClass?: string;
  /** Enrollments selected from the URL (?students=a,b,c). */
  initialEnrollments?: string[];
  /** Start with "all students of the class" selected (?students=all). */
  allStudentsInitially?: boolean;
  /** Automatically generate the cards once the selection has loaded. */
  autoGenerate?: boolean;
}

/**
 * Everything the admit card flow needs in one place: the exam templates, the
 * saved schedule of the picked exam, the live student list of the picked class
 * and the derived values used by the step UI and the printed cards.
 *
 * Used by the "Generate Admit Card" modal (AdmitCard hub) and by the
 * generated-admit-cards page, which restores the same selection from the URL.
 */
export function useAdmitCardGenerator(
  options: UseAdmitCardGeneratorOptions = {},
) {
  const { exams, loadingExams } = useExamTemplates();
  const { classesOfSubject, typeOfSubjectInClass } = useSubjectOptions();

  const [selectedYear, setSelectedYear] = useState(
    options.initialYear || academicYears[0]?.value || "",
  );
  const [selectedExamId, setSelectedExamId] = useState(
    options.initialExamId || "",
  );
  const { rows, loadingSchedule } = useExamScheduleDraft(selectedExamId);

  const [selectedClass, setSelectedClass] = useState(
    options.initialClass || "",
  );
  const [classStudents, setClassStudents] = useState<CardStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>(
    options.initialEnrollments ?? [],
  );
  const [allStudents, setAllStudents] = useState(
    options.allStudentsInitially ?? false,
  );
  const [generateError, setGenerateError] = useState("");
  const [cards, setCards] = useState<CardStudent[]>([]);
  const [showOtherSessions, setShowOtherSessions] = useState(false);
  const [studentListNote, setStudentListNote] = useState("");
  /** True when the student list of the class has finished loading. */
  const [studentsResolved, setStudentsResolved] = useState(false);

  /* Keeps the year filter aligned with the exam asked for in the URL. */
  const yearAligned = useRef(false);
  useEffect(() => {
    if (yearAligned.current || loadingExams || !options.initialExamId) return;
    const exam = exams.find((item) => item.id === options.initialExamId);
    if (!exam) return;
    yearAligned.current = true;
    if (exam.academicYear) setSelectedYear(exam.academicYear);
  }, [loadingExams, exams, options.initialExamId]);

  /* Students of the selected class, used for the admit card. */
  const previousClassRef = useRef<string | null>(null);
  useEffect(() => {
    const previousClass = previousClassRef.current;
    previousClassRef.current = selectedClass;

    /* Clear the picker whenever the user moves to another class, but never on
       the first load — the generated-cards page sits on a selection restored
       from the URL and must keep it. */
    if (previousClass !== null && previousClass !== selectedClass) {
      setSelectedEnrollments([]);
      setAllStudents(false);
    }
    setCards([]);
    setGenerateError("");
    setStudentListNote("");
    setShowOtherSessions(false);
    setStudentsResolved(false);

    if (!selectedClass) {
      setClassStudents([]);
      setLoadingStudents(false);
      return;
    }

    let cancelled = false;
    setLoadingStudents(true);

    const studentsQuery = query(
      collection(db, COLLECTION.ENROLLMENTS),
      where("className", "==", selectedClass),
    );

    const applyStudents = (list: CardStudent[]) => {
      setClassStudents(list);
      setLoadingStudents(false);
    };

    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        if (cancelled) return;
        const list = snapshot.docs
          .map(toCardStudent)
          .filter((student): student is CardStudent => student !== null)
          .sort(sortCardStudents);
        applyStudents(list);

        // A bulk upload of an older file may have stored the class as "5th" /
        // "Class 5" / "V". When the exact query finds nothing, the students of
        // this class are matched once in memory so they still show up here.
        if (list.length === 0) {
          void loadStudentsWithClassNameVariants(selectedClass)
            .then((variantList) => {
              if (cancelled || variantList.length === 0) return;
              applyStudents(variantList);
              setStudentListNote(
                `No student is stored with the class name exactly "${selectedClass}". The ${variantList.length} student(s) listed below were matched from other spellings of the same class (like "5th" or "Class 5"). Saving those students again with the standard class name removes this note.`,
              );
            })
            .catch((error) => {
              console.warn(
                "Could not match students by class spelling:",
                error,
              );
            })
            .finally(() => {
              if (!cancelled) setStudentsResolved(true);
            });
        } else {
          setStudentsResolved(true);
        }
      },
      (error) => {
        if (cancelled) return;
        console.error("Failed to load students:", error);
        setLoadingStudents(false);
        setStudentsResolved(true);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [selectedClass]);

  /* ------------------------------------------------------------ derived -- */
  const yearExams = useMemo(
    () =>
      exams.filter(
        (exam) =>
          exam.status === "active" &&
          (!selectedYear || exam.academicYear === selectedYear),
      ),
    [exams, selectedYear],
  );

  const selectedExam =
    yearExams.find((exam) => exam.id === selectedExamId) ?? null;

  /* Classes that have at least one applicable paper in the schedule. */
  const scheduledClasses = CLASSES.filter((className) =>
    rows.some(
      (row) =>
        row.subject &&
        rowAppliesToClass(row, className, classesOfSubject(row.subject)),
    ),
  );

  /* Papers shown on the card of the selected class. */
  const cardRows = selectedClass
    ? rows.filter(
        (row) =>
          row.subject &&
          rowAppliesToClass(row, selectedClass, classesOfSubject(row.subject)),
      )
    : [];

  /* One printed paper per subject type. A subject saved with several types
     (e.g. "Computer" -> Theory & Practical) is printed once for each of them,
     so the practical papers can live in their own table below the written
     ones. The schedule itself allows only one row per subject. */
  const cardPapers: CardPaper[] = useMemo(() => {
    if (!selectedClass) return [];
    const papers: CardPaper[] = [];
    cardRows.forEach((row) => {
      const types = typeOfSubjectInClass(row.subject, selectedClass);
      (types.length > 0 ? types : [""]).forEach((type) => {
        papers.push({
          id: `${row.id}::${type || "general"}`,
          subject: row.subject,
          type,
          date: row.date,
          fromTime: row.fromTime,
          toTime: row.toTime,
        });
      });
    });
    return papers;
  }, [cardRows, selectedClass, typeOfSubjectInClass]);

  const isPracticalPaper = (paper: CardPaper) =>
    paper.type.trim().toLowerCase() === "practical";

  const writtenPapers = cardPapers.filter((paper) => !isPracticalPaper(paper));
  const practicalPapers = cardPapers.filter(isPracticalPaper);

  /* Students of the class that fit the selected session. A student whose
     session was never saved (many bulk uploaded rows) is always kept, so the
     picker can never hide a student silently. */
  const matchesSelectedSession = (student: CardStudent) =>
    !selectedYear ||
    !student.academicYear ||
    student.academicYear === selectedYear;

  const otherSessionStudents = classStudents.filter(
    (student) => !matchesSelectedSession(student),
  );

  const visibleStudents = showOtherSessions
    ? classStudents
    : classStudents.filter(matchesSelectedSession);

  /* Options of the searchable student box: name, father's name, section and
     enrollment are all searchable, the session is shown as a hint. */
  const studentOptions: SearchableOption[] = visibleStudents.map((student) => {
    const name =
      student.studentName ||
      `${student.firstName} ${student.lastName}`.trim() ||
      "(name not saved)";
    return {
      value: student.enrollment,
      label: `${student.enrollment} — ${name}${
        student.section ? ` (Sec ${student.section})` : ""
      }`,
      hint: student.academicYear
        ? matchesSelectedSession(student)
          ? `Session ${student.academicYear}`
          : `Session ${student.academicYear} · other session`
        : "Session not set",
      keywords: [
        student.studentName,
        student.firstName,
        student.lastName,
        student.fatherName,
        student.section,
        student.enrollment,
      ]
        .filter(Boolean)
        .join(" "),
    };
  });

  /* ----------------------------------------------------------- handlers -- */
  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    setSelectedExamId("");
    setSelectedClass("");
    setSelectedEnrollments([]);
    setAllStudents(false);
    setCards([]);
    setGenerateError("");
  };

  const handleExamChange = (value: string) => {
    setSelectedExamId(value);
    setSelectedClass("");
    setSelectedEnrollments([]);
    setAllStudents(false);
    setCards([]);
    setGenerateError("");
  };

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };

  const handleSelectAllStudents = (checked: boolean) => {
    setAllStudents(checked);
    if (checked) setSelectedEnrollments([]);
  };

  const handleGenerate = useCallback(
    async (loadDetails = true): Promise<boolean> => {
      setGenerateError("");
      setCards([]);

      if (!selectedExam) {
        setGenerateError("Select an exam first.");
        return false;
      }
      if (!selectedClass) {
        setGenerateError("Select the class of the student.");
        return false;
      }
      if (!allStudents && selectedEnrollments.length === 0) {
        setGenerateError("Select at least one student.");
        return false;
      }

      const selectedStudents = allStudents
        ? visibleStudents
        : classStudents.filter((student) =>
            selectedEnrollments.includes(student.enrollment),
          );
      if (selectedStudents.length === 0) {
        setGenerateError(
          "The selected student(s) were not found in this class.",
        );
        return false;
      }
      if (cardRows.length === 0) {
        setGenerateError(
          `No subject paper in the schedule is applicable to class ${toOrdinalLabel(
            selectedClass,
          )}.`,
        );
        return false;
      }

      setCards(selectedStudents);

      /* The modal only needs a valid selection before navigating away, so it
         skips the per-student reads; the generated page loads them. */
      if (!loadDetails) return true;

      // Extra details (mother's / father's name) live on the students document.
      const details = await Promise.all(
        selectedStudents.map(async (student) => {
          const empty = {
            id: student.id,
            motherName: "",
            fatherName: "",
            studentPhoto: "",
          };
          if (!student.studentId) return empty;
          try {
            const snapshot = await getDoc(
              doc(db, COLLECTION.STUDENTS, student.studentId),
            );
            if (!snapshot.exists()) return empty;
            const data = snapshot.data();
            return {
              id: student.id,
              motherName:
                typeof data.motherName === "string" ? data.motherName : "",
              fatherName:
                typeof data.fatherName === "string" ? data.fatherName : "",
              studentPhoto:
                typeof data.studentPhoto === "string" ? data.studentPhoto : "",
            };
          } catch (error) {
            console.warn("Could not load extra student details:", error);
            return empty;
          }
        }),
      );

      setCards((prev) =>
        prev.map((student) => {
          const detail = details.find((item) => item.id === student.id);
          if (!detail) return student;
          return {
            ...student,
            motherName: detail.motherName || student.motherName,
            fatherName: detail.fatherName || student.fatherName,
            studentPhoto: detail.studentPhoto || student.studentPhoto,
          };
        }),
      );

      return true;
    },
    [
      selectedExam,
      selectedClass,
      allStudents,
      selectedEnrollments,
      visibleStudents,
      classStudents,
      cardRows,
    ],
  );

  /* Auto-generate the cards once everything is ready (generated page). */
  const autoGenerated = useRef(false);
  useEffect(() => {
    if (!options.autoGenerate || autoGenerated.current) return;
    const ready =
      Boolean(selectedExam) &&
      Boolean(selectedClass) &&
      studentsResolved &&
      !loadingExams &&
      !loadingSchedule &&
      !loadingStudents;
    if (!ready) return;
    autoGenerated.current = true;
    void handleGenerate();
  }, [
    options.autoGenerate,
    selectedExam,
    selectedClass,
    studentsResolved,
    loadingExams,
    loadingSchedule,
    loadingStudents,
    handleGenerate,
  ]);

  return {
    exams,
    loadingExams,
    selectedYear,
    handleYearChange,
    selectedExamId,
    handleExamChange,
    yearExams,
    selectedExam,
    rows,
    loadingSchedule,
    scheduledClasses,
    selectedClass,
    handleClassChange,
    classStudents,
    loadingStudents,
    selectedEnrollments,
    setSelectedEnrollments,
    allStudents,
    handleSelectAllStudents,
    otherSessionStudents,
    visibleStudents,
    showOtherSessions,
    setShowOtherSessions,
    studentOptions,
    studentListNote,
    cardRows,
    cardPapers,
    writtenPapers,
    practicalPapers,
    generateError,
    cards,
    handleGenerate,
  };
}

export type AdmitCardGenerator = ReturnType<typeof useAdmitCardGenerator>;