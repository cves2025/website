import { useEffect, useState, FormEvent, Fragment } from "react";
import {
  collection,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { CLASSES, COLLECTION } from "../../../../constants";
import { db } from "../../../../firebase/config";
import { generateAcademicYears } from "../../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../../utils/toOrdinalLabel";
import { class_1_to_8 } from "../../../admin/subjectDefined";
import {
  ExamCategory,
  MarksScheme,
  SubjectMarksBreakdown,
  defaultMarksScheme,
  isSchemeClass,
  marksCellLabel,
  marksSchemeBadge,
  marksSchemeFromDoc,
  subjectMarksBreakdown,
} from "../../../../utils/examMarksScheme";
import PageHeader from "../../../../custom-components/PageHeader";

const academicYears = generateAcademicYears();

/** Fallback subject list for classes outside 1 to 8. */
const OTHER_CLASS_SUBJECTS: string[] = ["English", "Hindi", "Math", "Science"];

const selectClassName =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed";

interface ExamDoc {
  id: string;
  examName: string;
  examCategory: ExamCategory;
  maxMarks: number;
  /** Class 1-8 split saved on the Add Exam page. */
  marksScheme: MarksScheme;
  applicableClasses: string[];
  academicYear: string;
  status: "active" | "archived";
}

function toExamCategory(value: unknown): ExamCategory {
  return value === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
}

function toExamStatus(value: unknown): "active" | "archived" {
  return value === "archived" ? "archived" : "active";
}

function toExamDoc(snapshot: QueryDocumentSnapshot<DocumentData>): ExamDoc {
  const data = snapshot.data();
  const maxMarks = typeof data.maxMarks === "number" ? data.maxMarks : 0;
  return {
    id: snapshot.id,
    examName: typeof data.examName === "string" ? data.examName : "",
    examCategory: toExamCategory(data.examCategory),
    maxMarks,
    // Older documents only stored maxMarks; this fills the class 1-8 split.
    marksScheme: marksSchemeFromDoc(data, maxMarks || undefined),
    applicableClasses: Array.isArray(data.applicableClasses)
      ? data.applicableClasses.filter(
          (cls): cls is string => typeof cls === "string"
        )
      : [],
    academicYear: typeof data.academicYear === "string" ? data.academicYear : "",
    status: toExamStatus(data.status),
  };
}

/**
 * Demo students. Marks entry is not built yet, so the result sheet is filled
 * with deterministic sample marks; the Test/Theory, Notebook and Practical
 * split always comes from the exam template saved on the Add Exam page.
 */
interface SampleStudent {
  enrollment: string;
  name: string;
  /** 0-1 share of the maximum marks this demo student scores. */
  factor: number;
}

const SAMPLE_STUDENTS: SampleStudent[] = [
  { enrollment: "1001", name: "Aarav Sharma", factor: 0.9 },
  { enrollment: "1002", name: "Diya Verma", factor: 0.84 },
  { enrollment: "1003", name: "Rohan Gupta", factor: 0.76 },
  { enrollment: "1004", name: "Ananya Singh", factor: 0.93 },
];

interface ResultCell {
  /** Test / theory marks obtained. */
  theory: number;
  /** Notebook / practical marks obtained (null when the paper does not apply). */
  secondary: number | null;
  /** True for Science & Computer in Half Yearly / Annual. */
  hasPractical: boolean;
}

function buildCell(breakdown: SubjectMarksBreakdown, factor: number): ResultCell {
  // Unit tests use the notebook paper, main exams the Science/Computer one.
  const secondaryMax =
    breakdown.notebook > 0 ? breakdown.notebook : breakdown.practical;
  return {
    theory: Math.round(factor * breakdown.theory),
    secondary:
      secondaryMax > 0 ? Math.max(1, Math.round(factor * secondaryMax)) : null,
    hasPractical: breakdown.hasPractical,
  };
}

function toGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 75) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 45) return "C";
  return "D";
}
function ResultPanel() {
  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? ""
  );
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [showResult, setShowResult] = useState(false);

  /* Real-time listener: exam templates created on the Add Exam page. */
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

  const classExams = exams.filter(
    (exam) =>
      exam.status === "active" &&
      (!selectedYear || exam.academicYear === selectedYear) &&
      (!selectedClass || exam.applicableClasses.includes(selectedClass))
  );

  const selectedExam =
    classExams.find((exam) => exam.id === selectedExamId) ?? null;

  // Classes 1 to 8 follow the notebook / Science & Computer practical scheme.
  const usesMarksScheme = isSchemeClass(selectedClass);
  const examCategory: ExamCategory = selectedExam?.examCategory ?? "UNIT_TEST";
  const examScheme: MarksScheme =
    selectedExam?.marksScheme ?? defaultMarksScheme();
  const isUnitTest = examCategory === "UNIT_TEST";
  const secondaryLabel = isUnitTest ? "Notebook" : "Practical";

  const subjectColumns = (
    usesMarksScheme ? class_1_to_8 : OTHER_CLASS_SUBJECTS
  ).map((subject) => ({
    subject,
    breakdown: subjectMarksBreakdown(subject, examCategory, examScheme),
  }));

  const resultRows = selectedExam
    ? SAMPLE_STUDENTS.map((student) => {
        const cells = subjectColumns.map((column) =>
          buildCell(column.breakdown, student.factor)
        );
        const obtained = cells.reduce(
          (sum, cell) => sum + cell.theory + (cell.secondary ?? 0),
          0
        );
        const maximum = subjectColumns.reduce(
          (sum, column) => sum + column.breakdown.total,
          0
        );
        return {
          ...student,
          cells,
          obtained,
          maximum,
          percentage: maximum > 0 ? (obtained / maximum) * 100 : 0,
        };
      })
    : [];

  const handleLoad = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClass || !selectedExam) return;
    setShowResult(true);
  };

  return (
    <div>
      <PageHeader
        title="Results"
        titleStyle="text-primaryBlue"
        description="View student results by class and exam. Test/Theory, Notebook and
        Practical columns come from the exam template saved on the Add Exam
        page."
        descriptionStyle="text-gray-500"        
      />
      <form
        onSubmit={handleLoad}
        className="mb-6 mt-2 bg-white rounded-lg px-4 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <select
          value={selectedYear}
          onChange={(event) => {
            setSelectedYear(event.target.value);
            setSelectedExamId("");
            setShowResult(false);
          }}
          className={selectClassName}
        >
          <option value="">All Academic Years</option>
          {academicYears.map((year) => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>

        <select
          value={selectedClass}
          onChange={(event) => {
            setSelectedClass(event.target.value);
            setSelectedExamId("");
            setShowResult(false);
          }}
          className={selectClassName}
        >
          <option value="">Select Class</option>
          {CLASSES.map((className) => (
            <option key={className} value={className}>
              {toOrdinalLabel(className)}
            </option>
          ))}
        </select>

        <select
          value={selectedExamId}
          onChange={(event) => {
            setSelectedExamId(event.target.value);
            setShowResult(false);
          }}
          disabled={!selectedClass || loadingExams}
          className={selectClassName}
        >
          <option value="">
            {loadingExams ? "Loading exams..." : "Select Exam"}
          </option>
          {classExams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.examName}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!selectedClass || !selectedExam}
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-md px-6 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Load Result
        </button>
      </form>

      {!loadingExams && !selectedClass && (
        <p className="text-sm text-gray-500">
          Select a class and an exam to load the result sheet.
        </p>
      )}

      {!loadingExams && selectedClass && classExams.length === 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
          No active exam template found for {toOrdinalLabel(selectedClass)}
          {selectedYear ? ` in ${selectedYear}` : ""}. Add one from the Add Exam
          page first.
        </p>
      )}

      {showResult && selectedExam && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">
              {selectedExam.examName} Result — Class{" "}
              {toOrdinalLabel(selectedClass)}
            </h3>
            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
              {marksSchemeBadge(
                selectedExam.examCategory,
                selectedExam.marksScheme
              )}
            </span>
          </div>

          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-800 text-white text-left">
                <th rowSpan={usesMarksScheme ? 2 : 1} className="px-4 py-2">
                  Enrollment
                </th>
                <th rowSpan={usesMarksScheme ? 2 : 1} className="px-4 py-2">
                  Student Name
                </th>
                {subjectColumns.map((column) => (
                  <th
                    key={column.subject}
                    colSpan={usesMarksScheme ? 2 : 1}
                    className="px-3 py-2 text-center border-l border-gray-600"
                  >
                    {column.subject} ({column.breakdown.total})
                  </th>
                ))}
                <th
                  rowSpan={usesMarksScheme ? 2 : 1}
                  className="px-4 py-2 border-l border-gray-600"
                >
                  Total
                </th>
                <th rowSpan={usesMarksScheme ? 2 : 1} className="px-4 py-2">
                  Grade
                </th>
              </tr>
              {usesMarksScheme && (
                <tr className="bg-gray-700 text-white">
                  {subjectColumns.map((column) => (
                    <Fragment key={column.subject}>
                      <th className="px-3 py-1.5 text-xs font-semibold border-l border-gray-600">
                        {isUnitTest ? "Test" : "Theory"}
                      </th>
                      <th className="px-3 py-1.5 text-xs font-semibold">
                        {secondaryLabel}
                      </th>
                    </Fragment>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {resultRows.map((row, index) => (
                <tr
                  key={row.enrollment}
                  className={index % 2 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-4 py-2">{row.enrollment}</td>
                  <td className="px-4 py-2 font-semibold">{row.name}</td>
                  {usesMarksScheme
                    ? row.cells.map((cell, cellIndex) => (
                        <Fragment key={subjectColumns[cellIndex].subject}>
                          <td className="px-3 py-2 text-center border-l border-gray-200">
                            {cell.theory}
                          </td>
                          <td
                            className={`px-3 py-2 text-center ${
                              cell.hasPractical
                                ? "font-bold text-amber-700"
                                : "text-gray-400"
                            }`}
                          >
                            {marksCellLabel(
                              cell.secondary,
                              cell.secondary !== null
                            )}
                          </td>
                        </Fragment>
                      ))
                    : row.cells.map((cell, cellIndex) => (
                        <td
                          key={subjectColumns[cellIndex].subject}
                          className="px-3 py-2 text-center border-l border-gray-200"
                        >
                          {cell.theory}
                        </td>
                      ))}
                  <td className="px-4 py-2 font-bold border-l border-gray-200">
                    {row.obtained} / {row.maximum}
                  </td>
                  <td className="px-4 py-2">
                    <span className="bg-green-100 text-green-700 rounded px-2 py-1 font-bold">
                      {toGrade(row.percentage)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="px-4 py-3 text-xs text-gray-500 border-t border-gray-200">
            Practical is shown as &quot;NA&quot; for subjects without a
            practical paper. Sample marks are displayed until the Marks Entry
            page is available.
          </p>
        </div>
      )}
    </div>
  );
}

export default ResultPanel;