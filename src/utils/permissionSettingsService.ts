/**
 * Firestore access for the Permissions page.
 *
 * - School-wide teacher defaults: ONE document,
 *   `panelSettings/rolePermissions`
 *   -> { teacher: [...], classTeacher: [...], known: [...] }.
 *   Missing document = the defaults of rolePermissions.ts.
 * - Per-teacher changes: `users/{uid}.permissionOverrides`
 *   -> { grant: [...], revoke: [...] }, read by resolvePermissions().
 *
 * Both are read with onSnapshot, so a saved change reaches the teacher's open
 * app immediately.
 */
import {
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { DocumentSnapshot } from "firebase/firestore";

import { COLLECTION, PRE_DEFINED_DOC_ID } from "../constants";
import { db } from "../firebase/config";
import {
  CLASS_TEACHER_BONUS,
  LEGACY_CATALOG_PERMISSIONS,
  ROLE_PERMISSIONS,
  TEACHER_CATALOG_PERMISSIONS,
  cleanPermissionList,
  isTeacherBlocked,
  type Permission,
  type TeacherRoleDefaults,
} from "../permissions";

const rolePermissionsRef = () =>
  doc(db, COLLECTION.PANEL_SETTINGS, PRE_DEFINED_DOC_ID.ROLE_PERMISSIONS);

const allowedOnly = (list: readonly Permission[]) =>
  [...new Set(list)].filter((permission) => !isTeacherBlocked(permission));

/**
 * The saved defaults. `known` lists the permissions the page offered when the
 * document was saved; a permission that did not exist yet (e.g. My Profile)
 * takes its built-in default instead of reading as OFF.
 */
export function parseTeacherRoleDefaults(
  snapshot: DocumentSnapshot
): TeacherRoleDefaults | null {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const known = new Set(
    Array.isArray(data.known)
      ? cleanPermissionList(data.known)
      : LEGACY_CATALOG_PERMISSIONS
  );
  const withNewDefaults = (saved: unknown, builtIn: readonly Permission[]) => [
    ...new Set([
      ...cleanPermissionList(saved),
      ...builtIn.filter((p) => !known.has(p)),
    ]),
  ];
  return {
    teacher: withNewDefaults(data.teacher, ROLE_PERMISSIONS.teacher),
    classTeacher: withNewDefaults(data.classTeacher, CLASS_TEACHER_BONUS),
  };
}

/**
 * Live school-wide teacher defaults (`null` = never saved). Without `onError`
 * a failed read falls back to `null`, so the app keeps working with the
 * built-in defaults; the Permissions page passes `onError` instead, so it
 * never saves over settings it could not read.
 */
export function subscribeTeacherRoleDefaults(
  listener: (defaults: TeacherRoleDefaults | null) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    rolePermissionsRef(),
    (snapshot) => listener(parseTeacherRoleDefaults(snapshot)),
    (error) => {
      console.error("Failed to load teacher permission defaults:", error);
      if (onError) onError(error);
      else listener(null);
    }
  );
}

export async function saveTeacherRoleDefaults(
  defaults: TeacherRoleDefaults,
  updatedBy: string
): Promise<void> {
  await setDoc(rolePermissionsRef(), {
    teacher: allowedOnly(defaults.teacher),
    classTeacher: allowedOnly(defaults.classTeacher),
    known: TEACHER_CATALOG_PERMISSIONS,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

/** Saves one teacher's grant / revoke lists; both empty removes the field. */
export async function saveTeacherOverrides(
  uid: string,
  overrides: { grant: Permission[]; revoke: Permission[] }
): Promise<void> {
  const grant = allowedOnly(overrides.grant);
  const revoke = [...new Set(overrides.revoke)];
  await updateDoc(doc(db, COLLECTION.USERS, uid), {
    permissionOverrides:
      grant.length === 0 && revoke.length === 0
        ? deleteField()
        : { grant, revoke },
    updatedAt: serverTimestamp(),
  });
}
