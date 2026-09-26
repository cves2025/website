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

/* -------------------------------------------------------------- settings -- */

/** One row of the "All Class Lists" table on the Settings page. */
export interface ClassStudentCount {
  /** Class name exactly as stored in `CLASSES` (e.g. "5", "Nursery", "UKG"). */
  className: string;
  /**
   * Students enrolled in that class for the selected academic session.
   * Records marked `isDeleted` (recycle bin) are not counted.
   */
  totalStudents: number;
}

/** What the class row delete action does with the students of a class. */
export type ClassStudentsDeleteMode = "recycle" | "permanent";

/** Outcome of `deleteClassStudents()` - how many documents were touched. */
export interface ClassStudentsDeleteResult {
  /** Enrollment records (the class/session rows) affected. */
  enrollments: number;
  /** Master `students` profiles recycled or removed. */
  students: number;
}

/** Everything `useAllClassesLengthOfStudents()` returns. */
export interface AllClassesLengthOfStudents {
  /** One entry per class of `CLASSES`, in the same order. */
  classes: ClassStudentCount[];
  loading: boolean;
  /** Message of the last failed load, or null when the counts are valid. */
  error: string | null;
  /** Re-runs the aggregation queries (call it after a delete/recycle). */
  refresh: () => Promise<void>;
}

/* --------------------------------------------------------------- teacher -- */

/** Classes a teacher handles inside one section, together with the subjects. */
export interface TeacherClassSubjects {
  className: string;
  subjects: string[];
}

/**
 * Everything a teacher handles in one section of the school: whether the
 * teacher is the class teacher there and which subjects are taught in which
 * class. A teacher can have one entry per section (e.g. class teacher of 3 in
 * Section A and class teacher of 8 in Section B).
 */
export interface TeacherSectionAssignment {
  section: string;
  isClassTeacher: boolean;
  classTeacherOf: string;
  classes: TeacherClassSubjects[];
}

/** One subject of the Subjects page, used inside the class/subject picker. */
export interface TeacherSubjectOption {
  name: string;
  type: string;
}

export interface TeacherFormValues {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: Date | null;
  employeeId: string;
  designation: string;
  status: string;
  email: string;
  phone: string;
  joiningDate: Date | null;
  address: string;
  photo: string;
  qualification: string;
  sectionAssignments: TeacherSectionAssignment[];
  assignedClasses: string[];
  isClassTeacher: boolean;
  classTeacherOf: string;
  password: string;
  role: string;
}

export interface TeacherRecord extends Omit<TeacherFormValues, "password"> {
  id: string;
  uid: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}