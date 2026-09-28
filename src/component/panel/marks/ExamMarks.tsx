import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { CLASSES, COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toDateOrNull } from "../../../utils/toDateOrNull";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import {
  ExamCategory,
  marksSchemeFromDoc,
  subjectMarksBreakdown,
} from "../../../utils/examMarksScheme";
import {
  ExamDoc,
  MarksData,
  MarksDoc,
  SubjectMarksRecord,
} from "../../../utils/type";
import PageHeader from "../../../custom-components/PageHeader";
import Modal from "../../../custom-components/Modal";
import Button from "../../../custom-components/Button";
import CrossList from "./CrossList";

const academicYears = generateAcademicYears();

const PASS_PERCENTAGE = 33;
const AUTO_SAVE_DELAY = 600;

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

const marksInputClass =
  "w-20 rounded-md border border-gray-300 bg-white px-1.5 py-1.5 text-center text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

interface MarksRowStudent {
  studentUid: string;
  admissionNumber: string;
  studentName: string;
  fatherName: string;
  section: string;
}

interface MarksSubjectColumn {
  name: string;
  type: string;
  order: number;
}

function toExamCategory(value: unknown): ExamCategory {
  return value === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
}

function toExamStatus(value: unknown): "active" | "archived" {
  return value === "archived" ? "archived" : "active";
}

function toDateInputValue(value: unknown): string {
  const date = toDateOrNull(value);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function toExamDoc(snapshot: QueryDocumentSnapshot<DocumentData>): ExamDoc {
  const data = snapshot.data();
  const maxMarks = typeof data.maxMarks === "number" ? data.maxMarks : 0;
  return {
    id: snapshot.id,
    examName: typeof data.examName === "string" ? data.examName : "",
    examCategory: toExamCategory(data.examCategory),
    academicYear:
      typeof data.academicYear === "string" ? data.academicYear : "",
    maxMarks,
    marksScheme: marksSchemeFromDoc(data, maxMarks || undefined),
    applicableClasses: Array.isArray(data.applicableClasses)
      ? data.applicableClasses.filter(
          (cls): cls is string => typeof cls === "string"
        )
      : [],
    examStartDate: toDateInputValue(data.examStartDate),
    examEndDate: toDateInputValue(data.examEndDate),
    status: toExamStatus(data.status),
  };
}

function toRowStudent(
  snapshot: QueryDocumentSnapshot<DocumentData>
): MarksRowStudent | null {
  const data = snapshot.data();
  if (data.isDeleted === true) return null;
  const studentUid = typeof data.studentId === "string" ? data.studentId : "";
  if (!studentUid) return null;
  return {
    studentUid,
    admissionNumber: String(data.enrollment ?? "").trim(),
    studentName: typeof data.studentName === "string" ? data.studentName : "",
    fatherName: typeof data.fatherName === "string" ? data.fatherName : "",
    section: typeof data.section === "string" ? data.section : "",
  };
}

function sortRowStudents(a: MarksRowStudent, b: MarksRowStudent): number {
  return (
    a.section.localeCompare(b.section) ||
    a.admissionNumber.localeCompare(b.admissionNumber, undefined, {
      numeric: true,
    })
  );
}

function toSubjectColumn(
  snapshot: QueryDocumentSnapshot<DocumentData>
): MarksSubjectColumn | null {
  const data = snapshot.data();
  if (data.displayInMarksEntry !== true) return null;
  return {
    name: typeof data.name === "string" ? data.name : "",
    type: typeof data.type === "string" ? data.type : "",
    order: typeof data.order === "number" ? data.order : 1,
  };
}

function sortSubjectColumns(
  a: MarksSubjectColumn,
  b: MarksSubjectColumn
): number {
  return a.order - b.order || a.name.localeCompare(b.name);
}

function toSubjectMarksRecord(value: unknown): SubjectMarksRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    obtained:
      typeof record.obtained === "string"
        ? record.obtained
        : typeof record.obtained === "number"
          ? record.obtained
          : 0,
    maxMarks: typeof record.maxMarks === "number" ? record.maxMarks : 0,
  };
}

function toMarksDoc(snapshot: QueryDocumentSnapshot<DocumentData>): MarksDoc {
  const data = snapshot.data();
  const subjectMarks: Record<string, SubjectMarksRecord> = {};
  if (data.subjectMarks && typeof data.subjectMarks === "object") {
    Object.entries(data.subjectMarks).forEach(([key, value]) => {
      const record = toSubjectMarksRecord(value);
      if (record) subjectMarks[key] = record;
    });
  }
  return {
    id: snapshot.id,
    studentUid: typeof data.studentUid === "string" ? data.studentUid : "",
    admissionNumber:
      typeof data.admissionNumber === "string" ? data.admissionNumber : "",
    session: typeof data.session === "string" ? data.session : "",
    className: typeof data.className === "string" ? data.className : "",
    section: typeof data.section === "string" ? data.section : "",
    rollNumber: typeof data.rollNumber === "number" ? data.rollNumber : 0,
    examId: typeof data.examId === "string" ? data.examId : "",
    examType: typeof data.examType === "string" ? data.examType : "",
    examName: typeof data.examName === "string" ? data.examName : "",
    subjectMarks,
    totalMarks: typeof data.totalMarks === "number" ? data.totalMarks : 0,
    totalMaxMarks:
      typeof data.totalMaxMarks === "number" ? data.totalMaxMarks : 0,
    percentage: typeof data.percentage === "number" ? data.percentage : 0,
    result: data.result === "fail" ? "fail" : "pass",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function subjectKey(name: string): string {
  return name.trim().toLowerCase();
}

function toMarksNumber(value: string): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

const GRADE_OPTIONS = ["A+", "A", "B+", "B", "C+", "C", "D", "E", "F"];

function normalizeGrade(value: string): string {
  return value.toUpperCase().replace(/[^A-F0-9+\-]/g, "").slice(0, 3);
}

function clampMarksValue(value: string, maxMarks: number): string {
  if (value === "") return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  if (numeric > maxMarks) return String(maxMarks);
  if (numeric < 0) return "0";
  return value;
}

function ExamMarks() {
  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [marksYear, setMarksYear] = useState(academicYears[0]?.value ?? "");
  const [marksExamId, setMarksExamId] = useState("");
  const [marksClass, setMarksClass] = useState("");

  const [rowStudents, setRowStudents] = useState<MarksRowStudent[]>([]);
  const [subjectColumns, setSubjectColumns] = useState<MarksSubjectColumn[]>([]);
  const [marksMap, setMarksMap] = useState<Record<string, MarksDoc>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadingTable, setLoadingTable] = useState(false);

  const draftsRef = useRef<Record<string, string>>({});
  const marksMapRef = useRef<Record<string, MarksDoc>>({});
  const rowStudentsRef = useRef<MarksRowStudent[]>([]);
  const subjectColumnsRef = useRef<MarksSubjectColumn[]>([]);
  const knownDocIdsRef = useRef<Set<string>>(new Set());
  const pendingWritesRef = useRef<
    Record<string, { payload: MarksData; timer: ReturnType<typeof setTimeout> }>
  >({});

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

  const yearExams = exams.filter(
    (exam) =>
      exam.status === "active" && exam.academicYear === marksYear
  );
  const selectedExam =
    yearExams.find((exam) => exam.id === marksExamId) ?? null;
  const tableReady = Boolean(
    modalOpen && marksYear && marksExamId && marksClass && selectedExam
  );

  const maxMarksOf = (subjectName: string): number =>
    selectedExam
      ? subjectMarksBreakdown(
          subjectName,
          selectedExam.examCategory,
          selectedExam.marksScheme
        ).total
      : 0;

  const buildMarksPayload = (student: MarksRowStudent): MarksData => {
    const columns = subjectColumnsRef.current;
    const currentDrafts = draftsRef.current;
    const currentMarks = marksMapRef.current;
    const subjectMarks: Record<string, SubjectMarksRecord> = {};
    let totalMarks = 0;
    let totalMaxMarks = 0;
    columns.forEach((column) => {
      const key = subjectKey(column.name);
      const cellKey = `${student.studentUid}::${key}`;
      const draft = currentDrafts[cellKey];
      const saved = currentMarks[student.studentUid]?.subjectMarks[key];
      if (column.type === "Scholastic") {
        const grade =
          draft !== undefined
            ? normalizeGrade(draft)
            : typeof saved?.obtained === "string"
              ? saved.obtained
              : "";
        subjectMarks[key] = { obtained: grade, maxMarks: 0 };
        return;
      }
      const obtained =
        draft === undefined
          ? typeof saved?.obtained === "number"
            ? saved.obtained
            : 0
          : toMarksNumber(draft);
      const maxMarks = maxMarksOf(column.name);
      subjectMarks[key] = { obtained, maxMarks };
      totalMarks += obtained;
      totalMaxMarks += maxMarks;
    });

    const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    return {
      studentUid: student.studentUid,
      admissionNumber: student.admissionNumber,
      session: marksYear,
      className: marksClass,
      section: student.section,
      rollNumber: Math.max(rowStudentsRef.current.indexOf(student) + 1, 1),
      examId: marksExamId,
      examType: selectedExam ? selectedExam.examCategory.toLowerCase() : "",
      examName: selectedExam ? selectedExam.examName : "",
      subjectMarks,
      totalMarks,
      totalMaxMarks,
      percentage: Number(percentage.toFixed(2)),
      result:
        totalMaxMarks === 0
          ? "pass"
          : percentage >= PASS_PERCENTAGE
            ? "pass"
            : "fail",
    };
  };

  const commitMarksWrite = async (studentUid: string, payload: MarksData) => {
    const docId = `${payload.session}_${payload.examId}_${studentUid}`;
    const isNew = !knownDocIdsRef.current.has(docId);
    try {
      await setDoc(
        doc(db, COLLECTION.MARKS, docId),
        {
          ...payload,
          ...(isNew ? { createdAt: serverTimestamp() } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      if (isNew) knownDocIdsRef.current.add(docId);
    } catch (error) {
      console.error("Failed to save marks:", error);
      toast.error("Failed to save marks. Please try again.");
    }
  };

  const scheduleStudentWrite = (studentUid: string, payload: MarksData) => {
    const pending = pendingWritesRef.current[studentUid];
    if (pending) clearTimeout(pending.timer);
    const timer = setTimeout(() => {
      delete pendingWritesRef.current[studentUid];
      void commitMarksWrite(studentUid, payload);
    }, AUTO_SAVE_DELAY);
    pendingWritesRef.current[studentUid] = { payload, timer };
  };

  const flushStudentWrite = (studentUid: string) => {
    const pending = pendingWritesRef.current[studentUid];
    if (!pending) return;
    clearTimeout(pending.timer);
    delete pendingWritesRef.current[studentUid];
    void commitMarksWrite(studentUid, pending.payload);
  };

  const flushPendingWrites = () => {
    Object.entries(pendingWritesRef.current).forEach(
      ([studentUid, pending]) => {
        clearTimeout(pending.timer);
        void commitMarksWrite(studentUid, pending.payload);
      }
    );
    pendingWritesRef.current = {};
  };

  useEffect(() => {
    flushPendingWrites();
    draftsRef.current = {};
    setDrafts({});
  }, [marksYear, marksExamId, marksClass]);

  useEffect(() => {
    if (!tableReady) {
      setRowStudents([]);
      setLoadingTable(false);
      return;
    }
    setLoadingTable(true);
    const studentsQuery = query(
      collection(db, COLLECTION.ENROLLMENTS),
      where("className", "==", marksClass),
      where("academicYear", "==", marksYear)
    );
    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map(toRowStudent)
          .filter((student): student is MarksRowStudent => student !== null)
          .sort(sortRowStudents);
        rowStudentsRef.current = list;
        setRowStudents(list);
        setLoadingTable(false);
      },
      (error) => {
        console.error("Failed to load students:", error);
        setLoadingTable(false);
      }
    );
    return unsubscribe;
  }, [tableReady, marksYear, marksClass]);

  useEffect(() => {
    if (!tableReady) {
      subjectColumnsRef.current = [];
      setSubjectColumns([]);
      return;
    }
    const subjectsQuery = query(
      collection(db, COLLECTION.SUBJECTS),
      where("className", "==", marksClass)
    );
    const unsubscribe = onSnapshot(
      subjectsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map(toSubjectColumn)
          .filter(
            (column): column is MarksSubjectColumn =>
              column !== null && Boolean(column.name)
          )
          .sort(sortSubjectColumns);
        subjectColumnsRef.current = list;
        setSubjectColumns(list);
      },
      (error) => {
        console.error("Failed to load subjects:", error);
        subjectColumnsRef.current = [];
        setSubjectColumns([]);
      }
    );
    return unsubscribe;
  }, [tableReady, marksClass]);

  useEffect(() => {
    if (!tableReady) {
      marksMapRef.current = {};
      knownDocIdsRef.current = new Set();
      setMarksMap({});
      return;
    }
    const marksQuery = query(
      collection(db, COLLECTION.MARKS),
      where("examId", "==", marksExamId)
    );
    const unsubscribe = onSnapshot(
      marksQuery,
      (snapshot) => {
        const map: Record<string, MarksDoc> = {};
        const knownIds = new Set<string>();
        snapshot.docs
          .map(toMarksDoc)
          .forEach((marks) => {
            if (marks.session !== marksYear || marks.className !== marksClass) {
              return;
            }
            map[marks.studentUid] = marks;
            knownIds.add(marks.id);
          });
        knownDocIdsRef.current = knownIds;
        marksMapRef.current = map;
        setMarksMap(map);
      },
      (error) => {
        console.error("Failed to load marks:", error);
        marksMapRef.current = {};
        setMarksMap({});
      }
    );
    return unsubscribe;
  }, [tableReady, marksExamId, marksYear, marksClass]);

  const summaryOf = (studentUid: string) => {
    let totalMarks = 0;
    let totalMaxMarks = 0;
    subjectColumns.forEach((column) => {
      if (column.type === "Scholastic") return;
      const key = subjectKey(column.name);
      const cellKey = `${studentUid}::${key}`;
      const draft = drafts[cellKey];
      const saved = marksMap[studentUid]?.subjectMarks[key];
      const obtained =
        draft === undefined
          ? typeof saved?.obtained === "number"
            ? saved.obtained
            : 0
          : toMarksNumber(draft);
      totalMarks += obtained;
      totalMaxMarks += maxMarksOf(column.name);
    });
    const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
    return { totalMarks, totalMaxMarks, percentage };
  };

  const handleMarksChange = (
    student: MarksRowStudent,
    column: MarksSubjectColumn,
    value: string
  ) => {
    const cellKey = `${student.studentUid}::${subjectKey(column.name)}`;
    const nextValue =
      column.type === "Scholastic"
        ? normalizeGrade(value)
        : clampMarksValue(value, maxMarksOf(column.name));
    const nextDrafts = { ...draftsRef.current, [cellKey]: nextValue };
    draftsRef.current = nextDrafts;
    setDrafts(nextDrafts);
    scheduleStudentWrite(student.studentUid, buildMarksPayload(student));
  };

  const openModal = () => {
    setMarksYear(academicYears[0]?.value ?? "");
    setMarksExamId("");
    setMarksClass("");
    setModalOpen(true);
  };

  const closeModal = () => {
    flushPendingWrites();
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Marks"
        titleStyle="text-primaryBlue"
        description="Enter student marks for every exam. Marks are saved automatically as you type and the cross list is available below."
        descriptionStyle="text-gray-500"
        button={
          <Button
            buttonName="Add Marks"
            variant="primary"
            size="md"
            buttonStyle="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={openModal}
          />
        }
      />

      <CrossList exams={exams} loading={loadingExams} />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Add Exam Marks"
        description="Select the academic year, exam and class name to open the marks entry sheet."
        cancelText="Cancel"
        hideSubmit
        onSubmit={() => undefined}
        modalClassName="max-w-6xl"
      >
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="marksYear"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Academic Year
            </label>
            <select
              id="marksYear"
              value={marksYear}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setMarksYear(event.target.value)
              }
              className={inputClass}
            >
              {academicYears.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="marksExam"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Exam
            </label>
            <select
              id="marksExam"
              value={marksExamId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setMarksExamId(event.target.value)
              }
              className={inputClass}
            >
              <option value="">Select Exam</option>
              {yearExams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.examName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="marksClass"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Class Name
            </label>
            <select
              id="marksClass"
              value={marksClass}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setMarksClass(event.target.value)
              }
              className={inputClass}
            >
              <option value="">Select Class</option>
              {CLASSES.map((className) => (
                <option key={className} value={className}>
                  {toOrdinalLabel(className)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!tableReady ? (
          <p className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Select the academic year, exam and class name to load the marks
            entry sheet.
          </p>
        ) : loadingTable ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
            Loading students...
          </div>
        ) : rowStudents.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No students found for the selected class and academic year.
          </div>
        ) : subjectColumns.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No subject is enabled for marks entry in this class. Enable "Show
            in Marks Entry" on the Subjects page.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="bg-gray-800 text-white text-left">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Student Name</th>
                  <th className="px-3 py-2.5">Father's Name</th>
                  {subjectColumns.map((column) => (
                    <th key={column.name} className="px-2 py-2.5 text-center">
                      <span className="whitespace-nowrap">{column.name}</span>
                      {column.type && (
                        <span className="block text-[10px] text-blue-200 whitespace-nowrap">
                          {column.type}
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center">Total Marks</th>
                  <th className="px-3 py-2.5 text-center">Marks Obtained</th>
                  <th className="px-3 py-2.5 text-center">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {rowStudents.map((student, index) => {
                  const summary = summaryOf(student.studentUid);
                  return (
                    <tr
                      key={student.studentUid}
                      className={index % 2 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {student.studentName}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {student.fatherName}
                      </td>
                      {subjectColumns.map((column) => {
                        const key = subjectKey(column.name);
                        const cellKey = `${student.studentUid}::${key}`;
                        return (
                          <td key={column.name} className="px-2 py-2 text-center">
                            {column.type === "Scholastic" ? (
                              <input
                                type="text"
                                list="marksSubjectGrades"
                                maxLength={3}
                                value={
                                  drafts[cellKey] ??
                                  String(
                                    marksMap[student.studentUid]?.subjectMarks[
                                      key
                                    ]?.obtained ?? ""
                                  )
                                }
                                onChange={(
                                  event: ChangeEvent<HTMLInputElement>
                                ) => handleMarksChange(student, column, event.target.value)}
                                onBlur={() =>
                                  flushStudentWrite(student.studentUid)
                                }
                                className={marksInputClass}
                              />
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={maxMarksOf(column.name)}
                                step="0.5"
                                value={
                                  drafts[cellKey] ??
                                  String(
                                    marksMap[student.studentUid]?.subjectMarks[
                                      key
                                    ]?.obtained ?? ""
                                  )
                                }
                                onChange={(
                                  event: ChangeEvent<HTMLInputElement>
                                ) => handleMarksChange(student, column, event.target.value)}
                                onBlur={() =>
                                  flushStudentWrite(student.studentUid)
                                }
                                className={marksInputClass}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-gray-700 text-center">
                        {summary.totalMaxMarks}
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800 text-center">
                        {summary.totalMarks}
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800 text-center">
                        {summary.percentage.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">
              Marks are saved automatically for every subject as you type.
            </p>
            <datalist id="marksSubjectGrades">
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </datalist>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ExamMarks;