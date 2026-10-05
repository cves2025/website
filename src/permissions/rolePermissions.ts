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