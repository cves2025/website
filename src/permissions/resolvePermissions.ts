import { Permission, Role, isPermission } from "./permissions";
import {
  CLASS_TEACHER_BONUS,
  ROLE_PERMISSIONS,
  TEACHER_BLOCKED_PERMISSIONS,
} from "./rolePermissions";

export interface PermissionOverrides {
  grant?: unknown;
  revoke?: unknown;
}

/**
 * School-wide teacher defaults saved from the Permissions page
 * (panelSettings/rolePermissions). `null` = never saved, so the defaults in
 * rolePermissions.ts apply.
 */
export interface TeacherRoleDefaults {
  /** What every teacher gets. */
  teacher: Permission[];
  /** Extra permissions of class teachers. */
  classTeacher: Permission[];
}

export const cleanPermissionList = (value: unknown): Permission[] =>
  Array.isArray(value) ? [...new Set(value.filter(isPermission))] : [];

const BLOCKED = new Set<Permission>(TEACHER_BLOCKED_PERMISSIONS);

export const isTeacherBlocked = (permission: Permission) =>
  BLOCKED.has(permission);

/** True when the users/{uid} profile marks the teacher as a class teacher. */
export function isClassTeacherProfile(data: Record<string, unknown>): boolean {
  const sections = data.sectionAssignments;
  if (Array.isArray(sections)) {
    return sections.some(
      (s) => (s as { isClassTeacher?: unknown } | null)?.isClassTeacher === true
    );
  }
  return data.isClassTeacher === true;
}

/**
 * A teacher's permissions before their personal overrides: the school-wide
 * teacher defaults, plus the class-teacher extras for class teachers.
 */
export function teacherDefaultPermissions(
  defaults: TeacherRoleDefaults | null | undefined,
  isClassTeacher: boolean
): { base: Set<Permission>; classTeacher: Set<Permission> } {
  const allowed = (list: readonly Permission[]) =>
    new Set(list.filter((p) => !BLOCKED.has(p)));
  return {
    base: allowed(defaults?.teacher ?? ROLE_PERMISSIONS.teacher),
    classTeacher: allowed(
      isClassTeacher ? defaults?.classTeacher ?? CLASS_TEACHER_BONUS : []
    ),
  };
}

export function resolvePermissions(
  role: Role,
  overrides?: PermissionOverrides | null,
  isClassTeacher = false,
  teacherDefaults?: TeacherRoleDefaults | null
): Permission[] {
  if (role === "admin") return [...ROLE_PERMISSIONS.admin];

  let result: Set<Permission>;
  if (role === "teacher") {
    const { base, classTeacher } = teacherDefaultPermissions(
      teacherDefaults,
      isClassTeacher
    );
    result = new Set([...base, ...classTeacher]);
  } else {
    result = new Set(ROLE_PERMISSIONS[role]);
  }

  cleanPermissionList(overrides?.grant).forEach((p) => result.add(p));
  cleanPermissionList(overrides?.revoke).forEach((p) => result.delete(p));

  if (role === "teacher") BLOCKED.forEach((p) => result.delete(p));

  return [...result];
}
