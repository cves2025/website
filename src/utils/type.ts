export interface StudentFormValues {
  firstName: string;
  lastName: string;
  enrollment: string;
  className: string;
  section: string;
  fatherName: string;
  motherName: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  academicYear: string;
}

export interface StoredStudent extends StudentFormValues {
  id: number;
}

/** Page-2 section: previous qualifying exam details. */
export interface PreviousQualifyingExam {
  maximumMarks: string;
  previousClass: string;
  marksObtained: string;
  percentage: string;
}

/** Page-2 section: physical status of the student. */
export interface PhysicalStatus {
  studentName: string;
  fatherName: string;
  motherName: string;
  weight: string;
  height: string;
  bloodGroup: string;
  allergyMedicine: string;
  allergyOther: string;
  disease: string;
  otherInformation: string;
}

/**
 * Values of the full two-page admission form ("Student Info" +
 * "Previous School Info"). `firstName` / `lastName` / `dob` / `academicYear`
 * are kept for backward compatibility with the existing Firestore model and
 * are composed from `fullName`, the DOB parts and the session parts at submit
 * time.
 */
export interface AdmissionStudentFormValues extends StudentFormValues {
  fullName: string;
  fatherOccupation: string;
  gender: string;
  category: string;
  nationality: string;
  phone2: string;
  correspondenceName: string;
  city: string;
  state: string;
  pin: string;
  permanentAddress: string;
  permanentCity: string;
  permanentState: string;
  permanentPin: string;
  sessionStart: string;
  sessionEnd: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  penOfStudent: string;
  lastSchoolName: string;
  lastSchoolAddress: string;
  passingYear: string;
  previousQualifyingExam: PreviousQualifyingExam;
  physicalStatus: PhysicalStatus;
  studentPhoto: string;
  motherPhoto: string;
  fatherPhoto: string;
}