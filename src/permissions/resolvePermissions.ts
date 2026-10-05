import { Permission, Role, isPermission } from "./permissions";
import { CLASS_TEACHER_BONUS, ROLE_PERMISSIONS } from "./rolePermissions";

export interface PermissionOverrides {
  grant?: unknown;
  revoke?: unknown;
}

const cleanList = (value: unknown): Permission[] =>
  Array.isArray(value) ? value.filter(isPermission) : [];

export function resolvePermissions(
  role: Role,
  overrides?: PermissionOverrides | null,
  isClassTeacher = false
): Permission[] {
  if (role === "admin") return [...ROLE_PERMISSIONS.admin];

  const result = new Set<Permission>(ROLE_PERMISSIONS[role]);

  if (role === "teacher" && isClassTeacher) {
    CLASS_TEACHER_BONUS.forEach((p) => result.add(p));
  }

  cleanList(overrides?.grant).forEach((p) => result.add(p));
  cleanList(overrides?.revoke).forEach((p) => result.delete(p));

  return [...result];
}