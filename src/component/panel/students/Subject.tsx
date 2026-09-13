import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import Modal from "../../../custom-components/Modal";
import { CLASSES, COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";

type SubjectType = "Written + Oral" | "Theory" | "Practical";

const SUBJECT_TYPES: SubjectType[] = [
  "Written + Oral",
  "Theory",
  "Practical",
];

const SUBJECT_TYPE_BADGE: Record<SubjectType, string> = {
  "Written + Oral": "bg-green-100 text-green-700",
  Theory: "bg-blue-100 text-blue-700",
  Practical: "bg-amber-100 text-amber-700",
};

const isSubjectType = (value: unknown): value is SubjectType =>
  typeof value === "string" && (SUBJECT_TYPES as string[]).includes(value);

interface SubjectDoc {
  id: string;
  name: string;
  type: SubjectType;
  className: string;
}

interface SubjectFormState {
  name: string;
  type: SubjectType;
}

const EMPTY_FORM: SubjectFormState = { name: "", type: "Theory" };

const toSubjectDoc = (
  documentSnapshot: QueryDocumentSnapshot<DocumentData>,
  fallbackClass: string
): SubjectDoc => {
  const data = documentSnapshot.data() as Record<string, unknown>;

  return {
    id: documentSnapshot.id,
    name: typeof data.name === "string" ? data.name : "",
    type: isSubjectType(data.type) ? data.type : "Theory",
    className:
      typeof data.className === "string" ? data.className : fallbackClass,
  };
};

function Subject() {
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [subjects, setSubjects] = useState<SubjectDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubjectFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectDoc | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  /* Real-time listener: keeps the subject list in sync with Firestore. */
  useEffect(() => {
    setLoading(true);

    const subjectsQuery = query(
      collection(db, COLLECTION.SUBJECTS),
      where("className", "==", selectedClass)
    );

    const unsubscribe = onSnapshot(
      subjectsQuery,
      (snapshot) => {
        setSubjects(
          snapshot.docs.map((documentSnapshot) =>
            toSubjectDoc(documentSnapshot, selectedClass)
          )
        );
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load subjects:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [selectedClass]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (subject: SubjectDoc) => {
    setEditingId(subject.id);
    setForm({ name: subject.name, type: subject.type });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, COLLECTION.SUBJECTS, editingId), {
          name,
          type: form.type,
          className: selectedClass,
          updatedAt: serverTimestamp(),
        });
        toast.success("Subject updated.");
      } else {
        await addDoc(collection(db, COLLECTION.SUBJECTS), {
          name,
          type: form.type,
          className: selectedClass,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("Subject added.");
      }
      setModalOpen(false);
    } catch (error) {
      console.error("Failed to save subject:", error);
      toast.error("Failed to save subject. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (subject: SubjectDoc) => {
    setSubjectToDelete(subject);
  };

  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTION.SUBJECTS, subjectToDelete.id));
      toast.success(`"${subjectToDelete.name}" deleted.`);
      setSubjectToDelete(null);
    } catch (error) {
      console.error("Failed to delete subject:", error);
      toast.error("Failed to delete subject. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteModalClose = () => {
    if (deleting) return;
    setSubjectToDelete(null);
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
          Subject
        </h2>
        <p className="text-gray-600 mt-1">
          Set and manage subjects for every class. Select a class below to view
          and update its subjects.
        </p>
      </div>

      {/* Class selector */}
      <div className="mb-6">
        <span className="block text-sm font-semibold text-gray-700 mb-2">
          Select Class
        </span>
        <div className="flex flex-wrap gap-2">
          {CLASSES.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                selectedClass === cls
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Subject management card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-800">
              Class {selectedClass} Subjects
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading
                ? "Loading..."
                : `${subjects.length} subject${subjects.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-md px-4 py-2 text-sm transition-colors"
          >
            + Add Subject
          </button>
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center">
            <p className="text-gray-500 font-semibold">Loading subjects...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-500 font-semibold">
              No subjects added for Class {selectedClass} yet.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Click &quot;+ Add Subject&quot; to add the first subject.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-gray-800 text-white text-left">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Subject Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject, index) => (
                  <tr
                    key={subject.id}
                    className={index % 2 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {subject.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${SUBJECT_TYPE_BADGE[subject.type]}`}
                      >
                        {subject.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(subject)}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-xs font-bold transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(subject)}
                          className="bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1 text-xs font-bold transition-colors"
                        >
                          Delete
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
      {/* Add / Edit subject modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Subject" : "Add Subject"}
        description={`Class: ${selectedClass}`}
        cancelText="Cancel"
        submitText={editingId ? "Update" : "Add Subject"}
        loading={saving}
        submitDisabled={!form.name.trim()}
        onSubmit={handleSave}
      >
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="subject-name"
              className="block text-sm font-semibold text-gray-700"
            >
              Subject Name
            </label>
            <input
              id="subject-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="e.g. English"
              autoFocus
              className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="subject-type"
              className="block text-sm font-semibold text-gray-700"
            >
              Type
            </label>
            <select
              id="subject-type"
              value={form.type}
              onChange={(event) =>
                setForm({
                  ...form,
                  type: event.target.value as SubjectType,
                })
              }
              className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUBJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={subjectToDelete !== null}
        onClose={handleDeleteModalClose}
        title="Delete Subject"
        description={
          subjectToDelete
            ? `Are you sure you want to permanently delete "${subjectToDelete.name}" from Class ${subjectToDelete.className}?`
            : "Are you sure you want to permanently delete this subject?"
        }
        cancelText="Cancel"
        submitText="Delete"
        loading={deleting}
        onSubmit={handleConfirmDelete}
      />
    </div>
  );
}

export default Subject;
