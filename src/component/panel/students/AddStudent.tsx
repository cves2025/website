import { useEffect, useRef, useState } from "react";
import { useForm, SubmitHandler, FieldPath, get } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AdmissionStudentFormValues } from "../../../utils/type";
import BulkStudentImport from "../BulkStudentImport";
import CustomButton from "../../../custom-components/CustomButton";
import AdmissionBoxedInput from "../../../custom-components/admission/AdmissionBoxedInput";
import AdmissionCheckboxGroup from "../../../custom-components/admission/AdmissionCheckboxGroup";
import AdmissionDateOfBirth from "../../../custom-components/admission/AdmissionDateOfBirth";
import AdmissionLineInput from "../../../custom-components/admission/AdmissionLineInput";
import AdmissionPinInput from "../../../custom-components/admission/AdmissionPinInput";
import AdmissionSessionInput from "../../../custom-components/admission/AdmissionSessionInput";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import {
  ADMISSION_SECTIONS,
  CLASSES,
  COLLECTION,
  EMAIL_PATTERN,
  PHONE_PATTERN,
} from "../../../constants";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import schoolLogo from "../../../assets/image/schoolLogo.jpg";
import QrCodeScanForLocation from "./QrCodeScanForLocation";
import QrCodeScanForContact from "./QrCodeScanForContact";
import MobileNumberInputBox from "../../../custom-components/admission/MobileNumberInputBox";
import AdmissionSelectInput from "../../../custom-components/admission/AdmissionSelectInput";
import PhotoUploadBox from "../../../custom-components/admission/PhotoUploadBox";
import {
  uploadStudentPhoto,
  deleteStudentPhoto,
  PhotoKind,
} from "../../../firebase/studentPhotos";

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

function studentDocToFormValues(doc: DocumentData): AdmissionStudentFormValues {
  const academicYear =
    typeof doc.academicYear === "string" ? doc.academicYear : "";
  const [sessionStart, sessionEnd] = academicYear.split("-");
  const dob = typeof doc.dob === "string" ? doc.dob : "";
  const [dobYear, dobMonth, dobDay] = dob.split("-");

  const prevExam = doc.previousQualifyingExam ?? {};
  const physical = doc.physicalStatus ?? {};

  return {
    firstName: doc.firstName ?? "",
    lastName: doc.lastName ?? "",
    fullName: doc.fullName ?? "",
    enrollment: doc.enrollment ?? "",
    className: doc.className ?? "",
    section: doc.section ?? "A",
    fatherName: doc.fatherName ?? "",
    motherName: doc.motherName ?? "",
    dob,
    phone: doc.phone ?? "",
    phone2: doc.phone2 ?? "",
    email: doc.email ?? "",
    address: doc.address ?? "",
    academicYear,
    fatherOccupation: doc.fatherOccupation ?? "",
    gender: doc.gender ?? "",
    category: doc.category ?? "",
    nationality: doc.nationality ?? "INDIAN",
    correspondenceName: doc.correspondenceName ?? "",
    city: doc.city ?? "",
    state: doc.state ?? "",
    pin: doc.pin ?? "",
    permanentAddress: doc.permanentAddress ?? "",
    permanentCity: doc.permanentCity ?? "",
    permanentState: doc.permanentState ?? "",
    permanentPin: doc.permanentPin ?? "",
    sessionStart: sessionStart ? sessionStart.slice(-2) : "",
    sessionEnd: sessionEnd ? sessionEnd.slice(-2) : "",
    dobDay: dobDay ?? "",
    dobMonth: dobMonth ?? "",
    dobYear: dobYear ?? "",
    penOfStudent: doc.penOfStudent ?? "",
    lastSchoolName: doc.lastSchoolName ?? "",
    lastSchoolAddress: doc.lastSchoolAddress ?? "",
    passingYear: doc.passingYear ?? "",
    previousQualifyingExam: {
      maximumMarks: prevExam.maximumMarks ?? "",
      previousClass: prevExam.previousClass ?? "",
      marksObtained: prevExam.marksObtained ?? "",
      percentage: prevExam.percentage ?? "",
    },
    physicalStatus: {
      studentName: physical.studentName ?? "",
      fatherName: physical.fatherName ?? "",
      motherName: physical.motherName ?? "",
      weight: physical.weight ?? "",
      height: physical.height ?? "",
      bloodGroup: physical.bloodGroup ?? "",
      allergyMedicine: physical.allergyMedicine ?? "",
      allergyOther: physical.allergyOther ?? "",
      disease: physical.disease ?? "",
      otherInformation: physical.otherInformation ?? "",
    },
    studentPhoto: doc.studentPhoto ?? "",
    motherPhoto: doc.motherPhoto ?? "",
    fatherPhoto: doc.fatherPhoto ?? "",
  };
}

const PIN_RULES = {
  pattern: {
    value: /^\d{0,6}$/,
    message: "PIN must be 6 digits",
  },
};

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
  "phone",
  "email",
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
  clipboardData: DataTransfer | null | undefined
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

  /* Copy-paste photo routing: which photo box receives an image pasted from
     the clipboard. A focused photo box wins, otherwise the last-focused box is
     used, and the student photo is the final default. */
  const photoPasteTargets = useRef<
    Record<string, ((file: File | null) => void) | null>
  >({});
  const activePhotoKey = useRef<string>("student");

  const registerPhotoPasteTarget = (
    key: string,
    handler: ((file: File | null) => void) | null
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
        target?.closest?.("[data-photo-upload]")?.getAttribute(
          "data-photo-upload"
        ) ?? "";

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

  const handleNext = async () => {
    const valid = await trigger(page1RequiredFields);
    if (!valid) {
      return;
    }

    const { dobDay, dobMonth, dobYear } = getValues();
    if (!dobDay.trim() || !dobMonth.trim() || !dobYear.trim()) {
      toast.error(
        "Please fill the student's date of birth (DATE / MONTH / YEAR).",
      );
      return;
    }

    setActiveTab("school");
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
          void trigger(page1RequiredFields);
        }, 0);
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

        batch.update(studentRef, {
          ...studentFields,
          updatedAt: serverTimestamp(),
        });
        batch.update(enrollmentRef, {
          ...buildEnrollmentFields(data, editingStudentId),
          updatedAt: serverTimestamp(),
        });

        await batch.commit();

        reset(defaultValues);
        setPendingStudentPhoto(null);
        setPendingFatherPhoto(null);
        setPendingMotherPhoto(null);
        activePhotoKey.current = "student";
        setActiveTab("info");
        setEditingStudentId(null);
        setSearchParams({}, { replace: true });

        toast.success(
          `Student ${studentFields.fullName} updated successfully!`,
        );
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

      reset(defaultValues);
      setPendingStudentPhoto(null);
      setPendingFatherPhoto(null);
      setPendingMotherPhoto(null);
      activePhotoKey.current = "student";
      setActiveTab("info");

      toast.success(`Student ${studentFields.fullName} added successfully!`);
    } catch (error) {
      toast.error(firestoreErrorMessage(error));
    }
  };

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

      {/* Form tabs */}
      <div className="mb-6 inline-flex max-w-full flex-wrap overflow-hidden rounded-lg border border-gray-300 bg-white">
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

      {activeTab === "bulk" ? (
        <BulkStudentImport />
      ) : activeTab === "info" ? (
        <div className="mx-auto max-w-5xl bg-white p-2 sm:p-2 font-serif text-slate-900">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="text-xs sm:text-sm font-semibold text-slate-800">
              School Code : 09670911304
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-800">
              Affiliation No. : 14203-05
            </div>
          </div>

          <div className="flex items-center gap-4 mb-2">
            {/* Logo placeholder */}
            <div className="h-28 w-28 sm:h-28 sm:w-28 shrink-0 flex items-center justify-center text-center leading-tight text-slate-500 p-1">
              <img
                src={schoolLogo}
                alt="school logo"
                className="w-28 h-28 lg:w-auto md:h-auto"
                loading="lazy"
              />
            </div>

            <div className="flex-1 text-center">
              <h1 className="font-cancun text-xl sm:text-2xl font-extrabold tracking-tight">
                <span className="text-green-700">CHILDREN&apos;S </span>
                <span className="text-indigo-800">VALLEY </span>
                <span className="text-red-600">ENGLISH SCHOOL</span>
              </h1>
              <p className="italic text-indigo-900 text-xs sm:text-base mt-1">
                D 59/295 A, Mahmoorganj, Varanasi : 0542-2220107, 9336576690
              </p>
              <div className="flex items-center justify-center gap-4 sm:gap-8 mt-2 text-xs sm:text-base">
                <span className="text-red-600 font-bold underline">
                  A Gov. Affiliated
                </span>
                <span className="text-green-700 font-bold underline">
                  C.B.S.E. Pattern
                </span>
                <span className="text-indigo-900 font-bold underline">
                  Co - Education
                </span>
              </div>
            </div>

            {/* QR placeholders */}
            <div className="hidden sm:flex flex-col gap-1 shrink-0">
              <div className="flex gap-8">
                <div className="h-16 w-16 border border-slate-400 flex items-center justify-center text-[7px] text-slate-400">
                  <QrCodeScanForLocation />
                </div>
                <div className="h-16 w-16 border border-slate-400 flex items-center justify-center text-[7px] text-slate-400">
                  <QrCodeScanForContact />
                </div>
              </div>
            </div>
          </div>

          {/* Admission form banner */}
          <div className="flex justify-center mb-6">
            <div className="bg-pink-600 text-white text-xl sm:text-xl font-bold italic px-8 py-2 rounded-md shadow">
              {editingStudentId ? "UPDATE ADMISSION FORM" : "ADMISSION FORM"}
            </div>
          </div>

          {/* Class / Section / Session / Enrollment */}
          <div className="flex flex-wrap items-start gap-6 mb-6 text-green-800 font-semibold text-sm sm:text-base">
            <AdmissionSelectInput
              control={control}
              name="className"
              prefix="Class :"
              options={CLASSES.map((cls) => ({ label: cls, value: cls }))}
            />
            <AdmissionSelectInput
              control={control}
              name="section"
              prefix="Section :"
              placeholder="Select"
              options={ADMISSION_SECTIONS.map((section) => ({
                label: section,
                value: section,
              }))}
            />
            <AdmissionSessionInput
              control={control}
              startName="sessionStart"
              endName="sessionEnd"
              rules={{ required: "Please enter session" }}
            />
            <AdmissionLineInput
              control={control}
              name="enrollment"
              prefix="Enrollment No. :"
              maxLength={5}
              numeric
              className="w-32"
              rules={{ required: "Enrollment number is required" }}
            />
          </div>
          {/* Student / Mother / Father / Occupation */}
          <div className="space-y-5 mb-6">
            <div>
              <p className="font-bold text-sm sm:text-base mb-1">
                1. STUDENT&apos;S NAME
              </p>
              <AdmissionBoxedInput
                control={control}
                name="fullName"
                cells={22}
                maxLength={50}
                rules={{ required: "Student's name is required" }}
              />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base mb-1">
                2. MOTHER&apos;S NAME
              </p>
              <AdmissionBoxedInput
                control={control}
                name="motherName"
                cells={22}
                maxLength={50}
                rules={{ required: "Mother's name is required" }}
              />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base mb-1">
                3. FATHER&apos;S NAME
              </p>
              <AdmissionBoxedInput
                control={control}
                name="fatherName"
                cells={22}
                maxLength={50}
                rules={{ required: "Father's name is required" }}
              />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base mb-1">
                4. FATHER&apos;S OCCUPATION
              </p>
              <AdmissionBoxedInput
                control={control}
                name="fatherOccupation"
                cells={22}
                maxLength={50}
              />
            </div>
          </div>

          {/* Gender / Category / Nationality / DOB */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
            <div className="border border-sky-500 p-3">
              <p className="font-bold text-sm mb-2">5. GENDER</p>
              <AdmissionCheckboxGroup
                control={control}
                name="gender"
                options={[
                  { value: "MALE", label: "MALE" },
                  { value: "FEMALE", label: "FEMALE" },
                ]}
                rules={{ required: "Please select gender" }}
                className="space-y-2"
              />
            </div>

            <div className="border border-sky-500 p-3">
              <p className="font-bold text-sm mb-2">6. CATEGORY</p>
              <AdmissionCheckboxGroup
                control={control}
                name="category"
                options={[
                  { value: "GEN", label: "GEN" },
                  { value: "OBC", label: "OBC" },
                  { value: "SC", label: "SC" },
                  { value: "ST", label: "ST" },
                ]}
                rules={{ required: "Please select category" }}
                className="grid grid-cols-2 gap-y-2 gap-x-2"
              />
            </div>

            <div className="border border-sky-500 p-3">
              <p className="font-bold text-sm mb-2">7. NATIONALITY</p>
              <AdmissionCheckboxGroup
                control={control}
                name="nationality"
                options={[
                  { value: "INDIAN", label: "INDIAN" },
                  { value: "OTHERS", label: "OTHERS" },
                ]}
                rules={{ required: "Please select nationality" }}
                className="flex gap-4"
              />
            </div>

            <div className="sm:col-span-1">
              <p className="font-bold text-sm mb-2">8. DATE OF BIRTH</p>
              <AdmissionDateOfBirth
                control={control}
                dayName="dobDay"
                monthName="dobMonth"
                yearName="dobYear"
                rules={{
                  required: "Enter date of birth",
                  pattern: {
                    value: /^\d{4}$/,
                    message: "Enter 4-digit year",
                  },
                }}
              />
            </div>
          </div>

          {/* Contact number + Photos */}
          <div className="flex flex-col sm:flex-row gap-6 mb-6">
            <div className="flex-1">
              <p className="font-bold text-sm sm:text-base mb-1">
                9. CONTACT NUMBER
              </p>
              <p className="text-red-700 text-sm font-semibold mb-1">
                MOBILE NO.
              </p>
              <MobileNumberInputBox
                control={control}
                name="phone"
                type="tel"
                rules={{
                  required: "Mobile number is required",
                  pattern: {
                    value: PHONE_PATTERN,
                    message: "Phone can contain only digits, spaces, + or -",
                  },
                }}
              />
              <p className="text-red-700 text-sm font-semibold mt-3 mb-1">
                MOBILE NO.
              </p>
              <MobileNumberInputBox
                control={control}
                name="phone2"
                type="tel"
                rules={{
                  pattern: {
                    value: PHONE_PATTERN,
                    message: "Phone can contain only digits, spaces, + or -",
                  },
                }}
              />
            </div>

            <div className="flex gap-4 justify-center">
              <PhotoUploadBox
                pasteKey="mother"
                registerPasteTarget={registerPhotoPasteTarget}
                onActiveChange={(active) => {
                  if (active) activePhotoKey.current = "mother";
                }}
                label={"MOTHER'S\nPHOTO"}
                photoUrl={motherPhotoUrl}
                onFileSelected={(file) => {
                  setPendingMotherPhoto(file);
                  if (!file) setValue("motherPhoto", "", { shouldDirty: true });
                }}
              />
              <PhotoUploadBox
                pasteKey="father"
                registerPasteTarget={registerPhotoPasteTarget}
                onActiveChange={(active) => {
                  if (active) activePhotoKey.current = "father";
                }}
                label={"FATHER'S\nPHOTO"}
                photoUrl={fatherPhotoUrl}
                onFileSelected={(file) => {
                  setPendingFatherPhoto(file);
                  if (!file) setValue("fatherPhoto", "", { shouldDirty: true });
                }}
              />
              <PhotoUploadBox
                pasteKey="student"
                registerPasteTarget={registerPhotoPasteTarget}
                onActiveChange={(active) => {
                  if (active) activePhotoKey.current = "student";
                }}
                label={"STUDENT'S\nPHOTO"}
                photoUrl={studentPhotoUrl}
                onFileSelected={(file) => {
                  setPendingStudentPhoto(file);
                  if (!file)
                    setValue("studentPhoto", "", { shouldDirty: true });
                }}
              />
            </div>
          </div>
          {/* Address section */}
          <div className="text-indigo-900 font-bold text-sm sm:text-base mb-4">
            <p>
              10. WRITE YOUR COMPLETE PERMANENT CORRESPONDENCE ADDRESS INCLUDING
            </p>
            <p>
              YOUR NAME IN ENGLISH IN CAPITAL LETTRES WITH (BLUE / BALL PEN)
            </p>
          </div>

          <div className="space-y-4 text-green-800 font-semibold text-sm sm:text-base">
            <AdmissionLineInput
              control={control}
              name="correspondenceName"
              prefix="NAME :"
              maxLength={50}
            />
            <AdmissionLineInput
              control={control}
              name="address"
              prefix="ADDRESS :"
              maxLength={100}
            />

            <div className="flex flex-wrap items-end gap-4">
              <AdmissionLineInput
                control={control}
                name="city"
                prefix="CITY :"
                maxLength={50}
                wrapperClassName="flex-1 min-w-[160px]"
              />
              <AdmissionLineInput
                control={control}
                name="state"
                prefix="STATE :"
                maxLength={50}
                wrapperClassName="flex-1 min-w-[160px]"
              />
              <div className="flex items-end gap-2">
                <span className="whitespace-nowrap">PIN:</span>
                <AdmissionPinInput
                  control={control}
                  name="pin"
                  rules={PIN_RULES}
                />
              </div>
            </div>

            <AdmissionLineInput
              control={control}
              name="permanentAddress"
              prefix="PERMANENT ADDRESS :"
              maxLength={100}
            />

            <div className="flex flex-wrap items-end gap-4">
              <AdmissionLineInput
                control={control}
                name="permanentCity"
                prefix="CITY :"
                maxLength={50}
                wrapperClassName="flex-1 min-w-[160px]"
              />
              <AdmissionLineInput
                control={control}
                name="permanentState"
                prefix="STATE :"
                maxLength={50}
                wrapperClassName="flex-1 min-w-[160px]"
              />
              <div className="flex items-end gap-2">
                <span className="whitespace-nowrap">PIN:</span>
                <AdmissionPinInput
                  control={control}
                  name="permanentPin"
                  rules={PIN_RULES}
                />
              </div>
            </div>

            <AdmissionLineInput
              control={control}
              name="email"
              prefix="MANDATORY E-MAIL ADDRESS"
              maxLength={50}
              rules={{
                required: "E-mail address is required",
                pattern: {
                  value: EMAIL_PATTERN,
                  message: "Enter a valid email address",
                },
              }}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
            <CustomButton type="button" onClick={handleNext}>
              Next
            </CustomButton>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mx-auto max-w-5xl bg-white p-6 sm:p-10 font-serif text-slate-900"
        >
          {/* LAST SCHOOL DETAILS */}
          <div className="relative mb-10">
            <div className="absolute -top-4 left-8 z-10 bg-yellow-300 px-6 py-1.5 shadow">
              <p className="font-bold text-indigo-900 tracking-wide">
                LAST SCHOOL DETAILS
              </p>
            </div>

            <div className="border-2 border-green-700 pt-8 pb-6 px-6 sm:px-8">
              <div className="flex items-center gap-2 mb-6">
                <span className="font-bold text-indigo-900 whitespace-nowrap">
                  PEN of Student -
                </span>
                <AdmissionBoxedInput
                  control={control}
                  name="penOfStudent"
                  cells={10}
                  maxLength={15}
                  numeric
                  borderColor="border-indigo-900"
                  wrapperClassName="flex-1"
                />
              </div>

              <div className="space-y-5 text-pink-800 font-medium">
                <AdmissionLineInput
                  control={control}
                  name="lastSchoolName"
                  prefix="School Name :"
                  maxLength={50}
                  underlineClassName="border-slate-400"
                />
                <AdmissionLineInput
                  control={control}
                  name="lastSchoolAddress"
                  prefix="School Address :"
                  maxLength={100}
                  underlineClassName="border-slate-400"
                />
                <AdmissionLineInput
                  control={control}
                  name="passingYear"
                  prefix="Passing Year :"
                  className="w-40"
                  maxLength={4}
                  numeric
                  underlineClassName="border-slate-400"
                />
              </div>

              <p className="font-bold text-red-700 mt-6 mb-3 text-sm sm:text-base">
                11. PREVIOUS QUALIFYING EXAM DETAIL
              </p>

              <div className="flex flex-wrap justify-between items-center gap-4 text-green-800 font-medium">
                <div className="flex justify-between items-center gap-2">
                  <span>Maximum Marks</span>
                  <AdmissionBoxedInput
                    control={control}
                    name="previousQualifyingExam.maximumMarks"
                    cells={1}
                    maxLength={4}
                    numeric
                    singleInputBox={true}
                    borderColor="border-indigo-900"
                    cellHeightClassName="h-8"
                    wrapperClassName="w-20"
                    align="center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Class</span>
                  <AdmissionSelectInput
                    control={control}
                    name="previousQualifyingExam.previousClass"
                    options={CLASSES.map((cls) => ({ label: cls, value: cls }))}
                    placeholder="Select"
                    wrapperClassName="w-24"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Marks Obtained</span>
                  <AdmissionBoxedInput
                    control={control}
                    name="previousQualifyingExam.marksObtained"
                    cells={1}
                    maxLength={4}
                    numeric
                    singleInputBox={true}
                    borderColor="border-indigo-900"
                    cellHeightClassName="h-8"
                    wrapperClassName="w-16"
                    align="center"
                  />
                  <span>%</span>
                  <AdmissionBoxedInput
                    control={control}
                    name="previousQualifyingExam.percentage"
                    cells={1}
                    readOnly
                    singleInputBox={true}
                    borderColor="border-indigo-900"
                    cellHeightClassName="h-8"
                    wrapperClassName="w-16"
                    align="center"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* PHYSICAL STATUS OF STUDENT */}
          <div className="relative mb-8">
            <div className="absolute -top-4 left-8 z-10 bg-yellow-300 px-6 py-1.5 shadow">
              <p className="font-bold text-indigo-900 tracking-wide">
                PHYSICAL STATUS OF STUDENT
              </p>
            </div>

            <div className="border-2 border-green-700 pt-8 pb-6 px-6 sm:px-8">
              <div className="flex gap-6">
                <div className="flex-1 space-y-4 text-pink-800 font-medium">
                  <AdmissionLineInput
                    control={control}
                    name="physicalStatus.studentName"
                    prefix="Student's Name"
                    maxLength={50}
                    underlineClassName="border-slate-400"
                  />
                  <AdmissionLineInput
                    control={control}
                    name="physicalStatus.fatherName"
                    prefix="Father's Name"
                    maxLength={50}
                    underlineClassName="border-slate-400"
                  />
                  <AdmissionLineInput
                    control={control}
                    name="physicalStatus.motherName"
                    prefix="Mother's Name"
                    maxLength={50}
                    underlineClassName="border-slate-400"
                  />
                </div>

                <div className="flex-1 space-y-4 text-pink-800 font-medium">
                  <AdmissionLineInput
                    control={control}
                    name="physicalStatus.weight"
                    prefix="Weight in Kg."
                    maxLength={3}
                    numeric
                    underlineClassName="border-slate-400"
                  />
                  <AdmissionLineInput
                    control={control}
                    name="physicalStatus.height"
                    prefix="Height in Cm."
                    maxLength={3}
                    numeric
                    underlineClassName="border-slate-400"
                  />
                  <AdmissionLineInput
                    control={control}
                    name="physicalStatus.bloodGroup"
                    prefix="Blood Group"
                    maxLength={2}
                    underlineClassName="border-slate-400"
                  />
                </div>

                <div className="hidden sm:flex h-28 w-24 border border-slate-500 items-center justify-center text-sm font-semibold shrink-0">
                  PHOTO
                </div>
              </div>

              <div className="space-y-4 text-pink-800 font-medium mt-6">
                <AdmissionLineInput
                  control={control}
                  name="physicalStatus.allergyMedicine"
                  prefix="Allergy from any Medicine"
                  maxLength={50}
                  underlineClassName="border-slate-400"
                />
                <AdmissionLineInput
                  control={control}
                  name="physicalStatus.allergyOther"
                  prefix="Allergy from any other thing"
                  maxLength={50}
                  underlineClassName="border-slate-400"
                />
                <AdmissionLineInput
                  control={control}
                  name="physicalStatus.disease"
                  prefix="Any Disease"
                  maxLength={50}
                  underlineClassName="border-slate-400"
                />
                <AdmissionLineInput
                  control={control}
                  name="physicalStatus.otherInformation"
                  prefix="Any other information"
                  maxLength={50}
                  underlineClassName="border-slate-400"
                />
              </div>

              <p className="text-right italic text-indigo-900 font-semibold mt-6">
                Parents&apos; Signature
              </p>
            </div>
          </div>

          {/* DECLARATION */}
          <div className="text-center mb-4">
            <h2 className="text-2xl italic font-bold text-purple-900 underline underline-offset-4">
              Declaration
            </h2>
          </div>

          <ul className="space-y-3 text-red-700 font-medium list-disc pl-6 mb-10">
            <li>
              I hereby declare that the information Submitted is complete and
              correct to the best of my knowledge.
            </li>
            <li>
              I fully agree to abide by rules and regulations of the School as
              they are now and may be in the future constituted and I will not
              claim for any refund of fees.
            </li>
            <li>
              In Case of any Unusual Occurrence on road or out side of the
              school, The School Management will not be Responsible.
            </li>
          </ul>

          {/* Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-green-800 font-medium mb-6">
            <div>
              <p>Signature of Father/Guardian</p>
              <p className="mt-3">
                Date:.......................................
              </p>
            </div>
            <div>
              <p>Signature of Mother</p>
              <p className="mt-3">
                Date:.......................................
              </p>
            </div>
            <div>
              <p>Signature of Student</p>
              <p className="mt-3">
                Date:.......................................
              </p>
            </div>
          </div>

          <p className="text-center text-indigo-900 font-semibold">
            Note: Enclose attested mark sheet &amp; T.C. of privious school.
          </p>

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
              variant="success"
              loading={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : editingStudentId
                  ? "Update Student"
                  : "Add Student"}
            </CustomButton>
          </div>
        </form>
      )}
    </div>
  );
}

export default AddStudent;
