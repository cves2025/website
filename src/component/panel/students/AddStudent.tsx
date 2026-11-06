import { useEffect, useRef, useState } from "react";
import { useForm, SubmitHandler, FieldPath, get } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AdmissionStudentFormValues } from "../../../utils/type";
import BulkStudentImport from "../BulkStudentImport";
import CustomButton from "../../../custom-components/CustomButton";
import Modal from "../../../custom-components/Modal";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import {
  AUTO_NEXT_STUDENT_AFTER_UPDATE,
  CLASSES,
  COLLECTION,
} from "../../../constants";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import PhotoUploadBox from "../../../custom-components/admission/PhotoUploadBox";
import {
  uploadStudentPhoto,
  deleteStudentPhoto,
  PhotoKind,
} from "../../../firebase/studentPhotos";
import { generateClassRollNumbers } from "../../../utils/rollNumbers";
import {
  fetchNextEnrollment,
  isEnrollmentTaken,
  recordEnrollments,
} from "../../../utils/enrollmentCounter";
import { studentDocToFormValues } from "../../../utils/admissionFormValues";
import { AdmissionInfoSheet, AdmissionSchoolSheet } from "./AdmissionFormSheet";

type StudentTab = "info" | "school" | "bulk";

const [currentSessionStartYear, currentSessionEndYear] = (
  generateAcademicYears()[0]?.value ?? ""
).split("-");

const defaultValues: AdmissionStudentFormValues = {
  firstName: "",
  lastName: "",
  enrollment: "",
  className: "",
  section: "A",
  fatherName: "",
  motherName: "",
  dob: "",
  phone: "",
  email: "",
  address: "",
  academicYear: "",
  fullName: "",
  fatherOccupation: "",
  gender: "",
  category: "",
  nationality: "INDIAN",
  phone2: "",
  correspondenceName: "",
  city: "",
  state: "",
  pin: "",
  permanentAddress: "",
  permanentCity: "",
  permanentState: "",
  permanentPin: "",
  sessionStart: currentSessionStartYear?.slice(-2) ?? "",
  sessionEnd: currentSessionEndYear ?? "",
  dobDay: "",
  dobMonth: "",
  dobYear: "",
  penOfStudent: "",
  lastSchoolName: "",
  lastSchoolAddress: "",
  passingYear: "",
  previousQualifyingExam: {
    maximumMarks: "",
    previousClass: "",
    marksObtained: "",
    percentage: "",
  },
  physicalStatus: {
    studentName: "",
    fatherName: "",
    motherName: "",
    weight: "",
    height: "",
    bloodGroup: "",
    allergyMedicine: "",
    allergyOther: "",
    disease: "",
    otherInformation: "",
  },
  studentPhoto: "",
  motherPhoto: "",
  fatherPhoto: "",
};

function buildStudentFields(data: AdmissionStudentFormValues) {
  const fullName = data.fullName.trim();
  const lastSpaceIndex = fullName.lastIndexOf(" ");
  const firstName =
    lastSpaceIndex === -1 ? fullName : fullName.slice(0, lastSpaceIndex);
  const lastName =
    lastSpaceIndex === -1 ? "" : fullName.slice(lastSpaceIndex + 1);
  const academicYear = `20${data.sessionStart.trim()}-${data.sessionEnd.trim()}`;
  const dob = `${data.dobYear
    .trim()
    .padStart(4, "0")}-${data.dobMonth.trim().padStart(2, "0")}-${data.dobDay
    .trim()
    .padStart(2, "0")}`;

  const maximumMarksValue = Number(data.previousQualifyingExam.maximumMarks);
  const marksObtainedValue = Number(data.previousQualifyingExam.marksObtained);
  const qualifyingPercentage =
    data.previousQualifyingExam.maximumMarks.trim() !== "" &&
    data.previousQualifyingExam.marksObtained.trim() !== "" &&
    maximumMarksValue > 0 &&
    !Number.isNaN(marksObtainedValue)
      ? ((marksObtainedValue / maximumMarksValue) * 100).toFixed(2)
      : data.previousQualifyingExam.percentage.trim();

  return {
    firstName,
    lastName,
    fullName,
    firstNameLower: firstName.toLowerCase(),
    lastNameLower: lastName.toLowerCase(),
    enrollment: data.enrollment.trim(),
    className: data.className.trim(),
    section: data.section.trim(),
    academicYear,
    fatherName: data.fatherName.trim(),
    motherName: data.motherName.trim(),
    fatherOccupation: data.fatherOccupation.trim(),
    gender: data.gender,
    category: data.category,
    nationality: data.nationality,
    dob,
    phone: data.phone.trim(),
    phone2: data.phone2.trim(),
    email: data.email.trim(),
    address: data.address.trim(),
    correspondenceName: data.correspondenceName.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    pin: data.pin.trim(),
    permanentAddress: data.permanentAddress.trim(),
    permanentCity: data.permanentCity.trim(),
    permanentState: data.permanentState.trim(),
    permanentPin: data.permanentPin.trim(),
    penOfStudent: data.penOfStudent.trim(),
    lastSchoolName: data.lastSchoolName.trim(),
    lastSchoolAddress: data.lastSchoolAddress.trim(),
    passingYear: data.passingYear.trim(),
    previousQualifyingExam: {
      maximumMarks: data.previousQualifyingExam.maximumMarks.trim(),
      previousClass: data.previousQualifyingExam.previousClass.trim(),
      marksObtained: data.previousQualifyingExam.marksObtained.trim(),
      percentage: qualifyingPercentage,
    },
    physicalStatus: {
      studentName: data.physicalStatus.studentName.trim(),
      fatherName: data.physicalStatus.fatherName.trim(),
      motherName: data.physicalStatus.motherName.trim(),
      weight: data.physicalStatus.weight.trim(),
      height: data.physicalStatus.height.trim(),
      bloodGroup: data.physicalStatus.bloodGroup.trim(),
      allergyMedicine: data.physicalStatus.allergyMedicine.trim(),
      allergyOther: data.physicalStatus.allergyOther.trim(),
      disease: data.physicalStatus.disease.trim(),
      otherInformation: data.physicalStatus.otherInformation.trim(),
    },
    studentPhoto: data.studentPhoto,
    motherPhoto: data.motherPhoto,
    fatherPhoto: data.fatherPhoto,
  };
}

function buildEnrollmentFields(
  data: AdmissionStudentFormValues,
  studentId: string,
) {
  const fullName = data.fullName.trim();
  const lastSpaceIndex = fullName.lastIndexOf(" ");
  const firstName =
    lastSpaceIndex === -1 ? fullName : fullName.slice(0, lastSpaceIndex);
  const lastName =
    lastSpaceIndex === -1 ? "" : fullName.slice(lastSpaceIndex + 1);

  return {
    studentId,
    academicYear: `20${data.sessionStart.trim()}-${data.sessionEnd.trim()}`,
    className: data.className,
    section: data.section,
    enrollment: data.enrollment.trim(),
    studentName: fullName,
    firstName,
    lastName,
    firstNameLower: firstName.toLowerCase(),
    lastNameLower: lastName.toLowerCase(),
    fatherName: data.fatherName.trim(),
    phone: data.phone.trim(),
  };
}

/** Fields validated before the user can move from tab 1 to tab 2. */
const page1RequiredFields: FieldPath<AdmissionStudentFormValues>[] = [
  "fullName",
  "motherName",
  "fatherName",
  "className",
  "enrollment",
  "sessionStart",
  "sessionEnd",
  "gender",
  "category",
  "nationality",
  "dobYear",
];

function firestoreErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    const lower = message.toLowerCase();
    if (lower.includes("permission")) {
      return "You do not have permission to save students. Please login with an admin account.";
    }
    if (lower.includes("token") || lower.includes("session")) {
      return "Your session is invalid or expired. Please logout and login again.";
    }
    return message;
  }
  return "Something went wrong while saving to Firestore.";
}

/**
 * Pulls the first image from a paste/clipboard payload, if any. Works for both
 * images copied inside the browser (clipboard items) and image files copied
 * from the OS file manager (clipboard files).
 */
function imageFileFromClipboard(
  clipboardData: DataTransfer | null | undefined,
): File | null {
  if (!clipboardData) return null;
  for (const item of clipboardData.items) {
    const type = item.type.toLowerCase();
    if (type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  const file = clipboardData.files?.[0];
  if (file && file.type.toLowerCase().startsWith("image/")) return file;
  return null;
}

interface NextEditCandidate {
  id: string;
}

interface EnrollmentRow {
  id: string;
  firstNameLower: string;
  lastNameLower: string;
}

/** Reads the active enrollments of one class and sorts them by name. */
async function fetchClassRows(
  className: string,
  academicYear: string,
): Promise<EnrollmentRow[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION.ENROLLMENTS),
      where("academicYear", "==", academicYear),
      where("className", "==", className),
    ),
  );

  return snapshot.docs
    .filter((docSnapshot) => docSnapshot.data().isDeleted !== true)
    .map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        firstNameLower: String(
          data.firstNameLower ?? String(data.firstName ?? "").toLowerCase(),
        ),
        lastNameLower: String(
          data.lastNameLower ?? String(data.lastName ?? "").toLowerCase(),
        ),
      };
    })
    .sort(
      (a, b) =>
        a.firstNameLower.localeCompare(b.firstNameLower) ||
        a.lastNameLower.localeCompare(b.lastNameLower) ||
        a.id.localeCompare(b.id),
    );
}

async function findNextStudentToEdit(
  currentEnrollmentId: string,
  className: string,
  academicYear: string,
): Promise<NextEditCandidate | null> {
  // 1) The next student of the same class.
  const currentClassRows = await fetchClassRows(className, academicYear);
  const currentIndex = currentClassRows.findIndex(
    (row) => row.id === currentEnrollmentId,
  );
  if (currentIndex !== -1 && currentIndex + 1 < currentClassRows.length) {
    return { id: currentClassRows[currentIndex + 1].id };
  }

  // 2) The first student of the following class (per `CLASSES` order).
  const currentClassIndex = CLASSES.indexOf(className);
  const startIndex = currentClassIndex === -1 ? 0 : currentClassIndex + 1;

  for (let index = startIndex; index < CLASSES.length; index++) {
    const classRows = await fetchClassRows(CLASSES[index], academicYear);
    if (classRows.length > 0) {
      return { id: classRows[0].id };
    }
  }

  return null;
}

function AddStudent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editEnrollmentId = searchParams.get("edit");
  const [activeTab, setActiveTab] = useState<StudentTab>("info");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [pendingStudentPhoto, setPendingStudentPhoto] = useState<File | null>(
    null,
  );
  const [pendingFatherPhoto, setPendingFatherPhoto] = useState<File | null>(
    null,
  );
  const [pendingMotherPhoto, setPendingMotherPhoto] = useState<File | null>(
    null,
  );
  const [nextStudentConfirmOpen, setNextStudentConfirmOpen] = useState(false);
  const [loadingNextStudent, setLoadingNextStudent] = useState(false);
  // Bumped after a new student is saved, so the next number is suggested.
  const [enrollmentRefresh, setEnrollmentRefresh] = useState(0);

  /* Copy-paste photo routing: which photo box receives an image pasted from
     the clipboard. A focused photo box wins, otherwise the last-focused box is
     used, and the student photo is the final default. */
  const photoPasteTargets = useRef<
    Record<string, ((file: File | null) => void) | null>
  >({});
  const activePhotoKey = useRef<string>("student");
  // Student Info page wrapper — used to scroll to the first invalid field.
  const infoPageRef = useRef<HTMLDivElement>(null);

  const registerPhotoPasteTarget = (
    key: string,
    handler: ((file: File | null) => void) | null,
  ) => {
    if (handler) {
      photoPasteTargets.current[key] = handler;
    } else {
      delete photoPasteTargets.current[key];
    }
  };

  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<AdmissionStudentFormValues>({
    defaultValues,
  });

  // Auto-calculate the "percentage" in the previous qualifying exam section
  // whenever maximum marks / marks obtained change.
  const maximumMarks = watch("previousQualifyingExam.maximumMarks");
  const marksObtained = watch("previousQualifyingExam.marksObtained");
  const studentPhotoUrl = watch("studentPhoto");
  const fatherPhotoUrl = watch("fatherPhoto");
  const motherPhotoUrl = watch("motherPhoto");

  useEffect(() => {
    const maximum = Number(maximumMarks);
    const obtained = Number(marksObtained);
    if (
      maximumMarks.trim() !== "" &&
      marksObtained.trim() !== "" &&
      maximum > 0 &&
      !Number.isNaN(obtained)
    ) {
      setValue(
        "previousQualifyingExam.percentage",
        ((obtained / maximum) * 100).toFixed(2),
      );
    } else if (maximumMarks.trim() !== "" || marksObtained.trim() !== "") {
      // One of the two marks is missing — don't leave a stale percentage.
      setValue("previousQualifyingExam.percentage", "");
    }
  }, [maximumMarks, marksObtained, setValue]);

  // Warn the user before closing / reloading the tab with unsaved changes.
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // Copy-paste a photo into the form: click a photo box (or leave it on the
  // last-focused box; the student photo is the default) and press Ctrl+V while
  // anywhere on the Student Info tab.
  useEffect(() => {
    if (activeTab !== "info") return;

    const handleWindowPaste = (event: ClipboardEvent) => {
      const file = imageFileFromClipboard(event.clipboardData);
      if (!file) return;

      // A paste while a photo box is focused targets that exact box.
      const target = event.target as HTMLElement | null;
      const boxKey =
        target
          ?.closest?.("[data-photo-upload]")
          ?.getAttribute("data-photo-upload") ?? "";

      const handler =
        photoPasteTargets.current[boxKey] ||
        photoPasteTargets.current[activePhotoKey.current] ||
        photoPasteTargets.current["student"];
      if (!handler) return;

      event.preventDefault();
      handler(file);
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [activeTab]);

  useEffect(() => {
    if (!editEnrollmentId) {
      setEditingStudentId(null);
      setLoadingStudent(false);
      return;
    }

    let cancelled = false;

    const loadStudentForEdit = async () => {
      setLoadingStudent(true);
      try {
        const enrollmentSnapshot = await getDoc(
          doc(db, COLLECTION.ENROLLMENTS, editEnrollmentId),
        );
        if (!enrollmentSnapshot.exists()) {
          throw new Error("Enrollment record not found.");
        }
        const studentId = enrollmentSnapshot.data().studentId;
        if (!studentId) {
          throw new Error("Student record not found.");
        }
        const studentSnapshot = await getDoc(
          doc(db, COLLECTION.STUDENTS, studentId),
        );
        if (!studentSnapshot.exists()) {
          throw new Error("Student record not found.");
        }
        if (cancelled) return;
        reset(studentDocToFormValues(studentSnapshot.data()));
        setPendingStudentPhoto(null);
        setPendingFatherPhoto(null);
        setPendingMotherPhoto(null);
        setEditingStudentId(studentId);
        activePhotoKey.current = "student";
        setActiveTab("info");
      } catch (error) {
        if (cancelled) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load the selected student.",
        );
        reset(defaultValues);
        setEditingStudentId(null);
        setSearchParams({}, { replace: true });
      } finally {
        if (!cancelled) setLoadingStudent(false);
      }
    };

    void loadStudentForEdit();

    return () => {
      cancelled = true;
    };
  }, [editEnrollmentId, reset, setSearchParams]);

  // Add mode: suggest the next Enrollment No. (still editable). Never
  // overwrites a number the admin has already typed.
  useEffect(() => {
    if (editEnrollmentId) return;

    let cancelled = false;
    fetchNextEnrollment()
      .then((next) => {
        if (cancelled || getValues("enrollment").trim()) return;
        setValue("enrollment", next);
      })
      .catch((error) => {
        console.error("Failed to suggest the next enrollment number:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [editEnrollmentId, enrollmentRefresh, getValues, setValue]);

  /**
   * Scrolls the Student Info page to a field (centred on screen) and focuses
   * it. Without a selector it targets the first field marked invalid, in the
   * order the fields appear on the page. Runs on the next frame so the error
   * state from trigger() has rendered first.
   */
  const scrollToInfoField = (selector = '[aria-invalid="true"]') => {
    requestAnimationFrame(() => {
      const target =
        infoPageRef.current?.querySelector<HTMLElement>(selector);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
  };

  const handleNext = async () => {
    const valid = await trigger(page1RequiredFields);
    if (!valid) {
      scrollToInfoField();
      return;
    }

    const { dobDay, dobMonth, dobYear } = getValues();
    if (!dobDay.trim() || !dobMonth.trim() || !dobYear.trim()) {
      toast.error(
        "Please fill the student's date of birth (DATE / MONTH / YEAR).",
      );
      scrollToInfoField("#dobYear");
      return;
    }

    setActiveTab("school");
  };

  /**
   * "Next Student" (edit mode only): opens the next editable student without
   * saving the current one - the next student of the same class, or the first
   * student of the following class (`CLASSES` order), for the academic year
   * currently set on the form. Unsaved edits must be confirmed first so an
   * entry is never lost silently.
   */
  const handleNextStudent = async (ignoreUnsaved = false) => {
    if (!editingStudentId || !editEnrollmentId) {
      return;
    }

    const values = getValues();
    const className = values.className.trim();
    const academicYear = `20${values.sessionStart.trim()}-${values.sessionEnd.trim()}`;

    if (isDirty && !ignoreUnsaved) {
      setNextStudentConfirmOpen(true);
      return;
    }

    setLoadingNextStudent(true);
    try {
      const nextStudent = await findNextStudentToEdit(
        editEnrollmentId,
        className,
        academicYear,
      );

      setNextStudentConfirmOpen(false);

      if (!nextStudent) {
        toast("No more students to edit for this session.");
        return;
      }

      activePhotoKey.current = "student";
      setActiveTab("info");
      setSearchParams({ edit: nextStudent.id }, { replace: true });

      toast.success("Showing the next student.");
    } catch (error) {
      console.error("Find next student error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load the next student.",
      );
    } finally {
      setLoadingNextStudent(false);
    }
  };

  const onSubmit: SubmitHandler<AdmissionStudentFormValues> = async (data) => {
    try {
      const formValues = getValues();
      const missingPage1Field = page1RequiredFields.find((name) => {
        const value = get(formValues, name);
        return typeof value !== "string" || value.trim() === "";
      });
      const { dobDay, dobMonth, dobYear } = formValues;
      if (
        missingPage1Field ||
        !dobDay.trim() ||
        !dobMonth.trim() ||
        !dobYear.trim()
      ) {
        toast.error(
          "Please fill all the required fields on the Student Info page.",
        );
        setActiveTab("info");
        setTimeout(() => {
          void trigger(page1RequiredFields).then(() => scrollToInfoField());
        }, 0);
        return;
      }

      if (await isEnrollmentTaken(data.enrollment, editingStudentId)) {
        toast.error(
          `Enrollment No. ${data.enrollment.trim()} already belongs to another student (recycle bin included). Please use another number.`,
        );
        setActiveTab("info");
        scrollToInfoField("#enrollment");
        return;
      }

      // A new student's Firestore id is generated up-front (doc() assigns the
      // id locally without a write) so photos can be uploaded to their final
      // students/{studentId}/... path before the Firestore batch is committed.
      const newStudentRef = editingStudentId
        ? null
        : doc(collection(db, COLLECTION.STUDENTS));
      const studentId = editingStudentId ?? newStudentRef!.id;

      const resolvePhoto = async (
        kind: PhotoKind,
        pendingFile: File | null,
        currentUrl: string,
      ): Promise<string> => {
        if (pendingFile) {
          return uploadStudentPhoto(studentId, kind, pendingFile);
        }
        if (!currentUrl && editingStudentId) {
          // The admin removed a previously-saved photo.
          await deleteStudentPhoto(studentId, kind);
        }
        return currentUrl;
      };

      const [studentPhoto, fatherPhoto, motherPhoto] = await Promise.all([
        resolvePhoto("student", pendingStudentPhoto, data.studentPhoto),
        resolvePhoto("father", pendingFatherPhoto, data.fatherPhoto),
        resolvePhoto("mother", pendingMotherPhoto, data.motherPhoto),
      ]);

      const studentFields = buildStudentFields({
        ...data,
        studentPhoto,
        fatherPhoto,
        motherPhoto,
      });
      const batch = writeBatch(db);

      if (editingStudentId && editEnrollmentId) {
        const studentRef = doc(db, COLLECTION.STUDENTS, editingStudentId);
        const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, editEnrollmentId);

        const existingEnrollmentSnapshot = await getDoc(enrollmentRef);

        if (!existingEnrollmentSnapshot.exists()) {
          throw new Error("Enrollment record not found.");
        }

        const previousEnrollment = existingEnrollmentSnapshot.data();

        batch.update(studentRef, {
          ...studentFields,
          updatedAt: serverTimestamp(),
        });
        batch.update(enrollmentRef, {
          ...buildEnrollmentFields(data, editingStudentId),
          updatedAt: serverTimestamp(),
        });

        await batch.commit();
        void recordEnrollments([data.enrollment]).catch((error) =>
          console.error("Failed to update the enrollment counter:", error),
        );

        const previousClassName = String(
          previousEnrollment.className ?? "",
        ).trim();
        const previousAcademicYear = String(
          previousEnrollment.academicYear ?? "",
        );
        const currentClassName = data.className.trim();
        const currentAcademicYear = `20${data.sessionStart.trim()}-${data.sessionEnd.trim()}`;

        const rosterChanged =
          previousClassName !== currentClassName ||
          previousAcademicYear !== currentAcademicYear ||
          String(previousEnrollment.studentName ?? "").trim() !==
            data.fullName.trim();

        const rostersToRefresh = rosterChanged
          ? [
              {
                className: previousClassName,
                academicYear: previousAcademicYear,
              },
              {
                className: currentClassName,
                academicYear: currentAcademicYear,
              },
            ]
          : [];

        const affectedRosters = new Map<
          string,
          { className: string; academicYear: string }
        >();

        for (const roster of rostersToRefresh) {
          if (!roster.className || !roster.academicYear) continue;

          affectedRosters.set(
            `${roster.academicYear}_${roster.className}`,
            roster,
          );
        }

        let rollNumbersUpdated = true;

        try {
          await Promise.all(
            Array.from(affectedRosters.values()).map(
              ({ className, academicYear }) =>
                generateClassRollNumbers(className, academicYear),
            ),
          );
        } catch (error) {
          rollNumbersUpdated = false;
          console.error("Failed to refresh roll numbers:", error);
        }

        setPendingStudentPhoto(null);
        setPendingFatherPhoto(null);
        setPendingMotherPhoto(null);

        // Instead of leaving the form, jump to the next editable record:
        // the next student of the same class, or the first student of the
        // following class (in `CLASSES` order), for this academic year.
        let nextStudent: NextEditCandidate | null = null;

        if (AUTO_NEXT_STUDENT_AFTER_UPDATE) {
          try {
            nextStudent = await findNextStudentToEdit(
              editEnrollmentId,
              data.className.trim(),
              `20${data.sessionStart.trim()}-${data.sessionEnd.trim()}`,
            );
          } catch (error) {
            // The update already succeeded - never let this lookup hide it.
            console.error("Find next student error:", error);
          }
        }

        if (nextStudent) {
          activePhotoKey.current = "student";
          setActiveTab("info");
          setSearchParams({ edit: nextStudent.id }, { replace: true });
        } else {
          reset(defaultValues);
          setEditingStudentId(null);
          setSearchParams({}, { replace: true });
        }

        toast.success(
          `Student ${studentFields.fullName} updated successfully!`,
        );

        if (!rollNumbersUpdated) {
          toast.error(
            "Student updated, but roll numbers could not be refreshed. Please regenerate them from Settings.",
          );
        }
        return;
      }

      const studentRef = newStudentRef!;
      const enrollmentRef = doc(collection(db, COLLECTION.ENROLLMENTS));

      batch.set(studentRef, {
        ...studentFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(enrollmentRef, {
        ...buildEnrollmentFields(data, studentRef.id),
        status: "active",
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      try {
        await recordEnrollments([data.enrollment]);
      } catch (error) {
        // The duplicate check on save still stops a repeated number.
        console.error("Failed to update the enrollment counter:", error);
      }

      let rollNumbersUpdated = true;

      try {
        await generateClassRollNumbers(
          data.className.trim(),
          `20${data.sessionStart.trim()}-${data.sessionEnd.trim()}`,
        );
      } catch (error) {
        rollNumbersUpdated = false;
        console.error("Failed to generate roll numbers:", error);
      }

      reset(defaultValues);
      setEnrollmentRefresh((value) => value + 1);
      setPendingStudentPhoto(null);
      setPendingFatherPhoto(null);
      setPendingMotherPhoto(null);
      activePhotoKey.current = "student";
      setActiveTab("info");

      toast.success(`Student ${studentFields.fullName} added successfully!`);

      if (!rollNumbersUpdated) {
        toast.error(
          "Student added, but roll numbers could not be generated. Please regenerate them from Settings.",
        );
      }
    } catch (error) {
      toast.error(firestoreErrorMessage(error));
    }
  };

  const photoState: Record<
    PhotoKind,
    { url: string; setPending: (file: File | null) => void }
  > = {
    student: { url: studentPhotoUrl, setPending: setPendingStudentPhoto },
    father: { url: fatherPhotoUrl, setPending: setPendingFatherPhoto },
    mother: { url: motherPhotoUrl, setPending: setPendingMotherPhoto },
  };

  const renderPhotoBox = (kind: PhotoKind, label: string) => (
    <PhotoUploadBox
      pasteKey={kind}
      registerPasteTarget={registerPhotoPasteTarget}
      onActiveChange={(active) => {
        if (active) activePhotoKey.current = kind;
      }}
      label={label}
      photoUrl={photoState[kind].url}
      onFileSelected={(file) => {
        photoState[kind].setPending(file);
        if (!file) setValue(`${kind}Photo`, "", { shouldDirty: true });
      }}
    />
  );

  if (loadingStudent) {
    return (
      <div className="mx-auto w-full">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Loading student data...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      {editingStudentId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
          Editing mode: updating the selected student record.
        </div>
      )}

      {/* Form tabs: stick to the top while the form scrolls. The band is in
          the page colour and its ::before covers <main>'s padding around it,
          so the form never shows through. */}
      <div className="sticky top-0 z-20 mb-6 bg-gray-100 pb-2 before:absolute before:-inset-x-4 before:-top-4 before:bottom-0 before:-z-10 before:bg-gray-100 before:content-[''] md:before:-inset-x-2">
      <div className="relative inline-flex max-w-full flex-wrap overflow-hidden rounded-lg border border-gray-300 bg-white">
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`px-5 py-2 text-sm font-bold transition-colors ${
            activeTab === "info"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Student Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("school")}
          className={`px-5 py-2 text-sm font-bold transition-colors ${
            activeTab === "school"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Previous School Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bulk")}
          className={`px-5 py-2 text-sm font-bold transition-colors ${
            activeTab === "bulk"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Bulk Import (Excel / CSV)
        </button>
      </div>
      </div>

      {activeTab === "bulk" ? (
        <BulkStudentImport />
      ) : activeTab === "info" ? (
        <div
          ref={infoPageRef}
          className="mx-auto max-w-5xl bg-white p-2 sm:p-2 font-serif text-slate-900"
        >
          <AdmissionInfoSheet
            control={control}
            bannerTitle={
              editingStudentId ? "UPDATE ADMISSION FORM" : "ADMISSION FORM"
            }
            renderPhoto={renderPhotoBox}
          />

          <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
            <CustomButton type="button" variant="cves" onClick={handleNext}>
              Next
            </CustomButton>

            {editingStudentId && (
              <CustomButton
                type="button"
                variant="cves"
                loading={loadingNextStudent}
                onClick={() => void handleNextStudent()}
              >
                Next Student
              </CustomButton>
            )}
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mx-auto max-w-5xl bg-white p-6 sm:p-10 font-serif text-slate-900"
        >
          <AdmissionSchoolSheet control={control} />

          <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
            <CustomButton
              type="button"
              variant="outline"
              onClick={() => setActiveTab("info")}
            >
              Previous
            </CustomButton>
            <CustomButton
              type="submit"
              variant="cves"
              loading={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : editingStudentId
                  ? "Update Student"
                  : "Add Student"}
            </CustomButton>

            {editingStudentId && (
              <CustomButton
                type="button"
                variant="cves"
                loading={loadingNextStudent}
                onClick={() => void handleNextStudent()}
              >
                Next Student
              </CustomButton>
            )}
          </div>
        </form>
      )}

      {editingStudentId && (
        <Modal
          isOpen={nextStudentConfirmOpen}
          onClose={() => setNextStudentConfirmOpen(false)}
          title="Unsaved changes"
          description="You have unsaved changes for the current student. Moving to the next student will discard them. Continue?"
          cancelText="Stay"
          submitText="Discard & Next"
          loading={loadingNextStudent}
          onSubmit={() => void handleNextStudent(true)}
        />
      )}
    </div>
  );
}

export default AddStudent;
