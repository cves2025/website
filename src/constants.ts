export const COLLECTION = {
  STUDENTS: "students",
  ENROLLMENTS: "enrollments",
  SUBJECTS: "subjects",
  EXAMS: "exams",
  EXAM_SCHEDULES: "examSchedules",
  EXAM_SHEETS: "examSheets",
  STAMP_SIGN: "stampSign",
  SETTINGS: "settings",
  USERS: "users",
  MARKS: "marks",
  PANEL_SETTINGS: "panelSettings",
  ATTENDANCE: "attendance",
  /** Daily attendance: one document per class + section + date. */
  DAILY_ATTENDANCE: "dailyAttendance",
  /** Holiday calendar of a session (weekly off + holidays), id = session. */
  HOLIDAY_CALENDAR: "holidayCalendar",
  ROLL_NUMBER: "rollNumber",
  /** School news shown on the Home page, managed from Settings > News. */
  NEWS: "news",
  /** Photos of the Gallery page, managed from Settings > Gallery. */
  GALLERY: "gallery",
  /** Syllabus / time table PDFs of the Downloads page (Settings > Downloads). */
  DOWNLOADS: "downloads",
};

export const PRE_DEFINED_DOC_ID = {
  SUGGESTED_REMARKS: "suggestedRemarks",
  /** School-wide teacher permission defaults (Permissions page). */
  ROLE_PERMISSIONS: "rolePermissions",
  /** Marks that the bundled gallery photos were imported into Firestore. */
  GALLERY_IMPORT: "galleryImport",
  /** Website photos (the school photo of Home / About), Settings > Gallery. */
  SITE_IMAGES: "siteImages",
  /** Highest Enrollment No. in use; the Add Student page suggests the next. */
  ENROLLMENT_COUNTER: "enrollmentCounter",
}

/** Document id inside COLLECTION.STAMP_SIGN that stores the Principal's
    signature and the school stamp image URLs. */
export const STAMP_SIGN_PRINCIPLE_DOC = "principle";
export const ADMIT_CARD_SETTINGS_DOC = "admitCard";
/** Document id inside COLLECTION.SETTINGS with the Home page banner slides. */
export const HOME_BANNER_SETTINGS_DOC = "homeBanner";

/** Field names of the "stampSign"/"principle" document. */
export const STAMP_SIGN_FIELDS = {
  PRINCIPAL_SIGN_URL: "principalSignUrl",
  PRINCIPLE_SIGN_WITH_STAMP: "principleSignWithStamp",
  SCHOOL_STAMP_URL: "schoolStampUrl",
} as const;

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

export const CLASS_OPTIONS = CLASSES.map((className) => ({
  value: className,
  label: className,
}));

/**
 * After updating a student, the admission form automatically opens the next
 * record in edit mode instead of going back to the Student List:
 *   1. the next student of the same class (sorted by first / last name), then
 *   2. the first student of the following class (in `CLASSES` order).
 * Set to `false` to keep the default behaviour (clear the form after saving).
 */
export const AUTO_NEXT_STUDENT_AFTER_UPDATE = true;

export const SECTIONS: string[] = ["A", "B", "C"];

export const TEACHER_DESIGNATIONS: string[] = [
  "Subject Teacher",
  "Class Teacher",
];

export const TEACHER_STATUS: string[] = ["Active", "Inactive"];

export const GENDER_OPTIONS: string[] = ["Male", "Female", "Other"];

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

// Routes
export const ADD_STUDENT_PATH = "/welcome/student/add";
/** View / print one student's admission form: `?id=<enrollmentId>`. */
export const VIEW_STUDENT_PATH = "/welcome/student/view";
/** School location and contact details shown on the Contact page. */
export const SCHOOL_CONTACT = {
  ADDRESS:
    "D-59/295A, near Galaxy Hospital, Nirala Nagar, Mahmoorganj, Varanasi, Uttar Pradesh 221010",
  PHONE: "09336576690",
  LAT: 25.306506678904515,
  LNG: 82.97486022881107,
};
