import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";

import {
  CLASSES,
  COLLECTION,
} from "../../../constants";

import { db } from "../../../firebase/config";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import Modal from "../../../custom-components/Modal";

const PAGE_SIZE = 10;
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
}

export default function StudentList() {
  const academicYears = generateAcademicYears();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [students, setStudents] = useState<EnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? ""
  );

  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cursorRef = useRef<
    QueryDocumentSnapshot<DocumentData> | undefined
  >(undefined);

  const previousCursorsRef = useRef<
    Array<QueryDocumentSnapshot<DocumentData> | undefined>
  >([]);

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
    };
  };

  const loadStudents = useCallback(
    async (
      cursor?: QueryDocumentSnapshot<DocumentData>
    ) => {
      setLoading(true);

      try {
        const searchValue = search.trim().toLowerCase();

        const enrollmentCollection = collection(
          db,
          COLLECTION.ENROLLMENTS
        );

        let studentQuery;

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
          studentQuery = query(
            enrollmentCollection,

            where("academicYear", "==", selectedYear),

            ...(selectedClass
              ? [where("className", "==", selectedClass)]
              : []),

            where("firstNameLower", ">=", searchValue),
            where(
              "firstNameLower",
              "<=",
              `${searchValue}\uf8ff`
            ),

            orderBy("firstNameLower", "asc"),
            limit(PAGE_SIZE)
          );
        }

        /*
         * -------------------------------------------------------
         * Class selected
         * -------------------------------------------------------
         */

        else if (selectedClass) {
          studentQuery = query(
            enrollmentCollection,

            where("academicYear", "==", selectedYear),
            where("className", "==", selectedClass),

            orderBy("firstNameLower", "asc"),
            orderBy("lastNameLower", "asc"),

            limit(PAGE_SIZE)
          );
        }

        /*
         * -------------------------------------------------------
         * Default
         * -------------------------------------------------------
         *
         * No class + no search
         *
         * Show latest 10 enrollments.
         */

        else {
          studentQuery = query(
            enrollmentCollection,

            where("academicYear", "==", selectedYear),

            orderBy("createdAt", "desc"),

            limit(PAGE_SIZE)
          );
        }

        /*
         * Cursor pagination
         */

        if (cursor) {
          studentQuery = query(
            studentQuery,
            startAfter(cursor)
          );
        }

        const snapshot = await getDocs(studentQuery);

        const result = snapshot.docs.map(convertStudent);

        setStudents(result);

        setHasNextPage(snapshot.docs.length === PAGE_SIZE);

        if (snapshot.docs.length > 0) {
          cursorRef.current =
            snapshot.docs[snapshot.docs.length - 1];
        } else {
          cursorRef.current = undefined;
        }
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
    },
    [search, selectedClass, selectedYear]
  );

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

      cursorRef.current = undefined;
      previousCursorsRef.current = [];

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
    selectedYear,
    loadStudents,
  ]);

  /*
   * -----------------------------------------------------------
   * Next page
   * -----------------------------------------------------------
   */

  const handleNext = async () => {
    if (!hasNextPage || !cursorRef.current) {
      return;
    }

    previousCursorsRef.current.push(cursorRef.current);

    setPage((current) => current + 1);

    await loadStudents(cursorRef.current);
  };

  /*
   * -----------------------------------------------------------
   * Previous page
   * -----------------------------------------------------------
   */

  const handlePrevious = async () => {
    if (page <= 1) {
      return;
    }

    previousCursorsRef.current.pop();

    const previousCursor =
      previousCursorsRef.current[
        previousCursorsRef.current.length - 1
      ];

    setPage((current) => Math.max(1, current - 1));

    /*
     * Previous page needs to start from the cursor
     * before the previous page.
     *
     * For page 1, cursor must be undefined.
     */

    await loadStudents(previousCursor);
  };

  /*
   * -----------------------------------------------------------
   * Delete enrollment
   * -----------------------------------------------------------
   *
   * IMPORTANT:
   * We delete the academic enrollment, not the permanent
   * student document.
   */

  const handleDelete = async (enrollmentId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this student's enrollment?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(enrollmentId);

    try {
      await deleteDoc(
        doc(db, COLLECTION.ENROLLMENTS, enrollmentId)
      );

      toast.success("Student enrollment removed.");

      cursorRef.current = undefined;
      previousCursorsRef.current = [];
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

  return (
    <div className="p-6">
      {/* Header */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Students
          </h1>

          <p className="text-sm text-gray-500">
            Manage students by academic year and class.
          </p>
        </div>
      </div>

      {/* Filters */}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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
      </div>

      {/* Table */}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3">
                Enrollment
              </th>

              <th className="px-4 py-3">
                Name
              </th>

              <th className="px-4 py-3">
                Class
              </th>

              <th className="px-4 py-3">
                Section
              </th>

              <th className="px-4 py-3">
                Father's Name
              </th>

              <th className="px-4 py-3">
                Phone
              </th>

              <th className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center"
                >
                  Loading students...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  No students found.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr
                  key={student.id}
                  className="border-b last:border-b-0"
                >
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
                        className="rounded border px-3 py-1 text-sm"
                        onClick={() => {
                          // Navigate to student details/edit page
                          // Example:
                          // navigate(`/students/${student.studentId}`)
                        }}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === student.id}
                        onClick={() =>
                          handleDelete(student.id)
                        }
                        className="rounded border px-3 py-1 text-sm text-red-600 disabled:opacity-50"
                      >
                        {deletingId === student.id
                          ? "Deleting..."
                          : "Delete"}
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

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Page {page}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page === 1 || loading}
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
  description="Are you sure you want to delete this student?"
  cancelText="Cancel"
  submitText="Delete"
  onSubmit={handleDelete(student.id)}
/>
    </div>
  );
}