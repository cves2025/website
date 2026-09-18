import { useEffect, useState, ChangeEvent } from "react";
import {
  collection,
  doc,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { NavLink, useNavigate } from "react-router-dom";
import { FaEdit } from "react-icons/fa";
import { COLLECTION, EXAM_CLASSES } from "../../../constants";
import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";

type ExamCategory = "UNIT_TEST" | "MAIN_EXAM";
type ExamStatus = "active" | "archived";

interface ExamDoc {
  id: string;
  examName: string;
  examCategory: ExamCategory;
  maxMarks: number;
  applicableClasses: string[];
  academicYear: string;
  sequence: number;
  status: ExamStatus;
}

// Kept local to avoid re-computing on every render; the list only grows over time.
const academicYears = generateAcademicYears();

const CATEGORY_LABEL: Record<ExamCategory, string> = {
  UNIT_TEST: "Unit Test",
  MAIN_EXAM: "Main Exam",
};

const CATEGORY_BADGE: Record<ExamCategory, string> = {
  UNIT_TEST: "bg-blue-100 text-blue-700",
  MAIN_EXAM: "bg-amber-100 text-amber-700",
};

function toExamCategory(value: unknown): ExamCategory {
  return value === "MAIN_EXAM" ? "MAIN_EXAM" : "UNIT_TEST";
}

function toExamStatus(value: unknown): ExamStatus {
  return value === "archived" ? "archived" : "active";
}

function toExamDoc(snapshot: QueryDocumentSnapshot<DocumentData>): ExamDoc {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    examName: typeof data.examName === "string" ? data.examName : "",
    examCategory: toExamCategory(data.examCategory),
    maxMarks: typeof data.maxMarks === "number" ? data.maxMarks : 0,
    applicableClasses: Array.isArray(data.applicableClasses)
      ? data.applicableClasses.filter(
          (cls): cls is string => typeof cls === "string"
        )
      : [],
    academicYear:
      typeof data.academicYear === "string" ? data.academicYear : "",
    sequence: typeof data.sequence === "number" ? data.sequence : 0,
    status: toExamStatus(data.status),
  };
}

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function ExamList() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? ""
  );
  const [selectedClass, setSelectedClass] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* Real-time listener: keeps the list in sync with Firestore.
     Data is small (exam definitions), so the year/class filters run in-memory,
     which avoids needing composite Firestore indexes for each filter combo. */
  useEffect(() => {
    const examsQuery = query(
      collection(db, COLLECTION.EXAMS),
      orderBy("sequence", "asc")
    );

    const unsubscribe = onSnapshot(
      examsQuery,
      (snapshot) => {
        setExams(snapshot.docs.map(toExamDoc));
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load exams:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filteredExams = exams.filter(
    (exam) =>
      (!selectedYear || exam.academicYear === selectedYear) &&
      (!selectedClass || exam.applicableClasses.includes(selectedClass))
  );

  const handleToggleStatus = async (exam: ExamDoc) => {
    const nextStatus: ExamStatus =
      exam.status === "active" ? "archived" : "active";
    setUpdatingId(exam.id);
    try {
      await updateDoc(doc(db, COLLECTION.EXAMS, exam.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        `"${exam.examName}" ${nextStatus === "active" ? "activated" : "archived"}.`
      );
    } catch (error) {
      console.error("Failed to update exam status:", error);
      toast.error("Failed to update exam status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            Exam List
          </h2>
          <p className="text-gray-600 mt-1">
            {exams.length} exam template(s) defined. Archived exams are hidden
            from active use but kept for existing marks records.
          </p>
        </div>
        <NavLink
          to="/welcome/exam/add"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
        >
          + Add Exam
        </NavLink>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="filterYear" className="block text-sm font-semibold text-gray-700 mb-1">
            Academic Year
          </label>
          <select
            id="filterYear"
            value={selectedYear}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setSelectedYear(event.target.value)
            }
            className={inputClass}
          >
            <option value="">All Years</option>
            {academicYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filterClass" className="block text-sm font-semibold text-gray-700 mb-1">
            Class
          </label>
          <select
            id="filterClass"
            value={selectedClass}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setSelectedClass(event.target.value)
            }
            className={inputClass}
          >
            <option value="">All Classes</option>
            {EXAM_CLASSES.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Loading exams...
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-500 font-semibold">No exams found.</p>
          <NavLink
            to="/welcome/exam/add"
            className="text-blue-600 underline inline-block mt-2"
          >
            Add the first exam
          </NavLink>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[840px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="px-4 py-3">Exam Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Max Marks</th>
                <th className="px-4 py-3">Applicable Classes</th>
                <th className="px-4 py-3">Sequence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams.map((exam, index) => (
                <tr
                  key={exam.id}
                  className={index % 2 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-4 py-3 font-semibold">{exam.examName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-bold ${CATEGORY_BADGE[exam.examCategory]}`}
                    >
                      {CATEGORY_LABEL[exam.examCategory]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{exam.maxMarks}</td>
                  <td className="px-4 py-3">
                    {exam.applicableClasses.join(", ")}
                  </td>
                  <td className="px-4 py-3">{exam.sequence}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-bold ${
                        exam.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {exam.status === "active" ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        title={`Edit ${exam.examName}`}
                        onClick={() =>
                          navigate(`/welcome/exam/add?edit=${exam.id}`)
                        }
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-xs font-bold transition-colors"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === exam.id}
                        onClick={() => void handleToggleStatus(exam)}
                        className={`rounded px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
                          exam.status === "active"
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {updatingId === exam.id
                          ? "Updating..."
                          : exam.status === "active"
                            ? "Archive"
                            : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ExamList;