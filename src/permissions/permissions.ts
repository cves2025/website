export const ROLES = ["admin", "teacher", "student", "parent"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  STUDENT_CREATE: "student.create",
  STUDENT_READ: "student.read",
  STUDENT_FORM_VIEW: "student.formView",
  /** Change the student, father and mother photos (mobile app Students page). */
  STUDENT_PHOTO: "student.photo",
  /** Upload a new version of a student's documents (Aadhaar ...). Every teacher may view them. */
  STUDENT_DOCUMENTS: "student.documents",
  STUDENT_PROMOTE: "student.promote",
  /** Download Excel of the students (a teacher: only their own classes). */
  STUDENT_EXPORT: "student.export",
  SUBJECT_MANAGE: "subject.manage",
  TEACHER_CREATE: "teacher.create",
  IDCARD_STUDENT: "idcard.student",
  IDCARD_TEACHER: "idcard.teacher",
  IDCARD_STAFF: "idcard.staff",
  IDCARD_ADMIN: "idcard.admin",
  EXAM_MANAGE: "exam.manage",
  ADMITCARD_VIEW: "admitcard.view",
  ADMITCARD_GENERATE: "admitcard.generate",
  MARKS_ENTER: "marks.enter",
  MARKS_VIEW: "marks.view",
  CROSSLIST_VIEW: "crosslist.view",
  RESULT_VIEW: "result.view",
  RESULT_PUBLISH: "result.publish",
  SETTINGS_ACCESS: "settings.access",
  EXAM_SETTINGS: "examSettings.access",
  DESK_SLIP: "deskslip.access",
  PERMISSIONS_MANAGE: "permissions.manage",
  PROFILE_VIEW: "profile.view",
  NEWS_MANAGE: "news.manage",
  GALLERY_MANAGE: "gallery.manage",
  DOWNLOADS_MANAGE: "downloads.manage",
  BANNER_MANAGE: "banner.manage",
  ATTENDANCE_MARK: "attendance.mark",
  ATTENDANCE_VIEW: "attendance.view",
  HOLIDAY_MANAGE: "holiday.manage",
  FEE_MANAGE: "fee.manage",
  /** Staff Attendance: day view, marks, phone resets, staff holidays, settings (admin only). */
  STAFF_ATTENDANCE_MANAGE: "staffAttendance.manage",
  /** Transfer Certificate page: see saved TCs and print them. */
  TC_VIEW: "tc.view",
  /** Make, edit, issue and revise TCs (issuing marks the student Left). */
  TC_ISSUE: "tc.issue",
  /** TC Settings (letterhead, book no., Sr. No.); admin only. */
  TC_SETTINGS: "tc.settings",
  /** UDISE+ page (testing): portal answers of students + UDISE settings; admin only. */
  UDISE_MANAGE: "udise.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_SET = new Set<string>(ROLES);
const PERMISSION_SET = new Set<string>(Object.values(PERMISSIONS));

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && ROLE_SET.has(value);

export const isPermission = (value: unknown): value is Permission =>
  typeof value === "string" && PERMISSION_SET.has(value);