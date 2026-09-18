export const COLLECTION = {
  STUDENTS: "students",
  ENROLLMENTS: "enrollments",
  SUBJECTS: "subjects",
  EXAMS: "exams",
  EXAM_SCHEDULES: "examSchedules",
};

export const CLASSES: string[] = [
  "PG",
  "Nursery",
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
];

export const SECTIONS: string[] = ["A", "B", "C"];

/**
 * Legacy list from the first Exams-module draft. The exam templates now use
 * `CLASSES` (so they match the class names saved on students/subjects) and
 * render labels through `toOrdinalLabel`. Kept for backwards compatibility.
 */
export const EXAM_CLASSES: string[] = [
  "PG",
  "Nursery",
  "LKG",
  "UKG",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
];

/** Sections offered in the admission form. */
export const ADMISSION_SECTIONS: string[] = ["A", "B"];

export const EMAIL_PATTERN: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN: RegExp = /^[0-9+\-\s()]*$/;