import { PERMISSIONS as P, Permission, Role } from "./permissions";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: Object.values(P),
  teacher: [
    P.STUDENT_READ,
    P.MARKS_ENTER,
    P.MARKS_VIEW,
    P.RESULT_VIEW,
  ],
  student: [P.ADMITCARD_VIEW, P.RESULT_VIEW, P.SETTINGS_ACCESS],
  parent: [P.ADMITCARD_VIEW, P.RESULT_VIEW, P.SETTINGS_ACCESS],
};


export const CLASS_TEACHER_BONUS: Permission[] = [
  P.ADMITCARD_VIEW,
  P.CROSSLIST_VIEW,
];

/**
 * Admin-only features. A teacher never gets these - not from the Permissions
 * page and not from a `grant` written into Firestore by mistake.
 */
export const TEACHER_BLOCKED_PERMISSIONS: Permission[] = [
  P.STUDENT_CREATE,
  P.STUDENT_PROMOTE,
  P.TEACHER_CREATE,
  P.EXAM_MANAGE,
  P.EXAM_SETTINGS,
  P.SETTINGS_ACCESS,
  P.PERMISSIONS_MANAGE,
];