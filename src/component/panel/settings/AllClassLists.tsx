import { useContext, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ListOrdered,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../../../custom-components/Modal";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import { Button as UIButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { myContext } from "../../context/MyContextProvider";
import { useAllClassesLengthOfStudents } from "../../../hooks/useAllClassesLengthOfStudents";
import { deleteClassStudents } from "../../../utils/classStudents";
import {
  generateAllClassRollNumbers,
  generateClassRollNumbers,
  clearClassRollNumbers,
} from "../../../utils/rollNumbers";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { verifyAccountPassword } from "../../../utils/verifyAccountPassword";
import type {
  ClassStudentCount,
  ClassStudentsDeleteMode,
} from "../../../utils/type";
import { Spinner } from "../../../custom-components/Loader";

const academicYears = generateAcademicYears();

function AllClassLists() {
  const { user } = useContext(myContext);
  const [selectedYear, setSelectedYear] = useState(
    academicYears[0]?.value ?? "",
  );
  const [isExpanded, setIsExpanded] = useState(true);
  const [classToDelete, setClassToDelete] = useState<ClassStudentCount | null>(
    null,
  );
  const [pendingAction, setPendingAction] =
    useState<ClassStudentsDeleteMode | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingClass, setGeneratingClass] = useState<string | null>(null);

  const { classes, loading, error, refresh } = useAllClassesLengthOfStudents({
    academicYear: selectedYear,
  });

  const totalStudents = classes.reduce(
    (sum, item) => sum + item.totalStudents,
    0,
  );

  const generationInProgress = generatingAll || generatingClass !== null;

  const handleGenerateClass = async (className: string) => {
    if (generationInProgress || !selectedYear) return;

    setGeneratingClass(className);

    try {
      const result = await generateClassRollNumbers(className, selectedYear);
      toast.success(
        `Generated roll numbers for ${result.studentCount} student(s) in Class ${toOrdinalLabel(className)} (${selectedYear}).`,
      );
    } catch (cause) {
      console.error("Failed to generate class roll numbers:", cause);
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Failed to generate roll numbers. Please try again.",
      );
    } finally {
      setGeneratingClass(null);
    }
  };

  const handleGenerateAll = async () => {
    if (generationInProgress || !selectedYear) return;

    setGeneratingAll(true);

    try {
      const result = await generateAllClassRollNumbers(selectedYear);
      toast.success(
        `Generated roll numbers for ${result.studentCount} student(s) across ${result.classCount} classes (${selectedYear}).`,
      );
    } catch (cause) {
      console.error("Failed to generate all class roll numbers:", cause);
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Failed to generate roll numbers. Please try again.",
      );
    } finally {
      setGeneratingAll(false);
    }
  };

  const openDeleteModal = (item: ClassStudentCount) => {
    setPassword("");
    setPasswordError(null);
    setPasswordVerified(false);
    setVerifyingPassword(false);
    setClassToDelete(item);
  };

  const closeDeleteModal = () => {
    if (pendingAction) return;
    setClassToDelete(null);
    setPassword("");
    setPasswordError(null);
    setPasswordVerified(false);
    setVerifyingPassword(false);
  };

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

      setPassword("");
      setPasswordVerified(true);
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleDelete = async (mode: ClassStudentsDeleteMode) => {
    if (!classToDelete || pendingAction) return;

    const className = classToDelete.className;
    const classLabel = `Class ${toOrdinalLabel(className)}`;
    setPendingAction(mode);

    try {
      const result = await deleteClassStudents(className, mode, selectedYear);

      try {
        await clearClassRollNumbers(className, selectedYear);
      } catch (cause) {
        console.error("Failed to clear class roll numbers:", cause);
        toast.error(
          "Students deleted, but the roll numbers could not be cleared. Please regenerate them.",
        );
      }

      const profiles =
        result.students > 0
          ? ` (${result.students} profile(s) in the students collection)`
          : "";

      toast.success(
        mode === "permanent"
          ? `${result.enrollments} student(s) of ${classLabel} permanently deleted${profiles}.`
          : `${result.enrollments} student(s) of ${classLabel} moved to the recycle bin${profiles}.`,
      );

      setClassToDelete(null);
      setPassword("");
      setPasswordError(null);
      setPasswordVerified(false);
      await refresh();
    } catch (cause) {
      console.error("Failed to delete class students:", cause);
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Failed to delete the students. Please try again.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <>
      <section className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-expanded={isExpanded}
            className="flex items-center gap-2 self-start text-left font-semibold text-gray-800"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span>All Class Lists</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {classes.length}
            </span>
          </button>

          <UIButton
            type="button"
            onClick={() => void handleGenerateAll()}
            disabled={generationInProgress || !selectedYear}
            className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            {generatingAll ? (
              <Spinner size="xs" tone="white" label="" />
            ) : (
              <ListOrdered className="h-4 w-4" />
            )}
            {generatingAll
              ? "Generating All..."
              : "Generate All Class Roll Numbers"}
          </UIButton>
        </div>

        {isExpanded && (
          <div className="p-4">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Label
                  htmlFor="classListYear"
                  className="mb-1 block font-bold text-gray-700"
                >
                  Academic Year
                </Label>
                <SelectDropdown
                  id="classListYear"
                  value={selectedYear}
                  disabled={generationInProgress}
                  onValueChange={setSelectedYear}
                  options={academicYears}
                  className="sm:w-64"
                />
              </div>

              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">
                  {totalStudents}
                </span>{" "}
                student(s) across {classes.length} class(es) in session{" "}
                {selectedYear || "-"}
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-bold text-gray-700">Sr. No.</TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Class Name
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Total Students
                    </TableHead>
                    <TableHead className="text-center font-bold text-gray-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-gray-500"
                      >
                        Counting students of every class...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-red-600"
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : classes.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-gray-500"
                      >
                        No classes found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classes.map((item, index) => (
                      <TableRow key={item.className}>
                        <TableCell className="text-gray-500">{index + 1}</TableCell>

                        <TableCell className="font-semibold text-gray-800">
                          {toOrdinalLabel(item.className)}
                        </TableCell>

                        <TableCell>
                          <span className="inline-block min-w-[40px] rounded-full bg-indigo-50 px-2.5 py-0.5 text-center text-xs font-bold text-primaryBlue">
                            {item.totalStudents}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <UIButton
                              type="button"
                              size="icon"
                              title={`Generate roll numbers for Class ${toOrdinalLabel(item.className)}`}
                              aria-label={`Generate roll numbers for Class ${toOrdinalLabel(item.className)}`}
                              disabled={generationInProgress || !selectedYear}
                              onClick={() =>
                                void handleGenerateClass(item.className)
                              }
                              className="h-8 w-8 bg-blue-600 text-white hover:bg-blue-700"
                            >
                              {generatingClass === item.className ? (
                                <Spinner size="xs" tone="white" label="" />
                              ) : (
                                <ListOrdered className="h-4 w-4" />
                              )}
                            </UIButton>

                            <UIButton
                              type="button"
                              size="icon"
                              variant="destructive"
                              title={
                                item.totalStudents === 0
                                  ? `No students in ${selectedYear}`
                                  : `Delete the students of Class ${toOrdinalLabel(item.className)}`
                              }
                              aria-label={`Delete the students of Class ${toOrdinalLabel(item.className)}`}
                              disabled={item.totalStudents === 0}
                              onClick={() => openDeleteModal(item)}
                              className="h-8 w-8 bg-red-600 text-white hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </UIButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      <Modal
        isOpen={classToDelete !== null}
        onClose={closeDeleteModal}
        title="Delete Students"
        description={
          classToDelete
            ? passwordVerified
              ? `The ${classToDelete.totalStudents} student(s) of Class ${toOrdinalLabel(classToDelete.className)} (session ${selectedYear}) are confirmed for deletion. Choose how they should be deleted.`
              : `The ${classToDelete.totalStudents} student(s) of Class ${toOrdinalLabel(classToDelete.className)} (session ${selectedYear}) will be affected. Enter your account password to continue.`
            : ""
        }
        cancelText="Cancel"
        submitText={passwordVerified ? "Permanent Delete" : "Delete"}
        submitClassName="bg-red-600 hover:bg-red-700"
        loading={
          passwordVerified ? pendingAction === "permanent" : verifyingPassword
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
              every list but remain in Firestore, so they can be restored later.
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
            <Label
              htmlFor="deleteConfirmPassword"
              className="mb-1 block font-semibold text-gray-700"
            >
              Enter your account password
            </Label>
            <Input
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
              className="h-auto border-gray-300 bg-white py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-500 md:text-sm"
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
