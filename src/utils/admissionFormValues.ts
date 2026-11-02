import type { DocumentData } from "firebase/firestore";
import type { AdmissionStudentFormValues } from "./type";

/**
 * A `students/{studentId}` document as admission form values (Add / Edit and
 * View Student). Missing fields become "" so every input stays controlled.
 */
export function studentDocToFormValues(doc: DocumentData): AdmissionStudentFormValues {
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
