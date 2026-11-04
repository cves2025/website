import { PERMISSIONS as P, Permission } from "./permissions";

export type RouteRule = Permission | Permission[] | "any";

export const ROUTE_PERMISSIONS: Record<string, RouteRule> = {
  "/welcome": "any",
  "/welcome/settings": P.SETTINGS_ACCESS,
  "/welcome/settings/permissions": P.PERMISSIONS_MANAGE,
  "/welcome/settings/profile": P.PROFILE_VIEW,
  "/welcome/settings/news": P.NEWS_MANAGE,
  "/welcome/settings/gallery": P.GALLERY_MANAGE,
  "/welcome/settings/downloads": P.DOWNLOADS_MANAGE,
  "/welcome/settings/banner": P.BANNER_MANAGE,

  "/welcome/student/add": P.STUDENT_CREATE,
  "/welcome/student/list": P.STUDENT_READ,
  "/welcome/student/view": P.STUDENT_FORM_VIEW,
  "/welcome/student/promote": P.STUDENT_PROMOTE,
  "/welcome/student/subject": P.SUBJECT_MANAGE,

  "/welcome/teacher/add": P.TEACHER_CREATE,

  "/welcome/id-card/students": P.IDCARD_STUDENT,
  "/welcome/id-card/teachers": P.IDCARD_TEACHER,
  "/welcome/id-card/staff": P.IDCARD_STAFF,
  "/welcome/id-card/admin": P.IDCARD_ADMIN,

  "/welcome/exam/list": P.EXAM_MANAGE,
  "/welcome/desk-slip": P.DESK_SLIP,
  "/welcome/admit-card": P.ADMITCARD_VIEW,
  "/welcome/admit-card/schedule": P.ADMITCARD_GENERATE,
  "/welcome/admit-card/generated": P.ADMITCARD_GENERATE,
  "/welcome/result-card/generated": P.RESULT_VIEW,
  "/welcome/marks": [P.MARKS_ENTER, P.MARKS_VIEW],
  "/welcome/cross-list": P.CROSSLIST_VIEW,
  "/welcome/result": P.RESULT_VIEW,
  "/welcome/exam-settings": P.EXAM_SETTINGS,
  "/welcome/exam-settings/admit-card-template": P.EXAM_SETTINGS,
  "/welcome/exam-settings/result-template": P.EXAM_SETTINGS,

  "/welcome/attendance/mark": P.ATTENDANCE_MARK,
  "/welcome/attendance/report": P.ATTENDANCE_VIEW,
  "/welcome/attendance/holidays": P.HOLIDAY_MANAGE,

  "/welcome/fees/structure": P.FEE_MANAGE,
  "/welcome/fees/settings": P.FEE_MANAGE,
};

const normalize = (path: string) =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

export function hasAccess(
  rule: RouteRule | undefined,
  permissions: readonly Permission[]
): boolean {
  if (rule === undefined) return false; // default deny
  if (rule === "any") return true;
  const needed = Array.isArray(rule) ? rule : [rule];
  return needed.some((p) => permissions.includes(p));
}

export function canAccessPath(
  pathname: string,
  permissions: readonly Permission[]
): boolean {
  return hasAccess(ROUTE_PERMISSIONS[normalize(pathname)], permissions);
}