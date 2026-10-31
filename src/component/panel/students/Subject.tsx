import { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  DocumentData,
  getDocs,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import toast from "react-hot-toast";
import Modal from "../../../custom-components/Modal";
import CustomInput from "../../../custom-components/CustomInput";
import CustomSelect from "../../../custom-components/CustomSelect";
import CustomToggle from "../../../custom-components/CustomToggle";
import SearchableMultiSelect, {
  SearchableOption,
} from "../../../custom-components/SearchableMultiSelect";
import { CLASSES, COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import PageHeader from "../../../custom-components/PageHeader";
import Button from "../../../custom-components/Button";

type SubjectType =
  | "Written"
  | "Oral"
  | "Written + Oral"
  | "Theory"
  | "Practical"
  | "Scholastic";

const SUBJECT_TYPES: SubjectType[] = [
  "Written",
  "Oral",
  "Written + Oral",
  "Theory",
  "Practical",
  "Scholastic",
];

const SUBJECT_TYPE_BADGE: Record<SubjectType, string> = {
  Written: "bg-green-200 text-green-700",
  Oral: "bg-green-300 text-green-700",
  "Written + Oral": "bg-green-100 text-green-700",
  Theory: "bg-blue-100 text-blue-700",
  Practical: "bg-amber-100 text-amber-700",
  Scholastic: "bg-amber-300 text-amber-700",
};

const isSubjectType = (value: unknown): value is SubjectType =>
  typeof value === "string" && (SUBJECT_TYPES as string[]).includes(value);

interface SubjectDoc {
  id: string;
  name: string;
  type: SubjectType;
  order: number;
  /** Order of this subject inside the report card table (undefined = display at the bottom). */
  reportCardOrder?: number;
  className: string;
  displayInAdmitCard?: boolean;
  displayInMarksEntry?: boolean;
  displayInReportCard?: boolean;
}

interface SubjectFormValues {
  name: string;
  type: SubjectType;
  order: string;
  reportCardOrder: string;
  /** Classes the subject is created for (batch write on add). */
  classes: string[];
  displayInAdmitCard: string;
  displayInMarksEntry: string;
  displayInReportCard: string;
}

const DEFAULT_FORM: SubjectFormValues = {
  name: "",
  type: "Theory",
  order: "",
  reportCardOrder: "",
  classes: [],
  displayInAdmitCard: "true",
  displayInMarksEntry: "true",
  displayInReportCard: "true",
};

const CLASS_OPTIONS: SearchableOption[] = CLASSES.map((className) => ({
  value: className,
  label: className,
}));

const toSubjectDoc = (
  documentSnapshot: QueryDocumentSnapshot<DocumentData>,
  fallbackClass: string,
): SubjectDoc => {
  const data = documentSnapshot.data() as Record<string, unknown>;

  return {
    id: documentSnapshot.id,
    name: typeof data.name === "string" ? data.name : "",
    type: isSubjectType(data.type) ? data.type : "Theory",
    order: typeof data.order === "number" ? data.order : 1,
    reportCardOrder:
      typeof data.reportCardOrder === "number" && data.reportCardOrder > 0
        ? Math.floor(data.reportCardOrder)
        : undefined,
    className:
      typeof data.className === "string" ? data.className : fallbackClass,
    displayInAdmitCard: data.displayInAdmitCard === true,
    displayInMarksEntry: data.displayInMarksEntry === true,
    displayInReportCard: data.displayInReportCard !== false,
  };
};

/** Values of the subject being saved, already normalized. */
interface SubjectDraft {
  name: string;
  type: SubjectType;
  order: number;
  reportCardOrder?: number;
  displayInMarksEntry: boolean;
  displayInReportCard: boolean;
}

/** Conflict messages per form field; empty arrays mean no conflict. */
interface SubjectConflicts {
  name: string[];
  order: string[];
  reportCardOrder: string[];
}

const subjectNameKey = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Checks the subject against the existing subjects of every class it will be
 * saved for. Inside one class:
 *  - Name + Type must be unique (so "Science" Theory and "Science" Practical
 *    may coexist);
 *  - Order is the position in Marks Entry, so it clashes only between two
 *    subjects that are both shown in Marks Entry;
 *  - Report Card Order clashes only between two subjects that are both shown
 *    in the Report Card.
 * `ignoreId` is the subject being edited - its old values never conflict with
 * its new ones.
 */
function findSubjectConflicts(
  draft: SubjectDraft,
  classes: readonly string[],
  subjectsByClass: ReadonlyMap<string, readonly SubjectDoc[]>,
  ignoreId: string | null,
): SubjectConflicts {
  const conflicts: SubjectConflicts = {
    name: [],
    order: [],
    reportCardOrder: [],
  };
  const draftName = subjectNameKey(draft.name);

  classes.forEach((className) => {
    const others = (subjectsByClass.get(className) ?? []).filter(
      (subject) => subject.id !== ignoreId,
    );
    const label = `Class ${className}`;

    const sameName = others.find(
      (subject) =>
        subjectNameKey(subject.name) === draftName &&
        subject.type === draft.type,
    );
    if (sameName) {
      conflicts.name.push(
        `${label} already has "${sameName.name}" (${sameName.type}).`,
      );
    }

    const sameOrder = draft.displayInMarksEntry
      ? others.find(
          (subject) =>
            subject.displayInMarksEntry === true &&
            subject.order === draft.order,
        )
      : undefined;
    if (sameOrder) {
      conflicts.order.push(
        `${label}: order ${draft.order} is used by "${sameOrder.name}" (${sameOrder.type}) in Marks Entry.`,
      );
    }

    if (draft.displayInReportCard && draft.reportCardOrder !== undefined) {
      const sameReportOrder = others.find(
        (subject) =>
          subject.displayInReportCard !== false &&
          subject.reportCardOrder === draft.reportCardOrder,
      );
      if (sameReportOrder) {
        conflicts.reportCardOrder.push(
          `${label}: report card order ${draft.reportCardOrder} is used by "${sameReportOrder.name}" (${sameReportOrder.type}) in the Report Card.`,
        );
      }
    }
  });

  return conflicts;
}

/** Subjects of the given classes in one query (className "in", max 30 values). */
async function loadSubjectsOfClasses(
  classNames: readonly string[],
): Promise<Map<string, SubjectDoc[]>> {
  const result = new Map<string, SubjectDoc[]>(
    classNames.map((className) => [className, []]),
  );
  if (classNames.length === 0) return result;

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION.SUBJECTS),
      where("className", "in", [...classNames]),
    ),
  );
  snapshot.docs.forEach((documentSnapshot) => {
    const subject = toSubjectDoc(documentSnapshot, "");
    result.get(subject.className)?.push(subject);
  });
  return result;
}

function Subject() {
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [subjects, setSubjects] = useState<SubjectDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
  } = useForm<SubjectFormValues>({
    defaultValues: DEFAULT_FORM,
  });

  const subjectName = watch("name");
  const subjectType = watch("type");
  const subjectClasses = watch("classes");

  const showInMarksEntry = watch("displayInMarksEntry");
  const showInReportCard = watch("displayInReportCard");

  // A conflict also depends on the type, the classes and the display toggles,
  // so changing any of them drops the old messages; the next save re-checks.
  const subjectClassesKey = Array.isArray(subjectClasses)
    ? subjectClasses.join("|")
    : "";
  useEffect(() => {
    clearErrors(["name", "order", "reportCardOrder"]);
  }, [
    subjectType,
    subjectClassesKey,
    showInMarksEntry,
    showInReportCard,
    clearErrors,
  ]);
  const [saving, setSaving] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectDoc | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  /* Real-time listener: keeps the subject list in sync with Firestore. */
  useEffect(() => {
    setLoading(true);

    const subjectsQuery = query(
      collection(db, COLLECTION.SUBJECTS),
      where("className", "==", selectedClass),
      orderBy("order", "asc"),
    );

    const unsubscribe = onSnapshot(
      subjectsQuery,
      (snapshot) => {
        setSubjects(
          snapshot.docs.map((documentSnapshot) =>
            toSubjectDoc(documentSnapshot, selectedClass),
          ),
        );
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load subjects:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [selectedClass]);

  const openAddModal = () => {
    setEditingId(null);
    const nextOrder =
      subjects.length > 0
        ? Math.max(...subjects.map((subject) => subject.order)) + 1
        : 1;
    // Sahi default: max defined report card order + 1. Koi bhi report card
    // order define nahi hua to existing order hi default rakhte hain.
    const reportCardOrders = subjects.map(
      (subject) => subject.reportCardOrder ?? 0,
    );
    const nextReportCardOrder =
      subjects.length > 0 && reportCardOrders.some((value) => value > 0)
        ? Math.max(...reportCardOrders) + 1
        : nextOrder;
    // Pre-select the currently open class; the user can add or remove classes
    // from the multi-select before submitting.
    reset({
      name: "",
      type: "Theory",
      order: String(nextOrder),
      reportCardOrder: String(nextReportCardOrder),
      classes: [selectedClass],
      displayInAdmitCard: "true",
      displayInMarksEntry: "true",
      displayInReportCard: "true",
    });
    setModalOpen(true);
  };

  const openEditModal = (subject: SubjectDoc) => {
    setEditingId(subject.id);
    reset({
      name: subject.name,
      type: subject.type,
      order: String(subject.order),
      reportCardOrder: subject.reportCardOrder
        ? String(subject.reportCardOrder)
        : "",
      // Pre-select the class this subject row belongs to; the user can add
      // more classes before saving.
      classes: [subject.className],
      displayInAdmitCard:
        subject.displayInAdmitCard === false ? "false" : "true",
      displayInMarksEntry:
        subject.displayInMarksEntry === false ? "false" : "true",
      displayInReportCard:
        subject.displayInReportCard === false ? "false" : "true",
    });
    setModalOpen(true);
  };

  const handleDisplayToggle =
    (
      name:
        | "displayInAdmitCard"
        | "displayInMarksEntry"
        | "displayInReportCard",
    ) =>
    (value: string) => {
      setValue(name, value === "true" ? "true" : "false");
    };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const onSubmit: SubmitHandler<SubjectFormValues> = async (data) => {
    const name = data.name.trim();
    if (!name) return;

    // Normalize to a positive integer so the Order column always has a value.
    const order = Math.max(1, Math.floor(Number(data.order) || 1));

    // Optional "Report Card Order". Empty means the subject has no fixed
    // position, so the report card shows it at the bottom (after the ordered
    // subjects). Non-empty values are normalized to a positive integer.
    const reportCardOrderRaw = String(data.reportCardOrder ?? "").trim();
    const reportCardOrder =
      reportCardOrderRaw !== "" && Number.isFinite(Number(reportCardOrderRaw))
        ? Math.max(1, Math.floor(Number(reportCardOrderRaw)))
        : undefined;

    const displayInAdmitCard = data.displayInAdmitCard === "true";
    const displayInMarksEntry = data.displayInMarksEntry === "true";
    const displayInReportCard = data.displayInReportCard === "true";

    setSaving(true);
    try {
      // Validate against every class the subject will be saved in. The open
      // class is already live in `subjects`; only the other selected classes
      // are read, in a single query.
      const targetClasses = Array.isArray(data.classes) ? data.classes : [];
      const subjectsByClass = await loadSubjectsOfClasses(
        targetClasses.filter((className) => className !== selectedClass),
      );
      subjectsByClass.set(selectedClass, subjects);

      const conflicts = findSubjectConflicts(
        {
          name,
          type: data.type,
          order,
          reportCardOrder,
          displayInMarksEntry,
          displayInReportCard,
        },
        targetClasses,
        subjectsByClass,
        editingId,
      );
      const fields = ["name", "order", "reportCardOrder"] as const;
      const conflictFields = fields.filter(
        (field) => conflicts[field].length > 0,
      );
      if (conflictFields.length > 0) {
        conflictFields.forEach((field) =>
          setError(field, {
            type: "conflict",
            message: conflicts[field].join(" "),
          }),
        );
        toast.error("This subject conflicts with an existing subject.");
        return;
      }

      if (editingId) {
        const classes = Array.isArray(data.classes) ? data.classes : [];
        if (classes.length === 0) return;

        // Sync the subject across the selected classes in a single batch:
        // the row being edited belongs to the currently open class, so that
        // doc is kept (or moved to the first selected class when its original
        // class was deselected) and new docs are created for the extra classes.
        const batch = writeBatch(db);
        const originalClass = selectedClass;
        if (classes.includes(originalClass)) {
          batch.update(doc(db, COLLECTION.SUBJECTS, editingId), {
            name,
            type: data.type,
            order,
            className: originalClass,
            displayInAdmitCard,
            displayInMarksEntry,
            displayInReportCard,
            ...(reportCardOrder === undefined
              ? { reportCardOrder: deleteField() }
              : { reportCardOrder }),
            updatedAt: serverTimestamp(),
          });
          for (const className of classes.filter(
            (cls) => cls !== originalClass,
          )) {
            batch.set(doc(collection(db, COLLECTION.SUBJECTS)), {
              name,
              type: data.type,
              order,
              className,
              displayInAdmitCard,
              displayInMarksEntry,
              displayInReportCard,
              ...(reportCardOrder === undefined ? {} : { reportCardOrder }),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          const [firstClass, ...restClasses] = classes;
          batch.update(doc(db, COLLECTION.SUBJECTS, editingId), {
            name,
            type: data.type,
            order,
            className: firstClass,
            displayInAdmitCard,
            displayInMarksEntry,
            displayInReportCard,
            ...(reportCardOrder === undefined
              ? { reportCardOrder: deleteField() }
              : { reportCardOrder }),
            updatedAt: serverTimestamp(),
          });
          for (const className of restClasses) {
            batch.set(doc(collection(db, COLLECTION.SUBJECTS)), {
              name,
              type: data.type,
              order,
              className,
              displayInAdmitCard,
              displayInMarksEntry,
              displayInReportCard,
              ...(reportCardOrder === undefined ? {} : { reportCardOrder }),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
        await batch.commit();
        toast.success(
          classes.length === 1
            ? "Subject updated."
            : `Subject updated for ${classes.length} classes.`,
        );
      } else {
        const classes = Array.isArray(data.classes) ? data.classes : [];
        // Safety net: the submit button is disabled while no class is selected,
        // so this can only be reached on a direct form submission.
        if (classes.length === 0) return;

        // Create the subject for every selected class with a single atomic
        // batch write instead of opening the modal for each class separately.
        const batch = writeBatch(db);
        for (const className of classes) {
          const subjectRef = doc(collection(db, COLLECTION.SUBJECTS));
          batch.set(subjectRef, {
            name,
            type: data.type,
            order,
            className,
            displayInAdmitCard,
            displayInMarksEntry,
            displayInReportCard,
            ...(reportCardOrder === undefined ? {} : { reportCardOrder }),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
        toast.success(
          classes.length === 1
            ? "Subject added."
            : `Subject added to ${classes.length} classes.`,
        );
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
    <div className="flex flex-col gap-2">
      {/* Page header */}
      <PageHeader
        title="Subject"
        titleStyle="text-primaryBlue"
        description="Set and manage subjects for every class. Select a class below to view and update its subjects."
        descriptionStyle="text-gray-500"
        button={
          <Button
            buttonName="+ Add Subject"
            variant="success"
            size="md"
            buttonStyle="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={openAddModal}
          />
        }
      />

      {/* Class selector */}
      <div className="bg-white rounded-lg px-4 py-2">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Report Card Order</th>
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
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${SUBJECT_TYPE_BADGE[subject.type]}`}
                      >
                        {subject.order}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${
                          subject.reportCardOrder
                            ? SUBJECT_TYPE_BADGE[subject.type]
                            : "bg-gray-200 text-gray-500"
                        }`}
                        title={
                          subject.reportCardOrder
                            ? "Report card order"
                            : "No report card order - shown at the bottom of the report card"
                        }
                      >
                        {subject.reportCardOrder ?? "—"}
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
        modalClassName="max-w-2xl"
        cancelText="Cancel"
        submitText={editingId ? "Update" : "Add Subject"}
        loading={saving}
        submitDisabled={
          loading ||
          !subjectName?.trim() ||
          !Array.isArray(subjectClasses) ||
          subjectClasses.length === 0
        }
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="mt-4 space-y-4">
          <CustomInput
            control={control}
            name="name"
            label="Subject Name"
            placeholder="e.g. English"
            autoFocus
            rules={{ required: "Subject name is required" }}
          />
          <CustomSelect
            control={control}
            name="type"
            label="Type"
            placeholder={null}
            options={SUBJECT_TYPES}
            rules={{ required: "Please select a subject type" }}
          />
          <CustomInput
            control={control}
            name="order"
            label="Order"
            type="number"
            min={1}
            placeholder="e.g. 1"
            rules={{
              required: "Order is required",
              pattern: {
                value: /^\d+$/,
                message: "Order must be a positive whole number",
              },
            }}
          />
          <CustomInput
            control={control}
            name="reportCardOrder"
            label="Report Card Order"
            type="number"
            min={1}
            placeholder="e.g. 1"
          />
          <p className="-mt-2 text-xs text-gray-400">
            The position of this subject on the report card. Leave it empty to
            show the subject at the bottom of the report card, after the
            ordered subjects.
          </p>
          <Controller
            control={control}
            name="classes"
            rules={{ required: "Select at least one class." }}
            render={({ field, fieldState }) => (
              <>
                <SearchableMultiSelect
                  id="subjectClasses"
                  label="Applicable Classes"
                  required
                  options={CLASS_OPTIONS}
                  values={Array.isArray(field.value) ? field.value : []}
                  onChange={field.onChange}
                  placeholder="Select class(es) for this subject"
                  searchPlaceholder="Type to search classes..."
                  emptyMessage="No matching class found"
                  helpText={
                    editingId
                      ? `The subject will be saved for every selected class. The currently open class (${selectedClass}) is pre-selected.`
                      : `The subject will be created for every selected class at once. The currently open class (${selectedClass}) is pre-selected.`
                  }
                />
                {fieldState.error && (
                  <p className="text-xs font-medium text-red-600">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CustomToggle
              control={control}
              name="displayInAdmitCard"
              label="Show in Admit Card"
              activeValue="true"
              inactiveValue="false"
              activeLabel="Yes"
              inactiveLabel="No"
              onChange={handleDisplayToggle("displayInAdmitCard")}
            />
            <CustomToggle
              control={control}
              name="displayInMarksEntry"
              label="Show in Marks Entry"
              activeValue="true"
              inactiveValue="false"
              activeLabel="Yes"
              inactiveLabel="No"
              onChange={handleDisplayToggle("displayInMarksEntry")}
            />
            <CustomToggle
              control={control}
              name="displayInReportCard"
              label="Show in Report Card"
              activeValue="true"
              inactiveValue="false"
              activeLabel="Yes"
              inactiveLabel="No"
              onChange={handleDisplayToggle("displayInReportCard")}
            />
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
