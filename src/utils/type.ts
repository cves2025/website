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

/** Fields of an `enrollments` document used by roll number and edit-navigation logic. */
export interface EnrollmentRecord {
  studentId?: string;
  studentName?: string;
  firstName?: string;
  lastName?: string;
  className?: string;
  section?: string;
  academicYear?: string;
  isDeleted?: boolean;
}

/** Roll numbers restart at 1 in every section of a class. */
export interface RollNumberEntry {
  studentId: string;
  name: string;
  section: string;
  rollNumber: number;
}

export interface RollNumberDocument {
  academicYear: string;
  className: string;
  students: RollNumberEntry[];
  updatedAt: unknown;
}

export interface RollNumberGenerationResult {
  classCount: number;
  studentCount: number;
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

/* ---------------------------------------------------------------- marks -- */

/** Status of a student in one subject of an exam. */
export type SubjectMarkStatus = "present" | "absent" | "exempt";

/** Mark components that make up a subject total, mirroring the exam scheme. */
export type SubjectComponentName = "notebook" | "test" | "theory" | "practical" | "written" | "oral";

export interface SubjectMarksRecord {
  status: SubjectMarkStatus;
  /** Numeric marks obtained; null when the student was absent or exempt. */
  obtained: number | null;
  /** Maximum marks of the subject, copied from the exam scheme at save time. */
  maxMarks: number;
  /** Component marks (notebook/test/theory/practical) entered with the mark. */
  components?: Partial<Record<SubjectComponentName, number | null>>;
  componentStatus?: Partial<Record<SubjectComponentName, SubjectMarkStatus>>;
  /** Maximum marks of every component, copied from the exam scheme. */
  componentMax?: Partial<Record<SubjectComponentName, number>>;
  /** Scholastic grade ("A+", "B", ...). Grade records never count in totals. */
  grade?: string;
}

export interface MarksData {
  studentUid: string;
  admissionNumber: string;
  studentName: string;
  fatherName: string;
  session: string;
  className: string;
  section: string;
  rollNumber: number;
  examId: string;
  examType: ExamCategory;
  examName: string;
  subjectMarks: Record<string, SubjectMarksRecord>;
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  result: "pass" | "fail";
}

export interface MarksDoc extends MarksData {
  id: string;
  createdAt: unknown;
  updatedAt: unknown;
}

/** Result of calculateMarksSummary() - the single source of totals. */
export interface MarksSummary {
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  result: "pass" | "fail";
}

/** One subject column of the frozen examSheet snapshot. */
export interface ExamSheetSubjectColumn {
  /** SubjectDoc id - the key used inside MarksData.subjectMarks. */
  id: string;
  name: string;
  type: string;
  order: number;
  /**
   * Line number of this subject on the report card. Missing / 0 = the
   * subject is not shown on the report card.
   */
  reportCardOrder?: number;
  maxMarks: number;
  componentMax?: Partial<Record<SubjectComponentName, number>>;
  /** True for Scholastic subjects whose marks are grades, not numbers. */
  isGrade: boolean;
}

/** Immutable snapshot of the subject columns of one exam + class. */
export interface ExamSheetDoc {
  id: string;
  session: string;
  examId: string;
  examName: string;
  className: string;
  createdAt: unknown;
  subjects: ExamSheetSubjectColumn[];
}

// ------------------------------- Desk Slip ----------------------
export interface DeskSlipStudent {
  id: string;
  studentId: string;
  admissionNo: string;
  studentName: string;
  fatherName: string;
  className: string;
  section: string;
  photoUrl: string;
}

// --------------------------- Exam Settings - Suggested remarks -------------------
export type SavedRange = { id: string; from: number; to: number; remark: string };
export type SavedExamRemarks = {
  examName: string;
  ranges: SavedRange[];
  updatedAt: string;
};
export type SavedMap = Record<string, SavedExamRemarks>;

export type RemarkRow = { id: string; from: string; to: string; remark: string };

// date is stored as an ISO string: "YYYY-MM-DD"
export type SavedDistributionDate = {
  examName: string;
  date: string;
  updatedAt: string;
};
export type SavedDistributionMap = Record<string, SavedDistributionDate>;

// Shape of the whole PANEL_SETTINGS / suggestedRemarks document
export type SuggestedRemarksDoc = {
  remarksByExam?: SavedMap;
  dateByExam?: SavedDistributionMap;
};
// --------------------------- Attendance -------------------------------------

/** P = Present, A = Absent, L = Leave (informed absence, counts as absent). */
export type AttendanceStatus = "P" | "A" | "L";

/** One `dailyAttendance` document: a whole section on one date. */
export interface DailyAttendanceDoc {
  session: string;
  className: string;
  section: string;
  /** "yyyy-MM-dd" */
  date: string;
  /** studentId -> status. A student missing here was not on the list that day. */
  records: Record<string, AttendanceStatus>;
  markedBy: string;
  markedByName: string;
  updatedAt?: unknown;
}

export interface Holiday {
  id: string;
  name: string;
  /** "yyyy-MM-dd", inclusive. */
  from: string;
  /** "yyyy-MM-dd", inclusive; equal to `from` for a one-day holiday. */
  to: string;
  /** Classes on holiday; empty = the whole school. */
  classes: string[];
}

/** The `holidayCalendar/{session}` document. */
export interface HolidayCalendar {
  session: string;
  /** Weekdays that are always off (0 = Sunday ... 6 = Saturday). */
  weeklyOff: number[];
  holidays: Holiday[];
}

/* ------------------------------------------------------------------ fees -- */

/** Admission and monthly (tuition) fee of one class, in rupees. */
export interface ClassFee {
  admission: number;
  monthly: number;
}

/**
 * One exam fee of a session (e.g. "Half-Yearly Exam" in September). The
 * admin decides how many there are, their month and the amount per class.
 */
export interface ExamFeeItem {
  id: string;
  name: string;
  /** Calendar month, 1 = January ... 12 = December. */
  month: number;
  /** className -> amount; a missing class means 0. */
  amounts: Record<string, number>;
}

/** The `feeStructures/{session}` document. */
export interface FeeStructure {
  session: string;
  /** className -> fees; a missing class means 0 for both. */
  classes: Record<string, ClassFee>;
  examFees: ExamFeeItem[];
}

/** The `feeSettings/general` document. */
export interface FeeSettings {
  /** Day of the month by which the monthly fee is due (1-28). */
  dueDay: number;
  lateFeeEnabled: boolean;
  /** Fixed late fee for each month not paid by the due day. */
  lateFeeAmount: number;
  /** First part of the receipt number, e.g. "CVES" -> CVES/2026-27/0001. */
  receiptPrefix: string;
}

export type FeeHead =
  | "previousDues"
  | "admission"
  | "monthly"
  | "transport"
  | "exam"
  | "extra"
  | "lateFee";

/** One charge on a student's fee account, e.g. "April - Monthly Fee". */
export interface FeeLine {
  /** Stable id inside the account, e.g. "monthly-4", "exam-{examFeeId}". */
  id: string;
  head: FeeHead;
  label: string;
  /** Calendar month the line belongs to (1-12); null = not month-bound. */
  month: number | null;
  amount: number;
  discount: number;
  paid: number;
  /** Waived (fee maafi): whatever is still due on the line is let go. */
  waived: boolean;
  discountReason: string;
  waiveReason: string;
}

/** Transport fee of a student: the same amount every month in the range. */
export interface FeeTransport {
  amount: number;
  /** First and last calendar month of the range (inclusive, session order). */
  fromMonth: number;
  toMonth: number;
}

/** One entry of an account's change log (discount, waive, special fee ...). */
export interface FeeLogEntry {
  /** ISO date-time. */
  at: string;
  byName: string;
  text: string;
}

/** The `feeAccounts/{session}_{studentId}` document. */
export interface FeeAccount {
  id: string;
  session: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  admissionNo: string;
  fatherName: string;
  lines: FeeLine[];
  /** Monthly fee this student pays instead of the class fee; null = class fee. */
  specialMonthlyFee: number | null;
  transport: FeeTransport | null;
  log: FeeLogEntry[];
}

/** Totals of an account; `due` never counts waived lines. */
export interface FeeTotals {
  amount: number;
  discount: number;
  paid: number;
  due: number;
}

export type PaymentMode = "Cash" | "UPI" | "Cheque" | "Bank Transfer";

/** How much of a payment went to one line. */
export interface FeeAllocation {
  lineId: string;
  label: string;
  amount: number;
}

/** The `feePayments/{session}_{serial}` document (one fee receipt). */
export interface FeePayment {
  id: string;
  receiptNo: string;
  /** Running number of the receipt inside the session (1, 2, 3 ...). */
  serial: number;
  session: string;
  accountId: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  admissionNo: string;
  fatherName: string;
  /** Payment date, "yyyy-MM-dd". */
  date: string;
  mode: PaymentMode;
  /** UPI / cheque / bank reference number. */
  reference: string;
  note: string;
  amount: number;
  allocations: FeeAllocation[];
  status: "active" | "cancelled";
  collectedByName: string;
  cancelReason: string;
  cancelledByName: string;
}

/** Who a fee account belongs to (copied onto the account and receipts). */
export interface FeeStudent {
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  admissionNo: string;
  fatherName: string;
}

/** What the admin enters on the Collect Fee page. */
export interface FeePaymentInput {
  amount: number;
  /** Lines the payment is for; null = oldest due lines first. */
  lineIds: string[] | null;
  date: string;
  mode: PaymentMode;
  reference: string;
  note: string;
}
