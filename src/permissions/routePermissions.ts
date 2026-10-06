import { PERMISSIONS as P, Permission } from "./permissions";

export type RouteRule = Permission | Permission[] | "any";

export const ROUTE_PERMISSIONS: Record<string, RouteRule> = {
  "/welcome": "any",
  "/welcome/settings": P.SETTINGS_ACCESS,

  "/welcome/student/add": P.STUDENT_CREATE,
  "/welcome/student/list": P.STUDENT_READ,
  "/welcome/student/subject": P.SUBJECT_MANAGE,

  "/welcome/teacher/add": P.TEACHER_CREATE,
  "/welcome/teacher/list": P.TEACHER_READ,

  "/welcome/id-card/students": P.IDCARD_STUDENT,
  "/welcome/id-card/teachers": P.IDCARD_TEACHER,
  "/welcome/id-card/staff": P.IDCARD_STAFF,
  "/welcome/id-card/admin": P.IDCARD_ADMIN,

  "/welcome/exam/list": P.EXAM_MANAGE,
  "/welcome/admit-card": P.ADMITCARD_VIEW,
  "/welcome/admit-card/schedule": P.ADMITCARD_GENERATE,
  "/welcome/admit-card/generated": P.ADMITCARD_GENERATE,
  "/welcome/marks": [P.MARKS_ENTER, P.MARKS_VIEW],
  "/welcome/cross-list": P.CROSSLIST_VIEW,
  "/welcome/result": P.RESULT_VIEW,
  "/welcome/exam-settings": P.EXAM_SETTINGS,
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