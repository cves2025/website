import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  QueryConstraint,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2 } from "lucide-react";

import {
  ADD_STUDENT_PATH,
  VIEW_STUDENT_PATH,
  CLASSES,
  COLLECTION,
  SECTIONS,
} from "../../../constants";

import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { generateClassRollNumbers } from "../../../utils/rollNumbers";
import {
  allowedClassSections,
  buildQuerySpecs,
  pairKey,
  rowsFromCache,
  specKey,
  type EnrollmentQuerySpec,
} from "../../../utils/studentScope";
import {
  NO_SCOPE,
  PERMISSIONS,
  scopedClasses,
  scopedSections,
} from "../../../permissions";
import Modal from "../../../custom-components/Modal";
import { Button as UIButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import PageHeader from "../../../custom-components/PageHeader";
import Button from "../../../custom-components/Button";
import { myContext } from "../../context/MyContextProvider";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100];

const academicYears = generateAcademicYears();

/** One row of the student list (an enrollment joined with display fields). */
interface StudentListRow {
  id: string;
  studentId: string;
  studentName: string;
  firstName: string;
  lastName: string;
  enrollment: string;
  className: string;
  section: string;
  academicYear: string;
  fatherName?: string;
  phone?: string;
  status?: string;
  isDeleted?: boolean;
  createdAt?: number;
}

type SortField =
  | "enrollment"
  | "studentName"
  | "className"
  | "section"
  | "fatherName"
  | "phone"
  | "createdAt";

type SortDirection = "asc" | "desc";

function toStudentRow(
  docSnapshot: QueryDocumentSnapshot<DocumentData>,
): StudentListRow {
  const data = docSnapshot.data();

  return {
    id: docSnapshot.id,
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    enrollment: data.enrollment ?? "",
    className: data.className ?? "",
    section: data.section ?? "",
    academicYear: data.academicYear ?? "",
    fatherName: data.fatherName ?? "",
    phone: data.phone ?? "",
    status: data.status ?? "active",
    isDeleted: data.isDeleted === true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.seconds : 0,
  };
}

async function fetchEnrollments(
  year: string,
  spec: EnrollmentQuerySpec,
): Promise<StudentListRow[]> {
  const constraints: QueryConstraint[] = [where("academicYear", "==", year)];
  if (spec.className) {
    constraints.push(where("className", "==", spec.className));
  }
  if (spec.section) {
    constraints.push(where("section", "==", spec.section));
  }

  const snapshot = await getDocs(
    query(collection(db, COLLECTION.ENROLLMENTS), ...constraints),
  );
  return snapshot.docs.map(toStudentRow).filter((row) => !row.isDeleted);
}

function matchesSearch(student: StudentListRow, searchValue: string): boolean {
  const fullName = (
    student.studentName || `${student.firstName} ${student.lastName}`
  )
    .trim()
    .toLowerCase();

  const enrollment = String(student.enrollment ?? "")
    .trim()
    .toLowerCase();

  return (
    fullName.startsWith(searchValue) ||
    fullName.split(/\s+/).some((word) => word.startsWith(searchValue)) ||
    enrollment.startsWith(searchValue)
  );
}

/**
 * Column comparator. Enrollment / phone values are stored as text but are
 * usually numeric (e.g. "1001"), so they are compared as numbers whenever
 * both sides are numeric.
 */
function compareRows(
  a: StudentListRow,
  b: StudentListRow,
  field: SortField,
  direction: SortDirection,
): number {
  let comparison = 0;

  if (field === "createdAt") {
    comparison = Number(a.createdAt) - Number(b.createdAt);
  } else {
    const left =
      field === "studentName"
        ? `${a.firstName} ${a.lastName}`.trim().toLowerCase()
        : String(a[field] ?? "").toLowerCase();
    const right =
      field === "studentName"
        ? `${b.firstName} ${b.lastName}`.trim().toLowerCase()
        : String(b[field] ?? "").toLowerCase();

    const leftNumber = left === "" ? NaN : Number(left);
    const rightNumber = right === "" ? NaN : Number(right);

    comparison =
      !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)
        ? leftNumber - rightNumber
        : left.localeCompare(right);
  }

  if (comparison === 0) comparison = a.id.localeCompare(b.id);

  return direction === "asc" ? comparison : -comparison;
}

/**
 * Default list order: class order of `CLASSES` (PG, Nursery, LKG ...), then
 * section, then name. Unknown classes go to the end.
 */
function compareByClassOrder(a: StudentListRow, b: StudentListRow): number {
  const rank = (className: string) => {
    const index = CLASSES.indexOf(className);
    return index === -1 ? CLASSES.length : index;
  };

  return (
    rank(a.className) - rank(b.className) ||
    a.section.localeCompare(b.section) ||
    compareRows(a, b, "studentName", "asc")
  );
}

export default function StudentList() {
  const navigate = useNavigate();
  const { user, can, profileReady } = useContext(myContext);

  const scope = user?.scope ?? NO_SCOPE;
  const isAdmin = scope.kind === "all";
  // Add / edit / delete stay with the roles that may create students.
  const canManage = can(PERMISSIONS.STUDENT_CREATE);
  // View / print the admission form; ON for teachers by default.
  const canViewForm = can(PERMISSIONS.STUDENT_FORM_VIEW);
  const showActions = canManage || canViewForm;
  const scopeReady = profileReady && user?.accessState === "ok";

  /** Class + section pairs the user may see; null = every class (admin). */
  const pairs = useMemo(() => allowedClassSections(scope), [scope]);
  const allowedSet = useMemo(
    () =>
      pairs
        ? new Set(pairs.map((pair) => pairKey(pair.className, pair.section)))
        : null,
    [pairs],
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentListRow | null>(
    null,
  );
  const [rows, setRows] = useState<StudentListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? "",
  );

  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sortActive, setSortActive] = useState(false);

  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [studentPhotos, setStudentPhotos] = useState<Record<string, string>>(
    {},
  );

  /* Ignores the answer of an outdated request (fast filter changes). */
  const requestIdRef = useRef(0);

  /* Rows already read during this visit, so changing the filters is free. */
  const cacheRef = useRef(new Map<string, StudentListRow[]>());

  /* The search box is focused as soon as the page opens. */
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  /* Classes and sections offered in the filters. */
  const classOptions = isAdmin ? CLASSES : scopedClasses(scope, CLASSES);
  const sectionOptions = isAdmin
    ? SECTIONS
    : selectedClass
      ? scopedSections(scope, selectedClass, SECTIONS)
      : SECTIONS.filter((section) =>
          (pairs ?? []).some((pair) => pair.section === section),
        );

  /*
   * -----------------------------------------------------------
   * Data source (the only place that reads enrollments)
   * -----------------------------------------------------------
   *
   * The chosen class / section go into the Firestore query, and a teacher
   * only ever asks for the class + section pairs assigned to them. Rows that
   * were already read in this visit answer narrower filters without a read.
   * Search, sorting and pagination work on the in-memory list.
   */

  const loadStudents = useCallback(async () => {
    if (!scopeReady) return;

    const requestId = ++requestIdRef.current;
    const specs = buildQuerySpecs(pairs, selectedClass, selectedSection);

    if (specs.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const parts = await Promise.all(
        specs.map(async (spec) => {
          const cached = rowsFromCache(cacheRef.current, selectedYear, spec);
          if (cached) return cached;

          const fetched = await fetchEnrollments(selectedYear, spec);
          cacheRef.current.set(specKey(selectedYear, spec), fetched);
          return fetched;
        }),
      );

      if (requestId !== requestIdRef.current) return;

      // Defense in depth: a teacher never sees a pair outside the assignment.
      const byId = new Map<string, StudentListRow>();
      parts.forEach((part) => {
        part.forEach((row) => {
          if (allowedSet && !allowedSet.has(pairKey(row.className, row.section))) {
            return;
          }
          byId.set(row.id, row);
        });
      });

      setRows(Array.from(byId.values()));
    } catch (error) {
      console.error("Load students error:", error);

      if (requestId === requestIdRef.current) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load students.",
        );
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [
    scopeReady,
    pairs,
    allowedSet,
    selectedYear,
    selectedClass,
    selectedSection,
  ]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  /* Back to the first page whenever the list content changes. */
  useEffect(() => {
    setPage(1);
  }, [search, selectedClass, selectedSection, selectedYear]);

  const students = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    let result = rows;

    if (selectedSection) {
      result = result.filter((row) => row.section === selectedSection);
    }

    if (searchValue) {
      result = result.filter((row) => matchesSearch(row, searchValue));
    }

    // A column header was clicked: that choice wins.
    if (sortActive) {
      return [...result].sort((a, b) =>
        compareRows(a, b, sortField, sortDirection),
      );
    }

    if (searchValue || selectedClass) {
      return [...result].sort((a, b) =>
        compareRows(a, b, "studentName", "asc"),
      );
    }

    // Default view: newest student pinned on top, the rest class-wise.
    const newest = result.reduce<StudentListRow | null>(
      (latest, row) =>
        (row.createdAt ?? 0) > (latest?.createdAt ?? 0) ? row : latest,
      null,
    );

    const rest = result
      .filter((row) => row !== newest)
      .sort(compareByClassOrder);

    return newest ? [newest, ...rest] : rest;
  }, [
    rows,
    search,
    selectedClass,
    selectedSection,
    sortField,
    sortDirection,
    sortActive,
  ]);

  /*
   * -----------------------------------------------------------
   * Column sorting / pagination handlers
   * -----------------------------------------------------------
   */

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    setSortActive(true);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleNext = () => {
    if (!hasNextPage || loading) {
      return;
    }

    setPage(currentPage + 1);
  };

  const handlePrevious = () => {
    if (currentPage <= 1) {
      return;
    }

    setPage(currentPage - 1);
  };

  /* Removes a deleted student from every cached result. */
  const removeFromCache = (id: string) => {
    cacheRef.current.forEach((list, key) => {
      cacheRef.current.set(
        key,
        list.filter((row) => row.id !== id),
      );
    });
  };

  /*
   * -----------------------------------------------------------
   * Delete enrollment (soft delete)
   * -----------------------------------------------------------
   *
   * IMPORTANT:
   * We do NOT delete the permanent student document or the
   * enrollment document. We only mark the enrollment as
   * `isDeleted: true` so it is hidden from the list. The row is
   * removed from the local list, so no re-read is needed.
   */

  const handleDelete = async () => {
    if (!studentToDelete || !canManage) {
      return;
    }

    const removedStudent = studentToDelete;
    setDeletingId(removedStudent.id);

    try {
      await updateDoc(doc(db, COLLECTION.ENROLLMENTS, removedStudent.id), {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      });

      // Roll numbers are stored per class, so refresh the class this
      // student belonged to.
      try {
        await generateClassRollNumbers(
          removedStudent.className,
          removedStudent.academicYear,
        );
      } catch (rollNumberError) {
        console.error("Failed to refresh roll numbers:", rollNumberError);
        toast.error(
          "Student removed, but roll numbers could not be refreshed. Please regenerate them from Settings.",
        );
      }

      toast.success("Student enrollment removed.");

      removeFromCache(removedStudent.id);
      setRows((current) =>
        current.filter((row) => row.id !== removedStudent.id),
      );
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      console.error("Delete enrollment error:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to delete enrollment.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * -----------------------------------------------------------
   * Pagination
   * -----------------------------------------------------------
   */

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const visibleStudents = students.slice(startIndex, startIndex + pageSize);
  const hasNextPage = currentPage < totalPages;

  /*
   * -----------------------------------------------------------
   * Student photos
   * -----------------------------------------------------------
   *
   * Photos live on the students document (students/{studentId}),
   * not on the enrollment row, so they are fetched lazily for the
   * visible page. Every student is requested at most once per visit,
   * even when pages are turned quickly.
   */

  const photoRequestedRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const visibleIdsKey = visibleStudents
    .map((student) => student.studentId)
    .filter((id) => id !== "")
    .join(",");

  useEffect(() => {
    if (loading || visibleIdsKey === "") {
      return;
    }

    const missingIds = visibleIdsKey
      .split(",")
      .filter((id) => !photoRequestedRef.current.has(id));
    if (missingIds.length === 0) {
      return;
    }
    missingIds.forEach((id) => photoRequestedRef.current.add(id));

    const loadPhotos = async () => {
      const entries = await Promise.all(
        missingIds.map(async (studentId) => {
          try {
            const snapshot = await getDoc(
              doc(db, COLLECTION.STUDENTS, studentId),
            );
            const data = snapshot.data();
            return {
              id: studentId,
              photo:
                typeof data?.studentPhoto === "string" ? data.studentPhoto : "",
            };
          } catch (error) {
            console.warn("Could not load student photo:", error);
            return { id: studentId, photo: "" };
          }
        }),
      );

      if (!mountedRef.current) return;

      setStudentPhotos((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          next[entry.id] = entry.photo;
        }
        return next;
      });
    };

    void loadPhotos();
  }, [loading, visibleIdsKey]);

  const sortIndicator = (field: SortField) => {
    if (!sortActive || field !== sortField) {
      return null;
    }

    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const sortableHeader = (label: string, field: SortField) => (
    <TableHead
      className="cursor-pointer select-none font-bold text-gray-700"
      onClick={() => handleSort(field)}
      title={`Sort by ${label}`}
    >
      {label}
      {sortIndicator(field)}
    </TableHead>
  );

  const columnCount = showActions ? 9 : 8;
  const noAccess = profileReady && user?.accessState !== "ok";
  const nothingAssigned = scopeReady && pairs !== null && pairs.length === 0;

  if (noAccess || nothingAssigned) {
    return (
      <div className="flex flex-col gap-2">
        <PageHeader
          title="Student List"
          titleStyle="text-primaryBlue"
          description="Manage students by academic year and class."
          descriptionStyle="text-gray-500"
        />
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-900">
          {noAccess
            ? "Your account cannot open the student list."
            : "No class or section is assigned to you yet."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Student List"
        titleStyle="text-primaryBlue"
        description={
          isAdmin
            ? "Manage students by academic year and class."
            : "Students of your assigned classes and sections."
        }
        descriptionStyle="text-gray-500"
        button={
          canManage ? (
            <Button
              buttonName="+ Add Student"
              variant="cves"
              size="md"
              buttonStyle="rounded-full"
              onClick={() => navigate(ADD_STUDENT_PATH)}
            />
          ) : undefined
        }
      />

      {/* Filters */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 bg-white rounded-lg py-2 px-4">
        {/* Search */}

        <div>
          <Label htmlFor="student-search" className="mb-1 block font-bold">
            Search
          </Label>

          <Input
            id="student-search"
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or enrollment no..."
          />
        </div>

        {/* Academic Year */}

        <div>
          <Label htmlFor="student-year" className="mb-1 block font-bold">
            Academic Year
          </Label>

          <SelectDropdown
            id="student-year"
            value={selectedYear}
            onValueChange={setSelectedYear}
            options={academicYears}
          />
        </div>

        {/* Class */}

        <div>
          <Label htmlFor="student-class" className="mb-1 block font-bold">
            Class
          </Label>

          <SelectDropdown
            id="student-class"
            value={selectedClass}
            onValueChange={(value) => {
              setSelectedClass(value);
              // Sections differ per class for a teacher, so start over.
              setSelectedSection("");
            }}
            options={[
              { label: isAdmin ? "All Classes" : "All My Classes", value: "" },
              ...classOptions.map((className) => ({
                label: className,
                value: className,
              })),
            ]}
          />
        </div>

        {/* Section */}

        <div>
          <Label htmlFor="student-section" className="mb-1 block font-bold">
            Section
          </Label>

          <SelectDropdown
            id="student-section"
            value={selectedSection}
            onValueChange={setSelectedSection}
            options={[
              {
                label: isAdmin ? "All Sections" : "All My Sections",
                value: "",
              },
              ...sectionOptions.map((section) => ({
                label: section,
                value: section,
              })),
            ]}
          />
        </div>
      </div>

      {/* Table */}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* The table scrolls inside its own box (capped to the screen height
            minus the app header and pagination), so the column header can stay
            stuck at the top of that box while the rows scroll. */}
        <Table
          className="min-w-[1000px]"
          containerClassName="max-h-[calc(100dvh-8rem)]"
        >
          <TableHeader className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_theme(colors.gray.200)]">
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="font-bold text-gray-700">Sr. No.</TableHead>

              <TableHead className="font-bold text-gray-700">Photo</TableHead>

              {sortableHeader("Enrollment", "enrollment")}

              {sortableHeader("Name", "studentName")}

              {sortableHeader("Class", "className")}

              {sortableHeader("Section", "section")}

              {sortableHeader("Father's Name", "fatherName")}

              {sortableHeader("Phone", "phone")}

              {showActions && (
                <TableHead className="text-center font-bold text-gray-700">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount} className="py-10 text-center">
                  Loading students...
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columnCount}
                  className="py-10 text-center text-gray-500"
                >
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              visibleStudents.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell className="text-gray-500">{startIndex + index + 1}</TableCell>
                  <TableCell>
                    {studentPhotos[student.studentId] ? (
                      <img
                        src={studentPhotos[student.studentId]}
                        alt={`Photo of ${student.studentName}`}
                        className="h-10 w-10 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
                        &mdash;
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{student.enrollment}</TableCell>

                  <TableCell className="font-medium text-gray-800">
                    {student.studentName}
                  </TableCell>

                  <TableCell>{student.className}</TableCell>

                  <TableCell>{student.section}</TableCell>

                  <TableCell>{student.fatherName || "-"}</TableCell>

                  <TableCell>{student.phone || "-"}</TableCell>

                  {showActions && (
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        {canViewForm && (
                          <UIButton
                            type="button"
                            size="icon"
                            title="View"
                            aria-label={`View ${student.studentName}`}
                            onClick={() => {
                              navigate(`${VIEW_STUDENT_PATH}?id=${student.id}`);
                            }}
                            className="h-8 w-8 bg-green-600 text-white hover:bg-green-700"
                          >
                            <Eye className="h-4 w-4" />
                          </UIButton>
                        )}

                        {canManage && (
                          <>
                            <UIButton
                              type="button"
                              size="icon"
                              title="Edit"
                              aria-label={`Edit ${student.studentName}`}
                              onClick={() => {
                                navigate(`${ADD_STUDENT_PATH}?edit=${student.id}`);
                              }}
                              className="h-8 w-8 bg-blue-600 text-white hover:bg-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </UIButton>

                            <UIButton
                              type="button"
                              size="icon"
                              variant="destructive"
                              title="Delete"
                              aria-label={`Delete ${student.studentName}`}
                              disabled={deletingId === student.id}
                              onClick={() => {
                                setStudentToDelete(student);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-8 w-8 bg-red-600 text-white hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </UIButton>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Show</span>

          <SelectDropdown
            value={String(pageSize)}
            onValueChange={(value) => handlePageSizeChange(Number(value))}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              label: String(size),
              value: String(size),
            }))}
            className="h-8 w-[72px]"
            aria-label="Rows per page"
          />

          <span>per page</span>
        </div>

        <span className="text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentPage === 1 || loading}
            onClick={handlePrevious}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={!hasNextPage || loading}
            onClick={handleNext}
            // Blue at rest; the school-colour gradient on hover (not when disabled).
            className="rounded border border-transparent bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-cves hover:shadow-md disabled:opacity-50 disabled:hover:bg-none disabled:hover:shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Student"
        description={
          studentToDelete
            ? `Are you sure you want to delete ${studentToDelete.studentName}?`
            : "Are you sure you want to delete this student?"
        }
        cancelText="Cancel"
        submitText="Delete"
        submitClassName="bg-cves shadow-sm transition hover:shadow-md hover:brightness-110"
        loading={deletingId !== null}
        onSubmit={handleDelete}
      />
    </div>
  );
}