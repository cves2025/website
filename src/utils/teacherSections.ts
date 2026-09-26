import { ADMISSION_SECTIONS, CLASSES } from "../constants";
import type {
  TeacherClassSubjects,
  TeacherSectionAssignment,
} from "./type";

/** Sections the teacher form works with (the sections of the school). */
export const TEACHER_SECTIONS: string[] = ADMISSION_SECTIONS;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<string[]>((list, item) => {
    const text = toText(item);
    if (text && !list.includes(text)) list.push(text);
    return list;
  }, []);
}

function classOrder(className: string): number {
  const index = CLASSES.indexOf(className);
  return index === -1 ? CLASSES.length : index;
}

export function toClassLabel(className: string): string {
  const text = className.trim();
  return /^\d+$/.test(text) ? `Class ${text}` : text;
}

export function formatSectionLabel(section: string): string {
  return section.trim() === "" ? "All Sections" : `Section ${section.trim()}`;
}

export function createEmptySectionAssignment(
  section: string
): TeacherSectionAssignment {
  return {
    section,
    isClassTeacher: false,
    classTeacherOf: "",
    classes: [],
  };
}

export function createEmptySectionAssignments(): TeacherSectionAssignment[] {
  return TEACHER_SECTIONS.map(createEmptySectionAssignment);
}

export function sortClassSubjects(
  entries: TeacherClassSubjects[]
): TeacherClassSubjects[] {
  const unique: TeacherClassSubjects[] = [];
  entries.forEach((entry) => {
    const className = entry.className.trim();
    if (!className || unique.some((item) => item.className === className)) return;
    unique.push({ className, subjects: entry.subjects });
  });
  return unique.sort((a, b) => classOrder(a.className) - classOrder(b.className));
}

export function mergeClassSubjects(
  classNames: string[],
  existing: TeacherClassSubjects[]
): TeacherClassSubjects[] {
  return sortClassSubjects(
    classNames.map(
      (className) =>
        existing.find((entry) => entry.className === className) ?? {
          className,
          subjects: [],
        }
    )
  );
}

export function normalizeSectionAssignments(
  value: unknown
): TeacherSectionAssignment[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item) => ({
      section: toText(item.section),
      isClassTeacher: item.isClassTeacher === true,
      classTeacherOf: toText(item.classTeacherOf),
      classes: sortClassSubjects(
        (Array.isArray(item.classes) ? item.classes : [])
          .filter(isRecord)
          .map((entry) => ({
            className: toText(entry.className),
            subjects: toStringList(entry.subjects),
          }))
          .filter((entry) => entry.className !== "")
      ),
    }))
    .filter((item) => item.section !== "");
}

/** Keeps one entry per `TEACHER_SECTIONS` value, in the tab order. */
export function toSectionTabs(value: unknown): TeacherSectionAssignment[] {
  const parsed = normalizeSectionAssignments(value);
  return TEACHER_SECTIONS.map(
    (section) =>
      parsed.find((item) => item.section === section) ??
      createEmptySectionAssignment(section)
  );
}

/** Reads the section-wise assignments of a teacher document. */
export function sectionAssignmentsFromDoc(
  data: Record<string, unknown>
): TeacherSectionAssignment[] {
  const stored = normalizeSectionAssignments(data.sectionAssignments);
  if (stored.length > 0) return stored;

  const legacyClasses = toStringList(data.assignedClasses);
  const legacyClassTeacher = data.isClassTeacher === true;
  if (legacyClasses.length === 0 && !legacyClassTeacher) return [];

  return [
    {
      section: "",
      isClassTeacher: legacyClassTeacher,
      classTeacherOf: toText(data.classTeacherOf),
      classes: legacyClasses.map((className) => ({ className, subjects: [] })),
    },
  ];
}

/**
 * Restores a teacher document into the fixed section tabs of the form. Records
 * saved before section-wise assignments existed carry no section, so their
 * classes are moved into the first section for the admin to review.
 */
export function toEditableSectionAssignments(data: Record<string, unknown>): {
  assignments: TeacherSectionAssignment[];
  movedFromLegacy: boolean;
} {
  const source = sectionAssignmentsFromDoc(data);
  const assignments = toSectionTabs(source);
  const legacy = source.find((item) => item.section === "");
  if (!legacy) return { assignments, movedFromLegacy: false };

  const primarySection = TEACHER_SECTIONS[0];
  return {
    assignments: assignments.map((item) =>
      item.section === primarySection
        ? {
            ...item,
            isClassTeacher: legacy.isClassTeacher,
            classTeacherOf: item.classTeacherOf || legacy.classTeacherOf,
            classes: sortClassSubjects([...legacy.classes, ...item.classes]),
          }
        : item
    ),
    movedFromLegacy: true,
  };
}

export function pruneSectionAssignments(
  list: TeacherSectionAssignment[]
): TeacherSectionAssignment[] {
  return list
    .filter((item) => item.isClassTeacher || item.classes.length > 0)
    .map((item) => ({ ...item, classes: sortClassSubjects(item.classes) }));
}

/** Mirror of the section-wise data, kept for readers of the older fields. */
export function toLegacyTeacherFields(
  list: TeacherSectionAssignment[]
): { assignedClasses: string[]; isClassTeacher: boolean; classTeacherOf: string } {
  const assignedClasses: string[] = [];
  list.forEach((item) =>
    item.classes.forEach((entry) => {
      if (!assignedClasses.includes(entry.className)) {
        assignedClasses.push(entry.className);
      }
    })
  );

  const classTeacherSection = list.find(
    (item) => item.isClassTeacher && item.classTeacherOf !== ""
  );

  return {
    assignedClasses: assignedClasses.sort((a, b) => classOrder(a) - classOrder(b)),
    isClassTeacher: Boolean(classTeacherSection),
    classTeacherOf: classTeacherSection ? classTeacherSection.classTeacherOf : "",
  };
}

export function formatClassSubjects(entries: TeacherClassSubjects[]): string {
  return sortClassSubjects(entries)
    .map((entry) =>
      entry.subjects.length > 0
        ? `${toClassLabel(entry.className)}: ${entry.subjects.join(", ")}`
        : toClassLabel(entry.className)
    )
    .join(" · ");
}

export function formatSectionSummary(
  assignment: TeacherSectionAssignment
): string {
  const parts: string[] = [];
  if (assignment.isClassTeacher) {
    parts.push(
      assignment.classTeacherOf
        ? `Class teacher of ${toClassLabel(assignment.classTeacherOf)}`
        : "Class teacher (class not selected)"
    );
  }
  if (assignment.classes.length > 0) {
    parts.push(`${assignment.classes.length} class(es) taught`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Nothing assigned yet";
}
