/**
 * Download Excel (Student List): which students (session, classes, section,
 * active / left), which columns (groups of checkboxes) and one sheet or one
 * sheet per class. A teacher only gets the class + section pairs assigned to
 * them. The chosen columns / status / layout are remembered in this browser.
 */
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";

import {
  CVES_BUTTON,
  SECTIONS,
  STUDENT_EXPORT_DEFAULT_COLUMNS,
  STUDENT_EXPORT_GROUPS,
  STUDENT_EXPORT_LAYOUT_OPTIONS,
  STUDENT_EXPORT_STATUS_OPTIONS,
  STUDENT_EXPORT_STORAGE_KEY,
} from "../../../constants";
import CustomCheckboxGroup from "../../../custom-components/CustomCheckboxGroup";
import CustomRadioGroup from "../../../custom-components/CustomRadioGroup";
import CustomSelect from "../../../custom-components/CustomSelect";
import Modal from "../../../custom-components/Modal";
import SearchableMultiSelect from "../../../custom-components/SearchableMultiSelect";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import {
  exportStudentsExcel,
  loadStudentsForExport,
  type StudentExportLayout,
  type StudentExportStatus,
} from "../../../utils/studentExport";
import type { ClassSectionPair } from "../../../utils/studentScope";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";

const academicYears = generateAcademicYears();

interface ExportForm {
  session: string;
  classes: string[];
  section: string;
  status: StudentExportStatus;
  layout: StudentExportLayout;
  columns: Record<string, string[]>;
}

type Remembered = Pick<ExportForm, "status" | "layout" | "columns">;

/** The last choice of this browser (columns, status, layout); defaults when none / unreadable. */
function readRemembered(): Remembered {
  const fallback: Remembered = { status: "active", layout: "single", columns: STUDENT_EXPORT_DEFAULT_COLUMNS };
  try {
    const saved = JSON.parse(localStorage.getItem(STUDENT_EXPORT_STORAGE_KEY) ?? "null") as Partial<Remembered> | null;
    if (!saved) return fallback;
    const columns = Object.fromEntries(
      STUDENT_EXPORT_GROUPS.map((group) => {
        const keys = new Set(group.columns.map((column) => column.key));
        const picked = Array.isArray(saved.columns?.[group.key]) ? saved.columns[group.key] : [];
        return [group.key, picked.filter((key) => keys.has(key))];
      })
    );
    return {
      status: STUDENT_EXPORT_STATUS_OPTIONS.some((option) => option.value === saved.status)
        ? (saved.status as StudentExportStatus)
        : fallback.status,
      layout: saved.layout === "perClass" ? "perClass" : "single",
      columns,
    };
  } catch {
    return fallback;
  }
}

function remember(values: Remembered) {
  try {
    localStorage.setItem(STUDENT_EXPORT_STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Private window / blocked storage: the choice is simply not remembered.
  }
}

interface StudentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Filters of the Student List, used as the starting choice. */
  initial: { session: string; className: string; section: string };
  /** Classes the user may download (a teacher: their own). */
  allowedClasses: string[];
  /** The user's class + section pairs; null = admin (every class). */
  pairs: ClassSectionPair[] | null;
}

function StudentExportModal({ isOpen, onClose, initial, allowedClasses, pairs }: StudentExportModalProps) {
  const [busy, setBusy] = useState(false);
  const { control, setValue, reset, handleSubmit } = useForm<ExportForm>();

  // Every opening starts from the list's filters and this browser's last columns.
  useEffect(() => {
    if (!isOpen) return;
    reset({
      session: initial.session || academicYears[0]?.value || "",
      classes: initial.className ? [initial.className] : [],
      section: initial.section,
      ...readRemembered(),
    });
  }, [isOpen, initial.session, initial.className, initial.section, reset]);

  const columnsPicked = useWatch({ control, name: "columns" });
  const pickedCount = useMemo(
    () => Object.values(columnsPicked ?? {}).reduce((sum, list) => sum + list.length, 0),
    [columnsPicked]
  );

  const classOptions = useMemo(
    () => allowedClasses.map((className) => ({ value: className, label: toOrdinalLabel(className) })),
    [allowedClasses]
  );

  const download = handleSubmit(async (values) => {
    const columns = STUDENT_EXPORT_GROUPS.flatMap((group) =>
      group.columns.filter((column) => values.columns[group.key]?.includes(column.key))
    );
    if (columns.length === 0) return;
    setBusy(true);
    try {
      const rows = await loadStudentsForExport(
        { session: values.session, classes: values.classes, section: values.section, status: values.status },
        pairs
      );
      if (rows.length === 0) {
        toast.error("No student found for this choice.");
        return;
      }
      const classLabel =
        values.classes.length === 0
          ? "All classes"
          : values.classes.length === 1
            ? `Class ${toOrdinalLabel(values.classes[0])}${values.section ? `-${values.section}` : ""}`
            : `${values.classes.length} classes`;
      exportStudentsExcel(rows, columns, { session: values.session, classLabel, layout: values.layout });
      remember({ status: values.status, layout: values.layout, columns: values.columns });
      toast.success(`${rows.length} student(s) downloaded.`);
      onClose();
    } catch (cause) {
      console.error("The student Excel could not be made.", cause);
      toast.error("The Excel could not be made. Please try again.");
    } finally {
      setBusy(false);
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title="Download Excel"
      description="Choose the students and the columns of the file."
      submitText={pickedCount ? `Download (${pickedCount} columns)` : "Pick a column"}
      onSubmit={() => void download()}
      loading={busy}
      submitDisabled={busy || pickedCount === 0}
      submitClassName={CVES_BUTTON}
      modalClassName="max-w-3xl"
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-navy">1. Students</h3>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] sm:items-start">
            <CustomSelect control={control} name="session" label="Session" placeholder={null} options={academicYears} />
            <Controller
              control={control}
              name="classes"
              render={({ field }) => (
                <SearchableMultiSelect
                  label="Classes"
                  options={classOptions}
                  values={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="All classes"
                  searchPlaceholder="Search class..."
                  maxChips={2}
                />
              )}
            />
            <CustomSelect
              control={control}
              name="section"
              label="Section"
              placeholder={null}
              options={[{ value: "", label: "All sections" }, ...SECTIONS.map((section) => ({ value: section, label: section }))]}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CustomRadioGroup
              control={control}
              name="status"
              label="Status"
              options={STUDENT_EXPORT_STATUS_OPTIONS}
              onChange={(value) => setValue("status", value as StudentExportStatus, { shouldDirty: true })}
            />
            <CustomRadioGroup
              control={control}
              name="layout"
              label="File"
              options={STUDENT_EXPORT_LAYOUT_OPTIONS}
              onChange={(value) => setValue("layout", value as StudentExportLayout, { shouldDirty: true })}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-navy">2. Columns</h3>
          {STUDENT_EXPORT_GROUPS.map((group) => (
            <CustomCheckboxGroup
              key={group.key}
              control={control}
              name={`columns.${group.key}`}
              label={group.label}
              options={group.columns.map((column) => ({ value: column.key, label: column.label }))}
              gridClassName="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
              className="p-3"
              onChange={(next) => setValue(`columns.${group.key}`, next, { shouldDirty: true })}
            />
          ))}
        </section>
      </div>
    </Modal>
  );
}

export default StudentExportModal;
