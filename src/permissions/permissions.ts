export const ROLES = ["admin", "teacher", "student", "parent"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  STUDENT_CREATE: "student.create",
  STUDENT_READ: "student.read",
  SUBJECT_MANAGE: "subject.manage",
  TEACHER_CREATE: "teacher.create",
  TEACHER_READ: "teacher.read",
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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_SET = new Set<string>(ROLES);
const PERMISSION_SET = new Set<string>(Object.values(PERMISSIONS));

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && ROLE_SET.has(value);

export const isPermission = (value: unknown): value is Permission =>
  typeof value === "string" && PERMISSION_SET.has(value);