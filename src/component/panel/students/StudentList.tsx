import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  DocumentData,
  getDocs,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";

import {
  ADD_STUDENT_PATH,
  CLASSES,
  COLLECTION,
  SECTIONS,
} from "../../../constants";

import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import Modal from "../../../custom-components/Modal";
import PageHeader from "../../../custom-components/PageHeader";
import Button from "../../../custom-components/Button";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100];
const SEARCH_DELAY = 350;

interface EnrollmentRecord {
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

export default function StudentList() {
  const navigate = useNavigate();
  const academicYears = generateAcademicYears();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] =
    useState<EnrollmentRecord | null>(null);
  const [students, setStudents] = useState<EnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? ""
  );

  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");
  const [sortActive, setSortActive] = useState(false);

  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const convertStudent = (
    docSnapshot: QueryDocumentSnapshot<DocumentData>
  ): EnrollmentRecord => {
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
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.seconds
          : 0,
    };
  };

  const loadStudents = useCallback(async () => {
    setLoading(true);

    try {
      const searchValue = search.trim().toLowerCase();

      const enrollmentCollection = collection(
        db,
        COLLECTION.ENROLLMENTS
      );

      /*
       * -------------------------------------------------------
       * Data source
       * -------------------------------------------------------
       *
       * Enrollments are fetched for the selected academic year
       * and then filtered / sorted / paginated on the client so
       * the list can be sorted by any column without requiring
       * extra Firestore composite indexes.
       */

      const snapshot = await getDocs(
        query(
          enrollmentCollection,
          where("academicYear", "==", selectedYear)
        )
      );

      let result = snapshot.docs
        .map(convertStudent)
        .filter((student) => !student.isDeleted);

      if (selectedClass) {
        result = result.filter(
          (student) => student.className === selectedClass
        );
      }

      if (selectedSection) {
        result = result.filter(
          (student) => student.section === selectedSection
        );
      }

      /*
       * -------------------------------------------------------
       * Search mode
       * -------------------------------------------------------
       *
       * Name prefix search.
       *
       * Example:
       * "rah" -> Rahul, Raghav, Rakesh...
       */

      if (searchValue) {
        result = result.filter((student) =>
          student.firstName.toLowerCase().startsWith(searchValue)
        );
      }

      /*
       * -------------------------------------------------------
       * Column sorting
       * -------------------------------------------------------
       *
       * Until the user clicks a column header the original
       * server-side defaults are kept:
       *   - search / class / section -> name ascending
       *   - otherwise                -> newest first
       */

      let effectiveField = sortField;
      let effectiveDirection = sortDirection;

      if (!sortActive) {
        effectiveField =
          searchValue || selectedClass || selectedSection
            ? "studentName"
            : "createdAt";
        effectiveDirection =
          searchValue || selectedClass || selectedSection
            ? "asc"
            : "desc";
      }

      const directionMultiplier =
        effectiveDirection === "asc" ? 1 : -1;

      result.sort((a, b) => {
        let comparison = 0;

        if (effectiveField === "createdAt") {
          const left = Number(a.createdAt);
          const right = Number(b.createdAt);
          comparison = left < right ? -1 : left > right ? 1 : 0;
        } else {
          let left: string;
          let right: string;

          if (effectiveField === "studentName") {
            left = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
            right = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
          } else {
            left = String(a[effectiveField] ?? "").toLowerCase();
            right = String(b[effectiveField] ?? "").toLowerCase();
          }

          /*
           * Enrollment / phone values are stored as text but are
           * usually numeric (e.g. "1001"), so compare them as
           * numbers whenever both sides are numeric.
           */

          const leftNumber =
            left === "" ? NaN : Number(left);
          const rightNumber =
            right === "" ? NaN : Number(right);

          if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
            comparison =
              leftNumber < rightNumber
                ? -1
                : leftNumber > rightNumber
                  ? 1
                  : 0;
          } else {
            comparison = left < right ? -1 : left > right ? 1 : 0;
          }
        }

        if (comparison === 0) {
          comparison = a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        }

        return comparison * directionMultiplier;
      });

      setStudents(result);
    } catch (error) {
      console.error("Load students error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load students."
      );
    } finally {
      setLoading(false);
    }
  }, [
    search,
    selectedClass,
    selectedSection,
    selectedYear,
    sortField,
    sortDirection,
    sortActive,
  ]);

  /*
   * -----------------------------------------------------------
   * Initial/filter/search loading
   * -----------------------------------------------------------
   */

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      setPage(1);

      loadStudents();
    }, search ? SEARCH_DELAY : 0);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [
    search,
    selectedClass,
    selectedSection,
    selectedYear,
    loadStudents,
  ]);

  /*
   * -----------------------------------------------------------
   * Column sorting
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

  /*
   * -----------------------------------------------------------
   * Records per page
   * -----------------------------------------------------------
   */

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  /*
   * -----------------------------------------------------------
   * Next page
   * -----------------------------------------------------------
   */

  const handleNext = () => {
    if (!hasNextPage || loading) {
      return;
    }

    setPage(currentPage + 1);
  };

  /*
   * -----------------------------------------------------------
   * Previous page
   * -----------------------------------------------------------
   */

  const handlePrevious = () => {
    if (currentPage <= 1) {
      return;
    }

    setPage(currentPage - 1);
  };

  /*
   * -----------------------------------------------------------
   * Delete enrollment (soft delete)
   * -----------------------------------------------------------
   *
   * IMPORTANT:
   * We do NOT delete the permanent student document or the
   * enrollment document. We only mark the enrollment as
   * `isDeleted: true` so it is hidden from the list.
   */

  const handleDelete = async () => {
    if (!studentToDelete) {
      return;
    }

    setDeletingId(studentToDelete.id);

    try {
      await updateDoc(
        doc(db, COLLECTION.ENROLLMENTS, studentToDelete.id),
        {
          isDeleted: true,
          updatedAt: serverTimestamp(),
        }
      );

      toast.success("Student enrollment removed.");

      setIsDeleteModalOpen(false);
      setStudentToDelete(null);

      setPage(1);

      await loadStudents();
    } catch (error) {
      console.error("Delete enrollment error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete enrollment."
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

  const sortIndicator = (field: SortField) => {
    if (!sortActive || field !== sortField) {
      return null;
    }

    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const sortableHeader = (label: string, field: SortField) => (
    <th
      className="px-4 py-3 cursor-pointer select-none"
      onClick={() => handleSort(field)}
      title={`Sort by ${label}`}
    >
      {label}
      {sortIndicator(field)}
    </th>
  );

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Student List"
        titleStyle="text-primaryBlue"
        description="Manage students by academic year and class."
        descriptionStyle="text-gray-500"
        button={
          <Button
            buttonName="+ Add Student"
            variant="success"
            size="md"
            buttonStyle="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate(ADD_STUDENT_PATH)}
          />
        }
      />

      {/* Filters */}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4 bg-white rounded-lg py-2 px-4">
        {/* Search */}

        <div>
          <label className="mb-1 block text-sm font-medium">
            Search
          </label>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search student name..."
            className="w-full rounded-md border px-3 py-2 outline-none"
          />
        </div>

        {/* Academic Year */}

        <div>
          <label className="mb-1 block text-sm font-medium">
            Academic Year
          </label>

          <select
            value={selectedYear}
            onChange={(event) =>
              setSelectedYear(event.target.value)
            }
            className="w-full rounded-md border px-3 py-2"
          >
            {academicYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        {/* Class */}

        <div>
          <label className="mb-1 block text-sm font-medium">
            Class
          </label>

          <select
            value={selectedClass}
            onChange={(event) =>
              setSelectedClass(event.target.value)
            }
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">All Classes</option>

            {CLASSES.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>

        {/* Section */}

        <div>
          <label className="mb-1 block text-sm font-medium">
            Section
          </label>

          <select
            value={selectedSection}
            onChange={(event) =>
              setSelectedSection(event.target.value)
            }
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">All Sections</option>

            {SECTIONS.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3">
                Sr. No.
              </th>

              {sortableHeader("Enrollment", "enrollment")}

              {sortableHeader("Name", "studentName")}

              {sortableHeader("Class", "className")}

              {sortableHeader("Section", "section")}

              {sortableHeader("Father's Name", "fatherName")}

              {sortableHeader("Phone", "phone")}

              <th className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center"
                >
                  Loading students...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  No students found.
                </td>
              </tr>
            ) : (
              visibleStudents.map((student, index) => (
                <tr
                  key={student.id}
                  className="border-b last:border-b-0"
                >
                  <td className="px-4 py-3">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-4 py-3">
                    {student.enrollment}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {student.studentName}
                  </td>

                  <td className="px-4 py-3">
                    {student.className}
                  </td>

                  <td className="px-4 py-3">
                    {student.section}
                  </td>

                  <td className="px-4 py-3">
                    {student.fatherName || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {student.phone || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        title="Edit"
                        aria-label={`Edit ${student.studentName}`}
                        onClick={() => {
                          navigate(
                            `/welcome/student/add?edit=${student.id}`
                          );
                        }}
                        className="rounded border p-2 text-sm text-blue-600 hover:bg-blue-50"
                      >
                        <FaEdit />
                      </button>

                      <button
                        type="button"
                        title="Delete"
                        aria-label={`Delete ${student.studentName}`}
                        disabled={deletingId === student.id}
                        onClick={() => {
                          setStudentToDelete(student);
                          setIsDeleteModalOpen(true);
                        }}
                        className="rounded border p-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Show</span>

          <select
            value={pageSize}
            onChange={(event) =>
              handlePageSizeChange(Number(event.target.value))
            }
            className="rounded-md border px-2 py-1"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

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
            className="rounded border px-4 py-2 disabled:opacity-50"
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
        loading={deletingId !== null}
        onSubmit={handleDelete}
      />
    </div>
  );
}