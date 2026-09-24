import { useState, useContext } from "react";
import { FaTrash } from "react-icons/fa";
import toast from "react-hot-toast";

import Modal from "../../../custom-components/Modal";
import { myContext } from "../../context/MyContextProvider";
import { useAllClassesLengthOfStudents } from "../../../hooks/useAllClassesLengthOfStudents";
import { deleteClassStudents } from "../../../utils/classStudents";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { verifyAccountPassword } from "../../../utils/verifyAccountPassword";
import type {
  ClassStudentCount,
  ClassStudentsDeleteMode,
} from "../../../utils/type";

// The session list changes once a year only; build it once per module load.
const academicYears = generateAcademicYears();

const selectClass =
  "w-full sm:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

/**
 * "All Class Lists" - every class of the school with the number of students it
 * currently has.
 *
 * The numbers come from Firestore aggregation queries (see
 * `useAllClassesLengthOfStudents`), so nothing but the counts is downloaded.
 * The delete button of a row opens a two-step confirmation modal:
 *
 *   1. Password check - the signed-in user must enter their account password
 *      (re-authenticated against Firebase Auth), so a visitor who simply
 *      reached the settings page cannot wipe a whole class by accident.
 *   2. Once the password is verified the real choices appear:
 *      - "Move to Recycle Bin" marks the students as deleted (`isDeleted: true`)
 *        - in `enrollments` always, and in `students` as well once the student
 *        has no other enrollment left. Hidden everywhere, but recoverable.
 *      - "Permanent Delete" removes both documents with `deleteDoc()`.
 *
 * Both actions are limited to the selected academic session, so the history of
 * earlier sessions is never touched.
 */
function AllClassLists() {
  const { user } = useContext(myContext);
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? ""
  );
  const [classToDelete, setClassToDelete] = useState<ClassStudentCount | null>(
    null
  );
  const [pendingAction, setPendingAction] =
    useState<ClassStudentsDeleteMode | null>(null);

  // Step 1 of the delete flow: the user confirms the signed-in account's
  // password before the delete-mode choices (recycle bin / permanent) appear.
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);

  const { classes, loading, error, refresh } = useAllClassesLengthOfStudents({
    academicYear: selectedYear,
  });

  const totalStudents = classes.reduce(
    (sum, item) => sum + item.totalStudents,
    0
  );

  /**
   * Opening the modal starts the two-step flow from scratch, so a stale
   * password / verification can never leak into the next class.
   */
  const openDeleteModal = (item: ClassStudentCount) => {
    setPassword("");
    setPasswordError(null);
    setPasswordVerified(false);
    setVerifyingPassword(false);
    setClassToDelete(item);
  };

  /** The modal is never closed while a delete/recycle write is running. */
  const closeDeleteModal = () => {
    if (pendingAction) return;
    setClassToDelete(null);
    setPassword("");
    setPasswordError(null);
    setPasswordVerified(false);
    setVerifyingPassword(false);
  };

  /**
   * Step 1 - re-authenticates the signed-in user with the entered password.
   * Only a verified password unlocks the actual delete-mode buttons.
   */
  const handlePasswordSubmit = async () => {
    if (!classToDelete || verifyingPassword) return;
    if (password.trim().length === 0) {
      setPasswordError("Please enter your account password.");
      return;
    }

    setVerifyingPassword(true);
    setPasswordError(null);
    try {
      const errorMessage = await verifyAccountPassword(user?.email, password);
      if (errorMessage) {
        setPasswordError(errorMessage);
        return;
      }
      // Success: drop the password immediately and reveal the delete choices.
      setPassword("");
      setPasswordVerified(true);
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleDelete = async (mode: ClassStudentsDeleteMode) => {
    // Ignores a second click while the first action is still running.
    if (!classToDelete || pendingAction) return;

    const className = classToDelete.className;
    const classLabel = `Class ${toOrdinalLabel(className)}`;
    setPendingAction(mode);

    try {
      const result = await deleteClassStudents(className, mode, selectedYear);
      const profiles =
        result.students > 0
          ? ` (${result.students} profile(s) in the students collection)`
          : "";

      toast.success(
        mode === "permanent"
          ? `${result.enrollments} student(s) of ${classLabel} permanently deleted${profiles}.`
          : `${result.enrollments} student(s) of ${classLabel} moved to the recycle bin${profiles}.`
      );
      setClassToDelete(null);
      setPassword("");
      setPasswordError(null);
      setPasswordVerified(false);
      // Re-run the aggregation queries so the table shows the new numbers.
      await refresh();
    } catch (cause) {
      console.error("Failed to delete class students:", cause);
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Failed to delete the students. Please try again."
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <>
      {/* Session filter + summary */}
      <div className="mt-2 flex flex-col gap-4 rounded-lg bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label
            htmlFor="classListYear"
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            Academic Year
          </label>
          <select
            id="classListYear"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className={selectClass}
          >
            {academicYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{totalStudents}</span>{" "}
          student(s) across {classes.length} class(es) in session{" "}
          {selectedYear || "-"}
        </p>
      </div>

      {/* Table */}
      <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-700">
              <th className="px-4 py-3">Sr. No.</th>
              <th className="px-4 py-3">Class Name</th>
              <th className="px-4 py-3">Total Students</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  Counting students of every class...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : classes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  No classes found.
                </td>
              </tr>
            ) : (
              classes.map((item, index) => (
                <tr key={item.className} className="border-t border-gray-100">
                  <td className="px-4 py-3">{index + 1}</td>

                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {toOrdinalLabel(item.className)}
                  </td>

                  <td className="px-4 py-3">{item.totalStudents}</td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      title={
                        item.totalStudents === 0
                          ? `No students in ${selectedYear}`
                          : `Delete the students of Class ${toOrdinalLabel(
                              item.className
                            )}`
                      }
                      aria-label={`Delete the students of Class ${toOrdinalLabel(
                        item.className
                      )}`}
                      disabled={item.totalStudents === 0}
                      onClick={() => openDeleteModal(item)}
                      className="rounded border p-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete the students of a class — Step 1 asks for the account password,
          Step 2 (revealed once verified) offers recycle bin / permanent delete */}
      <Modal
        isOpen={classToDelete !== null}
        onClose={closeDeleteModal}
        title="Delete Students"
        description={
          classToDelete
            ? passwordVerified
              ? `The ${classToDelete.totalStudents} student(s) of Class ${toOrdinalLabel(
                  classToDelete.className
                )} (session ${selectedYear}) are confirmed for deletion. Choose how they should be deleted.`
              : `The ${classToDelete.totalStudents} student(s) of Class ${toOrdinalLabel(
                  classToDelete.className
                )} (session ${selectedYear}) will be affected. Enter your account password to continue.`
            : ""
        }
        cancelText="Cancel"
        submitText={passwordVerified ? "Permanent Delete" : "Delete"}
        submitClassName="bg-red-600 hover:bg-red-700"
        loading={
          passwordVerified
            ? pendingAction === "permanent"
            : verifyingPassword
        }
        submitDisabled={
          passwordVerified
            ? pendingAction !== null
            : verifyingPassword || password.trim().length === 0
        }
        onSubmit={
          passwordVerified
            ? () => void handleDelete("permanent")
            : () => void handlePasswordSubmit()
        }
        secondaryText={passwordVerified ? "Move to Recycle Bin" : undefined}
        secondaryClassName="border-amber-500 text-amber-600 hover:bg-amber-50"
        secondaryLoading={pendingAction === "recycle"}
        onSecondarySubmit={
          passwordVerified ? () => void handleDelete("recycle") : undefined
        }
      >
        {passwordVerified ? (
          <div className="mt-4 space-y-2 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            <p className="font-medium text-emerald-600">
              Password verified - you can now choose the delete mode.
            </p>
            <p>
              <span className="font-semibold text-amber-600">
                Move to Recycle Bin
              </span>{" "}
              - the students are only marked as deleted. They disappear from
              every list but remain in Firestore, so they can be restored
              later.
            </p>
            <p>
              <span className="font-semibold text-red-600">
                Permanent Delete
              </span>{" "}
              - the student records of that class are removed from the
              enrollments and students collections with deleteDoc() and cannot
              be recovered.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <label
              htmlFor="deleteConfirmPassword"
              className="mb-1 block text-sm font-semibold text-gray-700"
            >
              Enter your account password
            </label>
            <input
              id="deleteConfirmPassword"
              type="password"
              autoFocus
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  password.trim().length > 0 &&
                  !verifyingPassword
                ) {
                  void handlePasswordSubmit();
                }
              }}
              placeholder="Your account password"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {passwordError && (
              <p className="mt-2 text-sm text-red-600">{passwordError}</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export default AllClassLists;

