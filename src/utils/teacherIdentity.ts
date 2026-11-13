/**
 * Employee ID / email / phone / assignment rules of the teacher form.
 *
 * Employee IDs look like CVES-T-005 and are never reused: deleted teachers
 * (isDeleted) keep theirs, so they count in the next number and in the
 * duplicate check. Emails count deleted teachers too, because a deleted
 * teacher still has a login account with that email.
 */
import { collection, getDocs } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import { TEACHER_SECTIONS, classTeacherClassesOf, sectionAssignmentsFromDoc } from "./teacherSections";
import type { TeacherSectionAssignment } from "./type";

export const EMPLOYEE_ID_PREFIX = "CVES-T-";

/** Indian mobile number without +91: 10 digits starting with 6-9. */
export const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

export interface UserIdentity {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  isDeleted: boolean;
  isInactive: boolean;
  sectionAssignments: TeacherSectionAssignment[];
}

export const normalizeEmployeeId = (value: string) =>
  value.trim().toUpperCase();

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

/** Stored / pasted phone -> 10 digits (drops spaces, +91, 91 or a leading 0). */
export function toMobileDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** Every user (teachers, admins, deleted ones too) with the fields that must be unique. */
export async function loadUserIdentities(): Promise<UserIdentity[]> {
  const snapshot = await getDocs(collection(db, COLLECTION.USERS));
  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const text = (key: string) =>
      typeof data[key] === "string" ? (data[key] as string).trim() : "";
    return {
      id: documentSnapshot.id,
      name: `${text("firstName")} ${text("lastName")}`.trim() || "another user",
      employeeId: text("employeeId"),
      email: text("email"),
      isDeleted: data.isDeleted === true,
      isInactive: text("status") === "Inactive",
      sectionAssignments: sectionAssignmentsFromDoc(data),
    };
  });
}

/** Next free ID: highest number used so far (old "04" style IDs too) + 1. */
export function nextEmployeeId(users: readonly UserIdentity[]): string {
  const highest = users.reduce((max, user) => {
    const match = /(\d+)$/.exec(user.employeeId);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${EMPLOYEE_ID_PREFIX}${String(highest + 1).padStart(3, "0")}`;
}

const ownerLabel = (user: UserIdentity) =>
  user.isDeleted ? `${user.name} (deleted teacher)` : user.name;

/** Error text when another user already has this employee ID, else null. */
export function employeeIdConflict(
  users: readonly UserIdentity[],
  employeeId: string,
  ignoreId: string | null
): string | null {
  const key = normalizeEmployeeId(employeeId);
  if (!key) return null;
  const owner = users.find(
    (user) => user.id !== ignoreId && normalizeEmployeeId(user.employeeId) === key
  );
  return owner ? `${key} is already used by ${ownerLabel(owner)}.` : null;
}

/** Error text when another user already has this email, else null. */
export function emailConflict(
  users: readonly UserIdentity[],
  email: string,
  ignoreId: string | null
): string | null {
  const key = normalizeEmail(email);
  if (!key) return null;
  const owner = users.find(
    (user) => user.id !== ignoreId && normalizeEmail(user.email) === key
  );
  return owner ? `This email is already used by ${ownerLabel(owner)}.` : null;
}

/* ---------- Section-wise assignments taken by other teachers ---------- */

/**
 * Who already holds each assignment, so one class of a section has one
 * class teacher and one subject of a class + section has one teacher.
 * Deleted users are skipped; inactive teachers still hold theirs.
 */
export interface AssignmentOwners {
  /** `${section}|${className}` -> owner label */
  classTeacher: Map<string, string>;
  /** `${section}|${className}|${subject}` -> owner label */
  subject: Map<string, string>;
}

const subjectKey = (name: string) => name.trim().toLowerCase();

export const classTeacherKey = (section: string, className: string) =>
  `${section}|${className}`;

export const subjectAssignmentKey = (
  section: string,
  className: string,
  subject: string
) => `${section}|${className}|${subjectKey(subject)}`;

export function assignmentOwners(
  users: readonly UserIdentity[],
  ignoreId: string | null
): AssignmentOwners {
  const owners: AssignmentOwners = { classTeacher: new Map(), subject: new Map() };
  users.forEach((user) => {
    if (user.isDeleted || user.id === ignoreId) return;
    const label = user.isInactive ? `${user.name} (Inactive)` : user.name;
    user.sectionAssignments.forEach((assignment) => {
      // Records saved before sections existed belong to the first section.
      const section = assignment.section || TEACHER_SECTIONS[0];
      // Every class this teacher is class teacher of in the section.
      classTeacherClassesOf(assignment).forEach((className) =>
        owners.classTeacher.set(classTeacherKey(section, className), label)
      );
      assignment.classes.forEach((entry) =>
        entry.subjects.forEach((subject) =>
          owners.subject.set(
            subjectAssignmentKey(section, entry.className, subject),
            label
          )
        )
      );
    });
  });
  return owners;
}

/** The first assignment of the form that another teacher already holds. */
export function findAssignmentConflict(
  assignments: readonly TeacherSectionAssignment[],
  owners: AssignmentOwners
): { section: string; message: string } | null {
  for (const assignment of assignments) {
    const { section } = assignment;
    for (const className of classTeacherClassesOf(assignment)) {
      const owner = owners.classTeacher.get(classTeacherKey(section, className));
      if (owner) {
        return {
          section,
          message: `${owner} is already the class teacher of Class ${className} in Section ${section}.`,
        };
      }
    }
    for (const entry of assignment.classes) {
      for (const subject of entry.subjects) {
        const owner = owners.subject.get(
          subjectAssignmentKey(section, entry.className, subject)
        );
        if (owner) {
          return {
            section,
            message: `${subject} of Class ${entry.className} in Section ${section} is already assigned to ${owner}.`,
          };
        }
      }
    }
  }
  return null;
}
