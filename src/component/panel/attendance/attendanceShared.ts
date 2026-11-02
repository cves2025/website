import { CLASSES, CLASS_OPTIONS, SECTIONS } from "../../../constants";
import {
  classTeacherSections,
  type AccessScope,
} from "../../../permissions";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import type { AttendanceStatus } from "../../../utils/type";

export const STATUS_META: Record<
  AttendanceStatus,
  { label: string; active: string; text: string }
> = {
  P: {
    label: "Present",
    active: "bg-green-600 text-white border-green-600",
    text: "text-green-700",
  },
  A: {
    label: "Absent",
    active: "bg-red-600 text-white border-red-600",
    text: "text-red-700",
  },
  L: {
    label: "Leave",
    active: "bg-amber-500 text-white border-amber-500",
    text: "text-amber-700",
  },
};

export const STATUS_ORDER: AttendanceStatus[] = ["P", "A", "L"];

export interface SectionOption {
  className: string;
  section: string;
}

export const sectionValue = (option: SectionOption) =>
  `${option.className}|${option.section}`;

export const parseSectionValue = (value: string): SectionOption => {
  const [className = "", section = ""] = value.split("|");
  return { className, section };
};

export const sectionLabel = (option: SectionOption) =>
  `Class ${toOrdinalLabel(option.className)} - ${option.section}`;

/**
 * The sections a user works with on the attendance pages: every section for
 * the admin, only the class-teacher sections for a teacher.
 */
export function attendanceSections(scope: AccessScope): SectionOption[] {
  if (scope.kind === "all") {
    return CLASSES.flatMap((className) =>
      SECTIONS.map((section) => ({ className, section }))
    );
  }
  return classTeacherSections(scope);
}

/** Classes of the given sections, in CLASSES order. */
export const classesOf = (sections: SectionOption[]): string[] =>
  CLASSES.filter((className) =>
    sections.some((option) => option.className === className)
  );

/** Sections of one class among the given sections, in SECTIONS order. */
export const sectionsOf = (
  sections: SectionOption[],
  className: string
): string[] =>
  SECTIONS.filter((section) =>
    sections.some(
      (option) => option.className === className && option.section === section
    )
  );

/** Class dropdown options (from CLASS_OPTIONS) the user may pick. */
export const classOptionsOf = (sections: SectionOption[]) =>
  CLASS_OPTIONS.filter((option) =>
    sections.some((item) => item.className === option.value)
  );

/** Section dropdown options of a class: just "A", "B", "C". */
export const sectionOptionsOf = (sections: SectionOption[], className: string) =>
  sectionsOf(sections, className).map((section) => ({
    value: section,
    label: section,
  }));

/**
 * Class + section state of the attendance filters. Changing the class keeps
 * the section when that class has it, otherwise picks its first section.
 */
export function pickSection(
  sections: SectionOption[],
  className: string,
  section: string
): SectionOption {
  const available = sectionsOf(sections, className);
  return {
    className,
    section: available.includes(section) ? section : available[0] ?? "",
  };
}

export const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:bg-gray-100";

export const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
