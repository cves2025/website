import type { TeacherSectionAssignment } from "../utils/type";

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
    if (assignment.isClassTeacher && assignment.classTeacherOf) {
      names.add(assignment.classTeacherOf);
    }
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
          (assignment.isClassTeacher && assignment.classTeacherOf === className))
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

  if (assignment.isClassTeacher && assignment.classTeacherOf === className) {
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
  return scope.assignments.some(
    (a) =>
      a.isClassTeacher &&
      a.section === section &&
      String(a.classTeacherOf ?? "").trim() === String(className ?? "").trim()
  );
}