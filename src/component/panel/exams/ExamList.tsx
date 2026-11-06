import { useEffect, useState } from "react";
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
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { CLASSES, COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import {
  ExamCategory,
  MarksScheme,
  marksSchemeBadge,
  marksSchemeFromDoc,
} from "../../../utils/examMarksScheme";
import PageHeader from "../../../custom-components/PageHeader";
import Modal from "../../../custom-components/Modal";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import AddExam from "./AddExam";
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
import { Spinner } from "../../../custom-components/Loader";

type ExamStatus = "active" | "archived";

interface ExamDoc {
  id: string;
  examName: string;
  examCategory: ExamCategory;
  maxMarks: number;
  /** Class 1-8 split (notebook/test or theory/practical). */
  marksScheme: MarksScheme;
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
  const maxMarks = typeof data.maxMarks === "number" ? data.maxMarks : 0;
  return {
    id: snapshot.id,
    examName: typeof data.examName === "string" ? data.examName : "",
    examCategory: toExamCategory(data.examCategory),
    maxMarks,
    // Falls back to the standard class 1-8 split for older documents.
    marksScheme: marksSchemeFromDoc(data, maxMarks || undefined),
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

function ExamList() {
  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? ""
  );
  const [selectedClass, setSelectedClass] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Add / edit exam modal. editingExamId is set in edit mode and is
  // null/cleared when a brand new exam is being created.
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

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

  // Opens the Add Exam form in a modal for a brand new exam.
  const openAddModal = () => {
    setEditingExamId(null);
    setModalOpen(true);
  };

  // Opens the same modal in edit mode, pre-loaded with the exam's data.
  const openEditModal = (examId: string) => {
    setEditingExamId(examId);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <div>
      <PageHeader
        title="Exam List"
        titleStyle="text-primaryBlue"
        description={
          <p className="text-gray-600 mt-1">
            {exams.length} exam template(s) defined. Archived exams are hidden
            from active use but kept for existing marks records.
          </p>
        }
        descriptionStyle="text-gray-500"
        button={
          <UIButton
            type="button"
            onClick={openAddModal}
            className="bg-primaryGreen font-bold text-white hover:bg-green-700"
          >
            + Add Exam
          </UIButton>
        }
      />      

      {/* Filters */}
      <div className="mb-4 bg-white mt-2 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="filterYear" className="mb-1 block font-bold">
            Academic Year
          </Label>
          <SelectDropdown
            id="filterYear"
            value={selectedYear}
            onValueChange={setSelectedYear}
            options={[{ label: "All Years", value: "" }, ...academicYears]}
          />
        </div>
        <div>
          <Label htmlFor="filterClass" className="mb-1 block font-bold">
            Class
          </Label>
          <SelectDropdown
            id="filterClass"
            value={selectedClass}
            onValueChange={setSelectedClass}
            options={[
              { label: "All Classes", value: "" },
              ...CLASSES.map((className) => ({
                label: toOrdinalLabel(className),
                value: className,
              })),
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Loading exams...
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-500 font-semibold">No exams found.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="text-blue-600 underline inline-block mt-2"
          >
            Add the first exam
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-bold text-gray-700">Exam Name</TableHead>
                <TableHead className="font-bold text-gray-700">Category</TableHead>
                <TableHead className="font-bold text-gray-700">Max Marks</TableHead>
                <TableHead className="font-bold text-gray-700">
                  Marks Breakup
                </TableHead>
                <TableHead className="font-bold text-gray-700">
                  Applicable Classes
                </TableHead>
                <TableHead className="font-bold text-gray-700">Sequence</TableHead>
                <TableHead className="font-bold text-gray-700">Status</TableHead>
                <TableHead className="text-center font-bold text-gray-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.map((exam) => {
                const isActive = exam.status === "active";
                const isUpdating = updatingId === exam.id;
                const statusAction = isActive ? "Archive" : "Activate";
                return (
                  <TableRow key={exam.id}>
                    <TableCell className="font-semibold text-gray-800">
                      {exam.examName}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${CATEGORY_BADGE[exam.examCategory]}`}
                      >
                        {CATEGORY_LABEL[exam.examCategory]}
                      </span>
                    </TableCell>
                    <TableCell>{exam.maxMarks}</TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-gray-700">
                        {marksSchemeBadge(exam.examCategory, exam.marksScheme)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {exam.applicableClasses.map(toOrdinalLabel).join(", ")}
                    </TableCell>
                    <TableCell>{exam.sequence}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${
                          isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {isActive ? "Active" : "Archived"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <UIButton
                          type="button"
                          size="icon"
                          title="Edit"
                          aria-label={`Edit ${exam.examName}`}
                          onClick={() => openEditModal(exam.id)}
                          className="h-8 w-8 bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </UIButton>
                        <UIButton
                          type="button"
                          size="icon"
                          title={isUpdating ? "Updating..." : statusAction}
                          aria-label={`${statusAction} ${exam.examName}`}
                          disabled={isUpdating}
                          onClick={() => void handleToggleStatus(exam)}
                          className={`h-8 w-8 text-white ${
                            isActive
                              ? "bg-amber-500 hover:bg-amber-600"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {isUpdating ? (
                            <Spinner size="xs" tone="white" label="" />
                          ) : isActive ? (
                            <Archive className="h-4 w-4" />
                          ) : (
                            <ArchiveRestore className="h-4 w-4" />
                          )}
                        </UIButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit exam modal */}
      {modalOpen && (
        <Modal
          isOpen
          onClose={closeModal}
          title={editingExamId ? "Edit Exam" : "Add Exam"}
          description="Define exam templates for classes and academic years. Student marks are entered later on the Marks Entry page."
          cancelText="Cancel"
          hideSubmit
          onSubmit={() => {}}
          modalClassName="max-w-4xl"
          titleStyle="text-center"
        >
          <AddExam initialEditId={editingExamId} onClose={closeModal} />
        </Modal>
      )}
    </div>
  );
}

export default ExamList;