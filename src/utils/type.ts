import { ExamCategory, MarksScheme } from "./examMarksScheme";

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

/** Exams saved on the Add Exam page. */
export interface ExamDoc {
  id: string;
  examName: string;
  examCategory: ExamCategory;
  academicYear: string;
  maxMarks: number;
  marksScheme: MarksScheme;
  applicableClasses: string[];
  examStartDate: string;
  examEndDate: string;
  status: "active" | "archived";
}

/** A subject from the Subjects page, together with the classes offering it. */
export interface SubjectOption {
  name: string;
  classes: string[];
  order: number;
  types: string[];
}

export interface ScheduleRow {
  id: string;
  /** Plain subject name, e.g. "English" (type is stored separately). */
  subject: string;
  /**
   * Subject type of the scheduled paper, e.g. "Written". Empty for legacy
   * rows that were saved before subject types existed.
   */
  subjectType: string;
  date: string;
  fromTime: string;
  toTime: string;
  allClasses: boolean;
  classes: string[];
}

/** Student record (from the enrollments page) used to fill an admit card. */
export interface CardStudent {
  /** Enrollments document id. */
  id: string;
  /** Students document id, used to pull extra details (mother's name). */
  studentId: string;
  enrollment: string;
  studentName: string;
  firstName: string;
  lastName: string;
  className: string;
  section: string;
  academicYear: string;
  fatherName: string;
  motherName: string;
  studentPhoto?: string;
}