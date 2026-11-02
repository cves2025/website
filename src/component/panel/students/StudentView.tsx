import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Pencil, Printer } from "lucide-react";

import { AdmissionStudentFormValues } from "../../../utils/type";
import { studentDocToFormValues } from "../../../utils/admissionFormValues";
import { allowedClassSections, pairKey } from "../../../utils/studentScope";
import { ADD_STUDENT_PATH, COLLECTION } from "../../../constants";
import { db } from "../../../firebase/config";
import type { PhotoKind } from "../../../firebase/studentPhotos";
import { NO_SCOPE, PERMISSIONS } from "../../../permissions";
import { myContext } from "../../context/MyContextProvider";
import CustomButton from "../../../custom-components/CustomButton";
import PhotoUploadBox from "../../../custom-components/admission/PhotoUploadBox";
import {
  A4Sheet,
  AdmissionInfoSheet,
  AdmissionSchoolSheet,
  READ_ONLY_FORM,
} from "./AdmissionFormSheet";

const STUDENT_LIST_PATH = "/welcome/student/list";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; studentName: string };

/**
 * View Student (Student List > View): the admission form of one enrollment,
 * read-only, with Print (two A4 pages) and Edit for those who may edit.
 * Teachers only see students of their own classes.
 */
function StudentView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const enrollmentId = searchParams.get("id") ?? "";
  const { user, can, profileReady } = useContext(myContext);
  const canEdit = can(PERMISSIONS.STUDENT_CREATE);
  const scope = user?.scope ?? NO_SCOPE;

  const { control, reset, watch } = useForm<AdmissionStudentFormValues>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!profileReady) return;
    if (!enrollmentId) {
      setState({ status: "error", message: "No student was chosen." });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const load = async () => {
      try {
        const enrollmentSnapshot = await getDoc(
          doc(db, COLLECTION.ENROLLMENTS, enrollmentId),
        );
        if (!enrollmentSnapshot.exists()) {
          throw new Error("Student record not found.");
        }
        const enrollment = enrollmentSnapshot.data();
        const className = String(enrollment.className ?? "");
        const section = String(enrollment.section ?? "");

        const pairs = allowedClassSections(scope);
        if (
          pairs &&
          !pairs.some(
            (pair) =>
              pairKey(pair.className, pair.section) ===
              pairKey(className, section),
          )
        ) {
          throw new Error("This student is not in one of your classes.");
        }

        const studentSnapshot = await getDoc(
          doc(db, COLLECTION.STUDENTS, String(enrollment.studentId ?? "")),
        );
        if (!studentSnapshot.exists()) {
          throw new Error("Student record not found.");
        }

        // The enrollment holds this session's class, section and number.
        const academicYear = String(enrollment.academicYear ?? "");
        const [sessionStart, sessionEnd] = academicYear.split("-");
        const values = studentDocToFormValues(studentSnapshot.data());
        if (cancelled) return;
        reset({
          ...values,
          className: className || values.className,
          section: section || values.section,
          enrollment: String(enrollment.enrollment ?? values.enrollment),
          sessionStart: sessionStart ? sessionStart.slice(-2) : values.sessionStart,
          sessionEnd: sessionEnd ? sessionEnd.slice(-2) : values.sessionEnd,
        });
        setState({ status: "ready", studentName: values.fullName });
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load the student:", error);
        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : "Failed to load the student.",
        });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // `scope` is rebuilt with the profile; profileReady covers it.
  }, [enrollmentId, profileReady, reset]);

  // The print dialog suggests the page title as the PDF file name.
  const studentName = state.status === "ready" ? state.studentName : "";
  useEffect(() => {
    if (!studentName) return;
    const previous = document.title;
    document.title = `Admission Form - ${studentName}`;
    return () => {
      document.title = previous;
    };
  }, [studentName]);

  const photos: Record<PhotoKind, string> = {
    student: watch("studentPhoto") ?? "",
    father: watch("fatherPhoto") ?? "",
    mother: watch("motherPhoto") ?? "",
  };

  const renderPhoto = (kind: PhotoKind, label: string) => (
    <PhotoUploadBox
      label={label}
      photoUrl={photos[kind]}
      onFileSelected={() => undefined}
      disabled
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <style>{"@page { size: A4; margin: 0; }"}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-sm print:hidden">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-primaryBlue">
            {studentName || "Admission Form"}
          </h1>
          <p className="text-sm text-gray-500">
            Admission form - prints on two A4 pages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CustomButton
            type="button"
            variant="outline"
            onClick={() => navigate(STUDENT_LIST_PATH)}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </CustomButton>
          {canEdit && (
            <CustomButton
              type="button"
              variant="outline"
              disabled={state.status !== "ready"}
              onClick={() => navigate(`${ADD_STUDENT_PATH}?edit=${enrollmentId}`)}
            >
              <Pencil className="h-4 w-4" /> Edit
            </CustomButton>
          )}
          <CustomButton
            type="button"
            variant="success"
            disabled={state.status !== "ready"}
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" /> Print
          </CustomButton>
        </div>
      </div>

      {state.status === "loading" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Loading student data...
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700">
          {state.message}
        </div>
      )}

      {state.status === "ready" && (
        // Wide sheets scroll sideways on a phone instead of squeezing.
        <div className="overflow-x-auto pb-4 [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:overflow-visible print:pb-0">
          <div className="flex w-max min-w-full flex-col gap-6 print:block print:w-auto">
            <A4Sheet>
              <fieldset disabled className={READ_ONLY_FORM}>
                <AdmissionInfoSheet
                  control={control}
                  bannerTitle="ADMISSION FORM"
                  renderPhoto={renderPhoto}
                />
              </fieldset>
            </A4Sheet>
            <A4Sheet>
              <fieldset disabled className={READ_ONLY_FORM}>
                <AdmissionSchoolSheet control={control} />
              </fieldset>
            </A4Sheet>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentView;
