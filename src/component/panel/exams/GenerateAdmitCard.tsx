import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import { FaPrint } from "react-icons/fa";
import { CLASSES, COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import SearchableMultiSelect, {
  SearchableOption,
} from "../../../custom-components/SearchableMultiSelect";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import {
  ExamCategory,
  MarksScheme,
  defaultMarksScheme,
  isSchemeClass,
  marksCellLabel,
  marksSchemeBadge,
  subjectMarksBreakdown,
} from "../../../utils/examMarksScheme";
import { CardStudent } from "../../../utils/type";
import {
  ADD_EXAM_PATH,
  ADMIT_CARD_PATH,
  EXAM_SCHEDULE_PATH,
  academicYears,
  examPageLink,
  formatScheduleDate,
  formatScheduleTime,
  inputClass,
  loadStudentsWithClassNameVariants,
  rowAppliesToClass,
  sortCardStudents,
  toCardStudent,
  useExamScheduleDraft,
  useExamTemplates,
  useRequestedExam,
  useRequestedExamYear,
  useSubjectOptions,
} from "./examScheduleShared";

/**
 * Admit Card page (step 2 of the Admit Card module).
 *
 * It reads the schedule saved on the Exam Schedule page (`ExamSchedule.tsx`)
 * and prints the papers applicable to the class of the selected student.
 */
function GenerateAdmitCard() {
  /* ---------------------------------------------------------------- exams */
  const { exams, loadingExams } = useExamTemplates();
  // A link from the schedule page can carry ?exam=<id>&year=<value>.
  const { examId: requestedExamId, academicYear: requestedYear } =
    useRequestedExam();
  const [selectedYear, setSelectedYear] = useState(
    requestedYear || academicYears[0]?.value || ""
  );
  const [selectedExamId, setSelectedExamId] = useState(requestedExamId);

  /* ------------------------------------------------------------- subjects */
  const { classesOfSubject } = useSubjectOptions();

  /* ------------------------------------------------------------- schedule */
  /* Saved schedule of the selected exam, read only on this page. */
  const { rows, loadingSchedule } = useExamScheduleDraft(selectedExamId);

  /* ------------------------------------------------------------- generate */
  const [selectedClass, setSelectedClass] = useState("");
  const [classStudents, setClassStudents] = useState<CardStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  /** Enrollments picked in the searchable student box (multi-select). */
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [generateError, setGenerateError] = useState("");
  /** Students whose admit cards are currently shown (one card per student). */
  const [cards, setCards] = useState<CardStudent[]>([]);
  /** Reveals students of the class that belong to another session. */
  const [showOtherSessions, setShowOtherSessions] = useState(false);
  /** Note shown when students were matched through a different class spelling. */
  const [studentListNote, setStudentListNote] = useState("");

  /* Keeps the year filter aligned with the exam asked for in the URL. */
  useRequestedExamYear(requestedExamId, exams, loadingExams, setSelectedYear);

  /* Students of the selected class, used for the admit card. */
  useEffect(() => {
    setSelectedEnrollments([]);
    setCards([]);
    setGenerateError("");
    setStudentListNote("");
    setShowOtherSessions(false);

    if (!selectedClass) {
      setClassStudents([]);
      setLoadingStudents(false);
      return;
    }

    let cancelled = false;
    setLoadingStudents(true);

    // Only one equality filter is used so no composite index is required; the
    // session filter runs in memory afterwards.
    const studentsQuery = query(
      collection(db, COLLECTION.ENROLLMENTS),
      where("className", "==", selectedClass)
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
                `No student is stored with the class name exactly "${selectedClass}". The ${variantList.length} student(s) listed below were matched from other spellings of the same class (like "5th" or "Class 5"). Saving those students again with the standard class name removes this note.`
              );
            })
            .catch((error) => {
              console.warn("Could not match students by class spelling:", error);
            });
        }
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
  }, [selectedClass]);

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
  const cardUsesMarksScheme = cards[0]
    ? isSchemeClass(cards[0].className)
    : false;

  /* Students of the class that fit the selected session. A student whose
     session was never saved (many bulk uploaded rows) is always kept, so the
     picker can never hide a student silently. */
  const matchesSelectedSession = (student: CardStudent) =>
    !selectedYear ||
    !student.academicYear ||
    student.academicYear === selectedYear;

  const otherSessionStudents = classStudents.filter(
    (student) => !matchesSelectedSession(student)
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
  const handleGenerate = async () => {
    setGenerateError("");
    setCards([]);

    if (!selectedExam) {
      setGenerateError("Select an exam first.");
      return;
    }
    if (!selectedClass) {
      setGenerateError("Select the class of the student.");
      return;
    }
    if (selectedEnrollments.length === 0) {
      setGenerateError("Select at least one student.");
      return;
    }

    const selectedStudents = classStudents.filter((student) =>
      selectedEnrollments.includes(student.enrollment)
    );
    if (selectedStudents.length === 0) {
      setGenerateError("The selected student(s) were not found in this class.");
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

    setCards(selectedStudents);

    // Extra details (mother's / father's name) live on the students document.
    const details = await Promise.all(
      selectedStudents.map(async (student) => {
        const empty = { id: student.id, motherName: "", fatherName: "" };
        if (!student.studentId) return empty;
        try {
          const snapshot = await getDoc(
            doc(db, COLLECTION.STUDENTS, student.studentId)
          );
          if (!snapshot.exists()) return empty;
          const data = snapshot.data();
          return {
            id: student.id,
            motherName:
              typeof data.motherName === "string" ? data.motherName : "",
            fatherName:
              typeof data.fatherName === "string" ? data.fatherName : "",
          };
        } catch (error) {
          console.warn("Could not load extra student details:", error);
          return empty;
        }
      })
    );

    setCards((prev) =>
      prev.map((student) => {
        const detail = details.find((item) => item.id === student.id);
        if (!detail) return student;
        return {
          ...student,
          motherName: detail.motherName || student.motherName,
          fatherName: detail.fatherName || student.fatherName,
        };
      })
    );
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            Admit Card
          </h2>
          <p className="text-gray-600 mt-1">
            Pick the exam, the class and the student. Only the papers applicable
            to that class are printed on the card.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NavLink
            to={ADMIT_CARD_PATH}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
          >
            ← Admit Card
          </NavLink>
          <NavLink
            to={examPageLink(
              EXAM_SCHEDULE_PATH,
              selectedExamId,
              selectedExam?.academicYear || selectedYear
            )}
            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
          >
            Exam Schedule
          </NavLink>
          <NavLink
            to={ADD_EXAM_PATH}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
          >
            + Add Exam
          </NavLink>
        </div>
      </div>

      {/* ---------------- Select the examination ---------------- */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 print:hidden">
        <h3 className="text-lg font-bold text-gray-800">Select Examination</h3>
        <p className="text-sm text-gray-600 mt-0.5">
          The papers of the selected exam are read from the Exam Schedule page.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="cardYear"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Academic Year
            </label>
            <select
              id="cardYear"
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(event.target.value);
                setSelectedExamId("");
                setCards([]);
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
              htmlFor="cardExam"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Exam
            </label>
            <select
              id="cardExam"
              value={selectedExamId}
              onChange={(event) => {
                setSelectedExamId(event.target.value);
                setCards([]);
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
            <NavLink to={ADD_EXAM_PATH} className="underline">
              Add Exam
            </NavLink>{" "}
            page first.
          </p>
        )}

        {selectedExam && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
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
        )}

        {loadingSchedule && (
          <p className="mt-3 text-sm font-semibold text-gray-500">
            Loading saved schedule...
          </p>
        )}

        {selectedExam && !loadingSchedule && rows.length === 0 && (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
            No subject paper is saved for this exam yet. Add the papers on the{" "}
            <NavLink to={examPageLink(EXAM_SCHEDULE_PATH, selectedExamId, selectedExam.academicYear || selectedYear)} className="underline">
              Exam Schedule
            </NavLink>{" "}
            page, then generate the card again.
          </p>
        )}
      </section>

      {/* ---------------- Generate admit card ---------------- */}
      <section className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Generate Admit Card
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Pick the class and the student. Only the papers applicable to that
              class are printed on the card.
            </p>
          </div>
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
              {!selectedExam
                ? "Select an exam above"
                : loadingSchedule
                  ? "Loading schedule..."
                  : `${cardRows.length} paper${
                      cardRows.length === 1 ? "" : "s"
                    } for ${
                      selectedClass ? toOrdinalLabel(selectedClass) : "the class"
                    }`}
            </span>
            <span className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
              {selectedEnrollments.length} student
              {selectedEnrollments.length === 1 ? "" : "s"} selected
            </span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
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

          <div className="lg:col-span-2 xl:col-span-2">
            <SearchableMultiSelect
              id="cardStudent"
              label="Student"
              required
              options={studentOptions}
              values={selectedEnrollments}
              onChange={setSelectedEnrollments}
              disabled={!selectedClass || loadingStudents}
              loading={loadingStudents}
              loadingLabel="Loading students..."
              placeholder={
                selectedClass
                  ? `Select student(s) of ${toOrdinalLabel(selectedClass)}`
                  : "Select a class first"
              }
              searchPlaceholder="Search by name, father's name, enrollment..."
              emptyMessage={
                selectedClass
                  ? `No student found for ${toOrdinalLabel(selectedClass)}`
                  : "Select a class first"
              }
              helpText={`${visibleStudents.length} of ${classStudents.length} student(s) of ${
                selectedClass ? toOrdinalLabel(selectedClass) : "the class"
              } listed. Search covers name, father's name, section and enrollment.`}
            />
          </div>

          <div className="flex items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={
                !selectedExam ||
                !selectedClass ||
                selectedEnrollments.length === 0
              }
              className="rounded-md bg-amber-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedEnrollments.length > 1
                ? `Generate ${selectedEnrollments.length} Admit Cards`
                : "Generate Admit Card"}
            </button>
            {cards.length > 0 && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
              >
                <FaPrint /> Print
                {cards.length > 1 ? ` all ${cards.length}` : ""}
              </button>
            )}
          </div>
        </div>

        {/* Students of this class that belong to another session stay hidden
            unless the admin asks for them, so a wrong session in an uploaded
            file can never look like "student missing". */}
        {selectedClass && otherSessionStudents.length > 0 && (
          <label className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <input
              type="checkbox"
              checked={showOtherSessions}
              onChange={(event) => setShowOtherSessions(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {otherSessionStudents.length} student(s) of this class belong to
            another session
            {selectedYear ? ` (not ${selectedYear})` : ""} and are hidden. Show
            them in the list above.
          </label>
        )}

        {studentListNote && (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
            {studentListNote}
          </p>
        )}

        {!loadingStudents && selectedClass && visibleStudents.length === 0 && (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
            No student found in {toOrdinalLabel(selectedClass)}
            {selectedYear ? ` for ${selectedYear}` : ""}.
            {otherSessionStudents.length > 0 ? (
              ` ${otherSessionStudents.length} student(s) of this class belong to another session - tick the box above to show them.`
            ) : (
              <>
                {" "}
                Import the class list from the{" "}
                <NavLink to="/welcome/student/add" className="underline">
                  Add Student
                </NavLink>{" "}
                page (Bulk Upload tab) or add the students first.
              </>
            )}
          </p>
        )}

        {generateError && (
          <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            {generateError}
          </p>
        )}
      </section>
      {/* ---------------- Admit card preview ---------------- */}
      {/* ---------------- Admit card preview - one card per student -------- */}
      {selectedExam &&
        cards.map((card) => (
          <div
            key={card.id}
            className="mx-auto mt-6 max-w-3xl overflow-hidden rounded-xl border-4 border-double border-blue-800 bg-white shadow-lg print:break-after-page"
          >
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
                                breakdown.notebook > 0 ? "" : "text-gray-400"
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
        ))}
    </div>
  );
}

export default GenerateAdmitCard;