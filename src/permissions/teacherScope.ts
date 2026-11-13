import type { TeacherSectionAssignment } from "../utils/type";
import { classTeacherClassesOf } from "../utils/teacherSections";

export type AccessScope =
  | { kind: "all" }
  | { kind: "assigned"; assignments: TeacherSectionAssignment[] }
  | { kind: "none" };

export const ALL_SCOPE: AccessScope = { kind: "all" };
export const NO_SCOPE: AccessScope = { kind: "none" };

export type SubjectAccess = "edit" | "view" | "none";

export function scopedClasses(
  scope: AccessScope,
  allClasses: readonly string[]
): string[] {
  if (scope.kind === "all") return [...allClasses];
  if (scope.kind === "none") return [];

  const names = new Set<string>();
  scope.assignments.forEach((assignment) => {
    assignment.classes.forEach((entry) => names.add(entry.className));
    classTeacherClassesOf(assignment).forEach((name) => names.add(name));
  });
  return allClasses.filter((className) => names.has(className));
}

export function scopedSections(
  scope: AccessScope,
  className: string,
  allSections: readonly string[]
): string[] {
  if (scope.kind === "all") return [...allSections];
  if (scope.kind === "none") return [];

  return allSections.filter((section) =>
    scope.assignments.some(
      (assignment) =>
        assignment.section === section &&
        (assignment.classes.some((entry) => entry.className === className) ||
          classTeacherClassesOf(assignment).includes(className))
    )
  );
}

export function subjectAccess(
  scope: AccessScope,
  className: string,
  section: string,
  subjectName: string
): SubjectAccess {
  if (scope.kind === "all") return "edit";
  if (isClassTeacherOf(scope, className, section)) return "edit";
  if (scope.kind === "none") return "none";

  const assignment = scope.assignments.find((item) => item.section === section);
  if (!assignment) return "none";

  const teaches = assignment.classes.some(
    (entry) =>
      entry.className === className && entry.subjects.includes(subjectName)
  );
  if (teaches) return "edit";

  if (classTeacherClassesOf(assignment).includes(className)) {
    return "view";
  }
  return "none";
}

export function isClassTeacherOf(
  scope: AccessScope,
  className: string,
  section: string
): boolean {
  if (scope.kind !== "assigned") return false;
  const name = String(className ?? "").trim();
  return scope.assignments.some(
    (a) => a.section === section && classTeacherClassesOf(a).includes(name)
  );
}
/** The (class, section) pairs a teacher is class teacher of. */
export function classTeacherSections(
  scope: AccessScope
): { className: string; section: string }[] {
  if (scope.kind !== "assigned") return [];
  // One pair per class: a teacher may look after several classes of a section.
  return scope.assignments.flatMap((a) =>
    classTeacherClassesOf(a).map((className) => ({ className, section: a.section }))
  );
}
