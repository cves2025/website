import type {
  ClassFee,
  FeeHead,
  FeeSettings,
  IdCardDesign,
  IdCardElement,
  IdCardTemplatePalette,
  IdCardTemplatePlan,
  IdCardKind,
  IdCardOrientation,
  IdCardOverflow,
  IdCardValidity,
  PaymentMode,
  ReceiptCopies,
  ReceiptDesign,
  ReceiptPaper,
  ReceiptPrintSettings,
  TcFields,
  TcRow,
  TcSettings,
  TcStatus,
} from "./utils/type";

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
  /** Staff attendance settings, one document: STAFF_ATTENDANCE_SETTINGS_DOC (admin). */
  STAFF_ATTENDANCE_SETTINGS: "staffAttendanceSettings",
  /** One person's day, id = {date}_{uid}. Written only by the server. */
  STAFF_ATTENDANCE: "staffAttendance",
  /** Refused check-ins, admin edits, phone resets. Written only by the server. */
  STAFF_ATTENDANCE_LOG: "staffAttendanceLog",
  /** The phone a teacher's attendance is linked to, id = uid. Server only. */
  STAFF_DEVICES: "staffDevices",
  /** Check-in / out selfies, id = {date}_{uid}_{in|out}. Server only. */
  STAFF_SELFIES: "staffSelfies",
  /** Leave requests of teachers / staff. Server only. */
  STAFF_LEAVES: "staffLeaves",
  ROLL_NUMBER: "rollNumber",
  /** School news shown on the Home page, managed from Settings > News. */
  NEWS: "news",
  /** Photos of the Gallery page, managed from Settings > Gallery. */
  GALLERY: "gallery",
  /** Syllabus / time table PDFs of the Downloads page (Settings > Downloads). */
  DOWNLOADS: "downloads",
  /** Fee heads and amounts of a session, id = session (Fees > Fee Structure). */
  FEE_STRUCTURES: "feeStructures",
  /** School-wide fee settings, one document: FEE_SETTINGS_DOC. */
  FEE_SETTINGS: "feeSettings",
  /** One fee account per student and session, id = {session}_{studentId}. */
  FEE_ACCOUNTS: "feeAccounts",
  /** One document per fee receipt, id = {session}_{serial}. */
  FEE_PAYMENTS: "feePayments",
  /** Last receipt serial of a session, id = session. */
  FEE_COUNTERS: "feeCounters",
  /**
   * Marks entry progress of one exam (dashboard card), id = {session}_{examId}:
   * per class + section the students, the subject columns and how many
   * students have marks in each. Kept up to date by saveStudentMarks.
   */
  MARKS_PROGRESS: "marksProgress",
  /** Transfer certificates: one document per TC (draft / issued / cancelled). */
  TRANSFER_CERTIFICATES: "transferCertificates",
  /** Public copy of an issued TC (few fields) for the QR verify page. */
  TC_VERIFY: "tcVerify",
  /** One per used Book No. + Sr. No. (`<book>_<sr>`), so a number is never used twice. */
  TC_NUMBERS: "tcNumbers",
};

/**
 * Add Student asks "Is this right?" when the Enrollment No. is more than this
 * many numbers after the highest in use (catches a typo like 5000 for 1156).
 */
export const ENROLLMENT_JUMP_WARNING = 10;

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
/** Document id inside COLLECTION.SETTINGS with the ID card size, templates and fields. */
export const ID_CARD_SETTINGS_DOC = "idCard";

/** The ID Card page; `?tab=` picks students / teachers / staff / admin. */
export const ID_CARD_PATH = "/welcome/id-card";

/** Standard ID card (CR80, an ATM card): 85.6 x 54 mm, landscape. */
export const ID_CARD_STANDARD_SIZE = { width: 85.6, height: 54 };
/** Smallest / largest side an admin can set, in mm. */
export const ID_CARD_SIZE_LIMITS = { min: 30, max: 200 };

export const ID_CARD_KIND_OPTIONS: { value: IdCardKind; label: string; title: string }[] = [
  { value: "student", label: "Students", title: "STUDENT ID CARD" },
  { value: "teacher", label: "Teachers", title: "TEACHER ID CARD" },
  { value: "staff", label: "Staff", title: "STAFF ID CARD" },
  { value: "admin", label: "Admin", title: "ADMIN ID CARD" },
];

export const ID_CARD_DESIGN_OPTIONS: { value: IdCardDesign; label: string; hint: string }[] = [
  { value: "classic", label: "Classic", hint: "Blue band, photo frame" },
  { value: "modern", label: "Modern", hint: "Green side strip, round photo" },
  { value: "premium", label: "Premium", hint: "Dark navy with gold" },
  { value: "vibrant", label: "Vibrant", hint: "Colourful gradient" },
];

export const ID_CARD_ORIENTATION_OPTIONS: { value: IdCardOrientation; label: string }[] = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

export const ID_CARD_ALIGN_OPTIONS: { value: IdCardElement["align"]; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export const ID_CARD_VALIGN_OPTIONS: { value: IdCardElement["valign"]; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "middle", label: "Middle" },
  { value: "bottom", label: "Bottom" },
];

export const ID_CARD_FIT_OPTIONS: { value: IdCardElement["fit"]; label: string }[] = [
  { value: "cover", label: "Fill the box" },
  { value: "contain", label: "Show all" },
];

/** Fonts the card designer offers (Inter and Noto Serif are loaded in index.html). */
export const ID_CARD_FONT_OPTIONS = [
  { value: "Inter, system-ui, sans-serif", label: "Inter" },
  { value: "'Noto Serif', Georgia, serif", label: "Noto Serif" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', Times, serif", label: "Times New Roman" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "Cancun, sans-serif", label: "Cancun (school name)" },
];

/** What the designer's Add menu puts on the card. */
export const ID_CARD_ADD_OPTIONS: { value: IdCardElement["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "photo", label: "Photo" },
  { value: "logo", label: "School logo" },
  { value: "qr", label: "QR code" },
  { value: "sign", label: "Principal's sign" },
  { value: "stamp", label: "School stamp" },
  { value: "rect", label: "Rectangle" },
  { value: "ellipse", label: "Circle" },
];

/** Quick colours of the designer's text toolbar (the school's first). */
export const ID_CARD_TEXT_SWATCHES = [
  { value: "#15803d", label: "School green" },
  { value: "#3730a3", label: "School indigo" },
  { value: "#dc2626", label: "School red" },
  { value: "#db2777", label: "School pink" },
  { value: "#111827", label: "Black" },
  { value: "#ffffff", label: "White" },
  { value: "#d4af37", label: "Gold" },
];

/** Resolution of exported ID card images (print quality). */
export const ID_CARD_EXPORT_DPI = 300;

/** Steps of the designer's zoom. */
export const ID_CARD_ZOOM_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6];
/** Designer: arrow keys move by this (mm), with Shift by the larger step. */
export const ID_CARD_NUDGE_MM = { small: 0.5, large: 2 };
/** Designer: how many changes Undo can go back. */
export const ID_CARD_HISTORY_LIMIT = 80;

export const ID_CARD_OVERFLOW_OPTIONS: { value: IdCardOverflow; label: string }[] = [
  { value: "fit", label: "Shrink to fit" },
  { value: "wrap", label: "Wrap" },
  { value: "cut", label: "Cut with ..." },
];

export const ID_CARD_VALIDITY_OPTIONS: { value: IdCardValidity["mode"]; label: string }[] = [
  { value: "session", label: "End of session (31 March)" },
  { value: "date", label: "A date" },
  { value: "none", label: "Not shown" },
];

/** Fields a tab can show, in their default order: [key, label]. */
export const ID_CARD_FIELD_KEYS: Record<IdCardKind, [string, string][]> = {
  student: [
    ["name", "Name"],
    ["className", "Class"],
    ["rollNumber", "Roll No."],
    ["enrollment", "Enrollment No."],
    ["fatherName", "Father's Name"],
    ["phone", "Phone"],
    ["validTill", "Valid Till"],
  ],
  teacher: [
    ["name", "Name"],
    ["jobRole", "Role"],
    ["employeeId", "Employee ID"],
    ["phone", "Phone"],
    ["email", "Email"],
    ["joiningDate", "Joining Date"],
    ["validTill", "Valid Till"],
  ],
  staff: [
    ["name", "Name"],
    ["jobRole", "Role"],
    ["employeeId", "Employee ID"],
    ["phone", "Phone"],
    ["email", "Email"],
    ["joiningDate", "Joining Date"],
    ["validTill", "Valid Till"],
  ],
  admin: [
    ["name", "Name"],
    ["jobRole", "Role"],
    ["employeeId", "Employee ID"],
    ["phone", "Phone"],
    ["email", "Email"],
    ["joiningDate", "Joining Date"],
    ["validTill", "Valid Till"],
  ],
};

/** Colours of the designer's starting templates. */
export const ID_CARD_TEMPLATE_PALETTES: Record<IdCardDesign, IdCardTemplatePalette> = {
  classic: {
    card: "#ffffff", card2: "", header: "#1e3a8a", header2: "#2563eb", headerText: "#ffffff", subText: "#dbeafe",
    chip: "#ffffff", chipText: "#1e3a8a", text: "#111827", label: "#1e3a8a", accent: "#1e40af", band: "#1e3a8a", band2: "#2563eb",
  },
  modern: {
    card: "#ffffff", card2: "", header: "#16a34a", header2: "#34d399", headerText: "#166534", subText: "#4b5563",
    chip: "#16a34a", chipText: "#ffffff", text: "#111827", label: "#15803d", accent: "#16a34a", band: "#16a34a", band2: "#34d399",
  },
  premium: {
    card: "#0f172a", card2: "#1e293b", header: "#0f172a", header2: "", headerText: "#d4af37", subText: "#cbd5e1",
    chip: "#d4af37", chipText: "#0f172a", text: "#f8fafc", label: "#d4af37", accent: "#d4af37", band: "#b8860b", band2: "#f5d76e",
  },
  vibrant: {
    card: "#ffffff", card2: "", header: "#ec4899", header2: "#f59e0b", headerText: "#ffffff", subText: "#fff1f2",
    chip: "#ffffff", chipText: "#be185d", text: "#111827", label: "#be185d", accent: "#ec4899", band: "#ec4899", band2: "#f59e0b",
  },
};

/** Where each part of a starting template sits, in mm on a standard card: [x, y, w, h]. */
export const ID_CARD_TEMPLATE_PLANS: Record<IdCardOrientation, Record<IdCardDesign, IdCardTemplatePlan>> = {
  horizontal: {
    classic: {
      header: [0, 0, 85.6, 13.5], headerRadius: 0, logo: [2.5, 2.2, 9, 9], school: [13, 1.8, 70, 4.6],
      address: [13, 6.4, 70, 3], chip: [13, 9.8, 27, 3], textAlign: "left", photo: [3, 16.5, 17, 21], photoRadius: 0.8,
      name: [23, 16.5, 44, 5], fieldsAt: [23, 22.5, 44, 3.6], fieldStep: 4, qr: [70, 16.5, 12.5, 12.5], sign: [67, 36, 16, 5.5],
      band: [0, 51.2, 85.6, 2.8],
    },
    modern: {
      header: [6, 15.4, 77, 0.35], headerRadius: 0, logo: [9, 2.8, 8.5, 8.5], school: [19, 2.6, 64, 4.6],
      address: [19, 7.2, 64, 3], chip: [19, 10.6, 24, 3], textAlign: "left", photo: [62, 18, 19.5, 19.5], photoRadius: 9.75,
      name: [9, 18, 50, 5], fieldsAt: [9, 24, 50, 3.6], fieldStep: 4, qr: [69.5, 39, 12, 12], sign: [46, 43.5, 16, 5],
      band: [6, 51.5, 79.6, 2.5], strip: [0, 0, 6, 54],
    },
    premium: {
      header: [3, 15.3, 79.6, 0.35], headerRadius: 0, logo: [3, 2.8, 8.5, 8.5], school: [13.5, 2.6, 69, 4.6],
      address: [13.5, 7.2, 69, 3], chip: [13.5, 10.6, 27, 3], textAlign: "left", photo: [3, 18, 17, 21], photoRadius: 2,
      name: [23, 18, 43, 5], fieldsAt: [23, 24, 43, 3.6], fieldStep: 4, qr: [69.5, 18, 12.5, 12.5], sign: [66.5, 36.5, 16, 5.5],
      band: [0, 51.2, 85.6, 2.8],
    },
    vibrant: {
      header: [-4, -8, 93.6, 22], headerRadius: 7, logo: [3, 2.2, 9, 9], school: [13.5, 1.8, 69, 4.6],
      address: [13.5, 6.4, 69, 3], chip: [13.5, 9.8, 27, 3], textAlign: "left", photo: [3, 17, 17, 21], photoRadius: 2.5,
      name: [23, 17, 44, 5], fieldsAt: [23, 23, 44, 3.6], fieldStep: 4, qr: [70, 17, 12.5, 12.5], sign: [66.5, 36, 16, 5.5],
      band: [0, 51.2, 85.6, 2.8],
    },
  },
  vertical: {
    classic: {
      header: [0, 0, 54, 22], headerRadius: 0, logo: [22.5, 2, 9, 9], school: [2, 11.5, 50, 4],
      address: [2, 15.4, 50, 2.6], chip: [14.5, 18.2, 25, 3], textAlign: "center", photo: [17, 24.5, 20, 24], photoRadius: 0.8,
      name: [3, 50, 48, 5], fieldsAt: [3, 55.8, 48, 3.2], fieldStep: 3.4, qr: [3, 72.5, 10.5, 10.5], sign: [35, 73, 16, 5.5],
      band: [0, 83.6, 54, 2],
    },
    modern: {
      header: [0, 0, 54, 3], headerRadius: 0, logo: [3, 5, 8.5, 8.5], school: [12.5, 5, 39, 4],
      address: [12.5, 9, 39, 2.8], chip: [12.5, 12.2, 22, 2.8], textAlign: "center", photo: [16, 18, 22, 22], photoRadius: 11,
      name: [3, 42, 48, 5], fieldsAt: [3, 47.8, 48, 3.2], fieldStep: 3.4, qr: [3, 70.5, 12, 12], sign: [35, 72.5, 16, 5.5],
      band: [0, 83.6, 54, 2],
    },
    premium: {
      header: [3, 22, 48, 0.35], headerRadius: 0, logo: [22.5, 2, 9, 9], school: [2, 11.5, 50, 4],
      address: [2, 15.4, 50, 2.6], chip: [14.5, 18.2, 25, 3], textAlign: "center", photo: [17, 25, 20, 24], photoRadius: 2,
      name: [3, 50.5, 48, 5], fieldsAt: [3, 56.2, 48, 3.2], fieldStep: 3.4, qr: [3, 72.5, 10.5, 10.5], sign: [35, 73, 16, 5.5],
      band: [0, 83.6, 54, 2],
    },
    vibrant: {
      header: [-4, -8, 62, 31], headerRadius: 9, logo: [22.5, 2, 9, 9], school: [2, 11.5, 50, 4],
      address: [2, 15.4, 50, 2.6], chip: [14.5, 18.2, 25, 3], textAlign: "center", photo: [17, 25.5, 20, 24], photoRadius: 2.5,
      name: [3, 51, 48, 5], fieldsAt: [3, 56.8, 48, 3.2], fieldStep: 3.4, qr: [3, 72.5, 10.5, 10.5], sign: [35, 73, 16, 5.5],
      band: [0, 83.6, 54, 2],
    },
  },
};

/** Fields every tab has besides its own (the card's title, e.g. "STUDENT ID CARD"). */
export const ID_CARD_COMMON_FIELDS: [string, string][] = [["cardTitle", "Card title"]];

/** Fields a template leaves off the card (they can be added in the designer). */
export const ID_CARD_HIDDEN_BY_DEFAULT = new Set(["email", "joiningDate"]);
/** Document id inside COLLECTION.FEE_SETTINGS (due day, late fee, receipt prefix). */
export const FEE_SETTINGS_DOC = "general";

/** Document id inside COLLECTION.FEE_SETTINGS with the receipt print layout. */
export const RECEIPT_PRINT_DOC = "receiptPrint";

/** Until the admin changes it: the classic design, both copies on one A4 page. */
export const DEFAULT_RECEIPT_PRINT: ReceiptPrintSettings = {
  design: "classic",
  paper: "a4",
  copies: "both",
};

export const RECEIPT_DESIGN_OPTIONS: { value: ReceiptDesign; label: string; hint: string }[] = [
  { value: "classic", label: "Classic", hint: "Bordered, serif letterhead" },
  { value: "minimal", label: "Minimal", hint: "Clean lines, big total" },
  { value: "balance", label: "Balance", hint: "Shows paid earlier and balance due" },
  { value: "band", label: "Band + Stamp", hint: "Dark band and a PAID stamp" },
];

export const RECEIPT_PAPER_OPTIONS: { value: ReceiptPaper; label: string; hint: string }[] = [
  { value: "a4", label: "Full A4 page", hint: "Copies one above the other, cut line in the middle" },
  { value: "half", label: "Half A4 sheets", hint: "Each copy on the top half of its own A4 page, for A4 sheets cut in half" },
];

export const RECEIPT_COPIES_OPTIONS: { value: ReceiptCopies; label: string }[] = [
  { value: "both", label: "Both copies" },
  { value: "student", label: "Student copy only" },
  { value: "office", label: "Office copy only" },
];

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

/**
 * `users.role` of a staff member (accountant, driver ...). Staff have no
 * login account; they are kept for the ID cards and are left out of every
 * teacher feature (attendance, class teacher, subjects, permissions).
 */
export const STAFF_ROLE = "staff";

/** Who a record on the Add Teacher page is. */
export const PERSON_TYPE_OPTIONS = [
  { value: "teacher", label: "Teacher" },
  { value: STAFF_ROLE, label: "Staff" },
];

/**
 * Job Role: the work a person does, shown on the ID card. Separate from a
 * teacher's Designation (Subject / Class Teacher), which drives the class
 * teacher rules.
 */
export const TEACHER_JOB_ROLES: string[] = [
  "Teacher",
  "Principal",
  "Vice Principal",
  "Coordinator",
  "Sports Teacher",
  "Music Teacher",
  "Computer Teacher",
];

export const STAFF_JOB_ROLES: string[] = [
  "Accountant",
  "Clerk",
  "Receptionist",
  "Librarian",
  "Lab Assistant",
  "Peon",
  "Driver",
  "Conductor",
  "Security Guard",
  "Cleaner",
  "Gardener",
  "Other",
];

/** An admin picks theirs on My Profile. */
export const ADMIN_JOB_ROLES: string[] = [
  "Admin",
  "Director",
  "Manager",
  "Principal",
  "Chairman",
  "Secretary",
];

/** Job Role of a teacher saved before Job Roles existed. */
export const DEFAULT_TEACHER_JOB_ROLE = "Teacher";
export const DEFAULT_ADMIN_JOB_ROLE = "Admin";

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

export const FEE_STRUCTURE_PATH = "/welcome/fees/structure";

export const FEE_COLLECT_PATH = "/welcome/fees/collect";
/**
 * Idle lock of the admin panel: after this long without mouse / keyboard /
 * touch activity the screen locks until the password is entered again.
 */
export const IDLE_LOCK_MS = 5 * 60 * 1000;
/** Wrong passwords on the lock screen before the user is logged out. */
export const IDLE_LOCK_MAX_ATTEMPTS = 5;
/** Browser keys (shared by the tabs): last activity time, and the locked user. */
export const IDLE_ACTIVITY_KEY = "cves:lastActivity";
export const IDLE_LOCKED_KEY = "cves:lockedUid";

/** Document id inside COLLECTION.PANEL_SETTINGS: unlock with password or PIN (Settings > Lock & PIN). */
export const LOCK_SETTINGS_DOC = "lockSettings";
export type UnlockMethod = "password" | "pin";
export const UNLOCK_METHOD_OPTIONS: { value: UnlockMethod; label: string; hint: string }[] = [
  { value: "password", label: "Password", hint: "account password" },
  { value: "pin", label: "PIN", hint: "4 digits, set by the admin" },
];
/** Shortest new account password on Settings > Lock & PIN. */
export const ACCOUNT_PASSWORD_MIN = 8;
/** Unlock PIN: exactly 4 digits. The server checks it (PIN_PATTERN / easy PINs there too). */
export const PIN_LENGTH = 4;
export const PIN_PATTERN = /^\d{4}$/;
/** PINs refused as too easy (same list as the server). */
export const WEAK_PINS = [
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  "1234", "4321", "0123", "3210", "1212", "1122", "6789", "9876", "2580", "1010",
];

/** Marks entry page; `?session=&exam=&class=&section=` opens that sheet. */
export const MARKS_PATH = "/welcome/marks";

export const FEE_DUES_REPORT_PATH = "/welcome/fees/dues";

export const FEE_COLLECTION_REPORT_PATH = "/welcome/fees/collection";

/** Printable receipt; the payment id goes in `?id=`. */
export const FEE_RECEIPT_PATH = "/welcome/fees/receipt";

/** School location and contact details shown on the Contact page. */
export const SCHOOL_CONTACT = {
  ADDRESS:
    "D-59/295A, near Galaxy Hospital, Nirala Nagar, Mahmoorganj, Varanasi, Uttar Pradesh 221010",
  PHONE: "09336576690",
  LAT: 25.306506678904515,
  LNG: 82.97486022881107,
};

/* ------------------------------------------------------------------ fees -- */

/** Months of a session in order, April -> March (1 = January). */
export const SESSION_MONTHS: number[] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export const MONTH_LABELS: string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Month dropdown options in session order. */
export const SESSION_MONTH_OPTIONS = SESSION_MONTHS.map((month) => ({
  value: String(month),
  label: MONTH_LABELS[month - 1],
}));

export const EMPTY_CLASS_FEE: ClassFee = { admission: 0, monthly: 0 };

export const DEFAULT_FEE_SETTINGS: FeeSettings = {
  dueDay: 10,
  lateFeeEnabled: false,
  lateFeeAmount: 0,
  receiptPrefix: "CVES",
};

/** Periods of the dashboard's Fee Collection card (the week runs Monday to Sunday). */
export const FEE_PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const;

export type FeePeriod = (typeof FEE_PERIOD_OPTIONS)[number]["value"];

/** How long the dashboard fee card takes to grow out of (and back into) its icon. */
export const FEE_PANEL_MS = 350;

/** Background of the dashboard banner and of the top bar on the dashboard. */
export const DASHBOARD_GRADIENT =
  "bg-[linear-gradient(100deg,#a8196f_0%,#b52a3f_50%,#c2410c_100%)]";

/** Classes for a button in the school-colour gradient (e.g. a Modal's submitClassName). */
export const CVES_BUTTON = "bg-cves shadow-sm transition hover:shadow-md hover:brightness-110";

/**
 * Extra classes for a button that turns to the school-colour gradient
 * (bg-cves) on hover, with white text and no border (not when disabled).
 */
export const CVES_ON_HOVER =
  "hover:border-transparent hover:bg-cves hover:text-white hover:shadow-md disabled:hover:bg-none";

/** Number input for a rupee amount inside a table cell (fee pages). */
export const AMOUNT_INPUT_CLASS =
  "w-full max-w-[140px] rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50";

/** Name of a fee head on the account and the receipt. */
export const FEE_HEAD_LABELS: Record<FeeHead, string> = {
  previousDues: "Previous Dues",
  admission: "Admission Fee",
  monthly: "Monthly Fee",
  transport: "Transport Fee",
  exam: "Exam Fee",
  extra: "Extra Charge",
  lateFee: "Late Fee",
};

export const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Cheque", "Bank Transfer"];

export const PAYMENT_MODE_OPTIONS = PAYMENT_MODES.map((mode) => ({ value: mode, label: mode }));

/** Letterhead of the fee receipt. */
export const SCHOOL_NAME = "CHILDREN'S VALLEY ENGLISH SCHOOL";

/** School name inside messages (e.g. the WhatsApp fee reminder). */
export const SCHOOL_DISPLAY_NAME = "Children's Valley English School";

/* ---------------------------------------------- Transfer Certificate -- */

/** Document id inside COLLECTION.SETTINGS: TC letterhead, book no., last Sr. No. */
export const TC_SETTINGS_DOC = "transferCertificate";

/** TC page: class-wise students with their TC status (class "all" = TC register). */
export const TC_PATH = "/welcome/student/tc";
/** One TC: `?session=&enrollment=<enrollmentId>` and `&id=<tcId>` for a saved one. */
export const TC_EDIT_PATH = "/welcome/student/tc/edit";
export const TC_SETTINGS_PATH = "/welcome/student/tc/settings";

/** Sessions shown year-wise on the dashboard TC card (newest first). */
export const TC_DASHBOARD_SESSIONS = 5;

/** Public page the TC's QR code opens: `/verify-tc/<tcId>` (no login). */
export const TC_VERIFY_PATH = "/verify-tc";

/** Class filter value of the TC page that lists every TC of the session. */
export const TC_REGISTER_CLASS = "all";

export const DEFAULT_TC_NOTE =
  "नोट : यदि यह स्थानान्तरण प्रमाण पत्र इंचार्ज-प्रधानाचार्य द्वारा हस्ताक्षरित हो तो प्रबंधक, अध्यक्ष, विद्यालय प्रबंधन समिति द्वारा प्रतिहस्ताक्षरित अवश्य कराएं।\nNote: If this transfer certificate is signed by the Incharge-Principal, then be sure to be countersigned by the Manager SMC.";

export const DEFAULT_TC_SETTINGS: TcSettings = {
  schoolName: SCHOOL_NAME,
  affiliationText: "",
  affiliationNo: "",
  schoolCode: "",
  udiseCode: "",
  address: "Mahmoorganj, Varanasi",
  email: "",
  website: "",
  phone: SCHOOL_CONTACT.PHONE,
  note: DEFAULT_TC_NOTE,
  showQr: true,
  principalSign: true,
  preparedBy: "",
  checkedBy: "",
  schoolCategory: "Private",
};

/** Book No. of a TC: letters, digits or "-" (it is part of the TC No. and of `tcNumbers` ids). */
export const TC_BOOK_NO_PATTERN = /^[A-Za-z0-9-]{1,10}$/;
/** TC No.: letters, digits, "/" or "-" (no "_": the lock id turns "/" into "_"). */
export const TC_NO_PATTERN = /^[A-Za-z0-9/-]{1,30}$/;

/** The only address line printed under the school name on a TC. */
export const TC_SCHOOL_ADDRESS = "Mahmoorganj, Varanasi";

/** Colours of the school name on the TC, word by word (the cves gradient colours). */
export const TC_NAME_COLORS = ["#009746", "#393186", "#e31e25", "#e7087e"];

/** Order of the subject types when one subject has more than one, e.g. ENGLISH (WRITTEN + ORAL). */
export const TC_SUBJECT_TYPE_ORDER = ["Written", "Oral", "Theory", "Practical", "Scholastic"];

export const TC_STATUS_META: Record<TcStatus | "none", { label: string; className: string }> = {
  none: { label: "Not issued", className: "bg-gray-100 text-gray-600" },
  draft: { label: "Draft", className: "bg-amber-100 text-amber-800" },
  issued: { label: "Issued", className: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700" },
};

/**
 * The 21 numbered rows of the printed TC (Hindi / English), in order. Row 2
 * has a second line (mother), rows 6 and 8 a second value (DOB in words,
 * admission class).
 */
export const TC_ROWS: TcRow[] = [
  { hi: "विद्यार्थी का नाम", en: "Name of Pupil", field: "studentName" },
  {
    hi: "(A). पिता का नाम",
    en: "Father's Name",
    field: "fatherName",
    sub: { hi: "(B). माता का नाम", en: "Mother's Name", field: "motherName" },
  },
  { hi: "पता", en: "Address", field: "address" },
  { hi: "राष्ट्रीयता", en: "Nationality", field: "nationality" },
  {
    hi: "क्या विद्यार्थी अनु० जा०/ज० जा०/पिछड़ा वर्ग से सम्बन्धित है?",
    en: "Whether the Pupil belongs to SC/ST/OBC Category?",
    field: "category",
  },
  {
    hi: "प्रवेश पुस्तिका के अनुसार जन्म तिथि",
    en: "Date of birth according to admission register",
    field: "dob",
    extra: "dobInWords",
  },
  {
    hi: "पिछली कक्षा जिसमे विद्यार्थी अध्ययनरत था",
    en: "Class in which the pupil last studied",
    field: "lastClass",
  },
  {
    hi: "विद्यालय में प्रवेश लेने की तिथि और कक्षा",
    en: "Date of admission in the school with class",
    field: "admissionDate",
    extra: "admissionClass",
  },
  { hi: "पठित विषय", en: "Subjects studied", field: "subjects" },
  {
    hi: "पिछले विद्यालय / बोर्ड / वार्षिक परीक्षा का परिणाम",
    en: "Result of last taken School/Board/Annual Examination",
    field: "lastResult",
  },
  {
    hi: "क्या उच्च कक्षा में पदोन्नति के योग्य है?",
    en: "Whether qualified for promotion to the next higher class?",
    field: "promotion",
  },
  {
    hi: "क्या विद्यार्थी ने विद्यालय के सभी देय राशि का भुगतान कर दिया है?",
    en: "Whether the pupil has paid all dues to the school?",
    field: "duesPaid",
  },
  {
    hi: "क्या विद्यार्थी को कोई शुल्क रियायत प्रदान की गयी थी?",
    en: "Whether the student was given any fee concession?",
    field: "feeConcession",
  },
  {
    hi: "क्या विद्यार्थी एन०सी०सी० कैडेट/स्काउट है?",
    en: "Whether the pupil is NCC Cadet/Boy Scout/Girl Guide?",
    field: "nccCadet",
  },
  {
    hi: "विद्यालय से विद्यार्थी के नाम काटे जाने की तिथि",
    en: "Date on which pupil's name is struck off rolls of the school",
    field: "struckOffDate",
  },
  { hi: "विद्यालय छोड़ने का कारण", en: "Reason for leaving the school", field: "reason" },
  {
    hi: "अंतिम तिथि तक उपस्थितियों की कुल संख्या",
    en: "No. of attendance up to date",
    field: "attendance",
  },
  { hi: "विद्यालय दिवसों की कुल संख्या", en: "No. of school days", field: "schoolDays" },
  { hi: "सामान्य आचरण", en: "General Conduct", field: "conduct" },
  {
    hi: "क्या विद्यालय सरकारी/अल्पसंख्यक/स्वतंत्र श्रेणी में आता है?",
    en: "Whether the school is recognized under Govt./Minority/Independent Category?",
    field: "schoolCategory",
  },
  {
    hi: "प्रमाण पत्र जारी करने की तिथि",
    en: "Date of issue of certificate",
    field: "issueDate",
  },
];

/** TC fields typed as dates ("yyyy-MM-dd", printed dd-MM-yyyy). */
/** Year range of the TC date pickers (years before / after today). */
export const TC_DATE_YEARS_BACK = 40;
export const TC_DATE_YEARS_AHEAD = 2;

export const TC_DATE_FIELDS = new Set<keyof TcFields>([
  "dob",
  "admissionDate",
  "struckOffDate",
  "issueDate",
]);

/** One-click answers under a TC field (the field stays free text). */
export const TC_SUGGESTIONS: Partial<Record<keyof TcFields, string[]>> = {
  category: ["General", "OBC", "SC", "ST"],
  lastResult: ["PASSED", "FAILED", "APPEARED", "RESULT AWAITED", "N/A"],
  promotion: ["Yes", "No", "N/A"],
  duesPaid: ["Yes", "No"],
  feeConcession: ["Yes", "No"],
  nccCadet: ["N/A", "Yes", "No"],
  reason: [
    "Pass Out",
    "Parent's Transfer",
    "Shifting to another place",
    "Parent's wish",
    "Admission in another school",
    "Health reasons",
  ],
  conduct: ["Excellent", "Very Good", "Good", "Satisfactory"],
  schoolCategory: ["Private", "Independent", "Government", "Minority"],
};

/* ------------------------------------------------- Download Excel (students) */

/** One column of the student Excel: `key` is a field of StudentExportRow, `width` in characters. */
export interface StudentExportColumn {
  key: string;
  label: string;
  width: number;
}

export interface StudentExportGroup {
  key: string;
  label: string;
  columns: StudentExportColumn[];
}

/** Columns offered on Download Excel, in their order in the file. */
export const STUDENT_EXPORT_GROUPS: StudentExportGroup[] = [
  {
    key: "basic",
    label: "Basic",
    columns: [
      { key: "enrollment", label: "Enrollment No.", width: 14 },
      { key: "rollNo", label: "Roll No.", width: 8 },
      { key: "studentName", label: "Student Name", width: 26 },
      { key: "className", label: "Class", width: 8 },
      { key: "section", label: "Section", width: 8 },
      { key: "fatherName", label: "Father's Name", width: 24 },
      { key: "motherName", label: "Mother's Name", width: 24 },
      { key: "dob", label: "Date of Birth", width: 12 },
      { key: "gender", label: "Gender", width: 8 },
      { key: "phone", label: "Mobile", width: 13 },
      { key: "status", label: "Status", width: 18 },
    ],
  },
  {
    key: "contact",
    label: "Contact / Address",
    columns: [
      { key: "phone2", label: "Mobile 2", width: 13 },
      { key: "email", label: "E-mail", width: 26 },
      { key: "address", label: "Address", width: 34 },
      { key: "city", label: "City", width: 14 },
      { key: "state", label: "State", width: 14 },
      { key: "pin", label: "PIN", width: 8 },
      { key: "permanentAddress", label: "Permanent Address", width: 34 },
    ],
  },
  {
    key: "other",
    label: "Other details",
    columns: [
      { key: "category", label: "Category", width: 10 },
      { key: "nationality", label: "Nationality", width: 12 },
      { key: "pen", label: "P.E.N.", width: 14 },
      { key: "fatherOccupation", label: "Father's Occupation", width: 20 },
      { key: "admissionDate", label: "Admission Date", width: 14 },
    ],
  },
  {
    key: "previous",
    label: "Previous school",
    columns: [
      { key: "lastSchoolName", label: "Previous School", width: 28 },
      { key: "lastSchoolAddress", label: "Previous School Address", width: 30 },
      { key: "passingYear", label: "Passing Year", width: 10 },
      { key: "previousClass", label: "Previous Class", width: 12 },
      { key: "previousMarks", label: "Marks (Obtained/Max)", width: 16 },
      { key: "previousPercentage", label: "Percentage", width: 10 },
    ],
  },
  {
    key: "health",
    label: "Health",
    columns: [
      { key: "height", label: "Height", width: 8 },
      { key: "weight", label: "Weight", width: 8 },
      { key: "bloodGroup", label: "Blood Group", width: 10 },
      { key: "allergy", label: "Allergy", width: 24 },
      { key: "disease", label: "Disease", width: 20 },
    ],
  },
];

/** Columns ticked the first time: the Basic group. */
export const STUDENT_EXPORT_DEFAULT_COLUMNS: Record<string, string[]> = Object.fromEntries(
  STUDENT_EXPORT_GROUPS.map((group) => [
    group.key,
    group.key === "basic" ? group.columns.map((column) => column.key) : [],
  ])
);

export const STUDENT_EXPORT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "left", label: "Left / TC" },
  { value: "all", label: "Both" },
];

export const STUDENT_EXPORT_LAYOUT_OPTIONS = [
  { value: "single", label: "One sheet" },
  { value: "perClass", label: "One sheet per class" },
];

/** localStorage key: the last chosen columns / status / layout (this browser only). */
export const STUDENT_EXPORT_STORAGE_KEY = "cves.studentExport.v1";

/** Firestore `in` queries take at most 30 values. */
export const FIRESTORE_IN_LIMIT = 30;

/* ------------------------------------------------------ staff attendance -- */

/** The one settings document of staff attendance. */
export const STAFF_ATTENDANCE_SETTINGS_DOC = "general";

/** Check-in radius choices (metres around the school point). */
export const STAFF_RADIUS_OPTIONS = [50, 100, 150, 200, 300, 500].map((value) => ({
  value: String(value),
  label: `${value} m`,
}));

/** "X late = 1 half day" choices; 0 = off. */
export const STAFF_LATE_TO_HALF_DAY_OPTIONS = [
  { value: "0", label: "Off" },
  ...[2, 3, 4, 5].map((value) => ({ value: String(value), label: `${value} lates = 1 half day` })),
];

/** Label and colours of a staff attendance status (and "not marked"). */
export const STAFF_STATUS_META = {
  present: { label: "Present", chip: "bg-green-50 text-green-700 border-green-200" },
  late: { label: "Late", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  halfDay: { label: "Half Day", chip: "bg-orange-50 text-orange-700 border-orange-200" },
  absent: { label: "Absent", chip: "bg-red-50 text-red-700 border-red-200" },
  leave: { label: "Leave", chip: "bg-navy-soft text-navy border-navy/20" },
  none: { label: "Not marked", chip: "bg-gray-50 text-gray-600 border-gray-200" },
} as const;

/** What the admin can mark by hand. */
export const STAFF_MARK_STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "halfDay", label: "Half Day" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "Leave" },
];

/** Why a check-in was refused (codes of server/router/staffAttendanceHandler.js). */
export const STAFF_REFUSED_LABELS: Record<string, string> = {
  MOCK_LOCATION: "Fake GPS",
  OUTSIDE: "Outside school",
  WIFI: "Not on school Wi-Fi",
  DEVICE: "Another phone",
  ROOTED: "Rooted phone",
  EMULATOR: "Emulator",
};

/** Label and colours of a leave request status. */
export const STAFF_LEAVE_STATUS_META = {
  pending: { label: "Waiting", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  approved: { label: "Approved", chip: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected", chip: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", chip: "bg-gray-50 text-gray-600 border-gray-200" },
} as const;

/** Leave list filter. */
export const STAFF_LEAVE_FILTER_OPTIONS = [
  { value: "pending", label: "Waiting" },
  { value: "cancelRequested", label: "Cancel requests" },
  { value: "approved", label: "Approved" },
  { value: "all", label: "All" },
];

/** Codes of the monthly staff register (cell colours on the page). */
export const STAFF_REGISTER_CODES = {
  P: { label: "Present", cell: "bg-green-50 text-green-700" },
  L: { label: "Late", cell: "bg-amber-50 text-amber-800" },
  HD: { label: "Half Day", cell: "bg-orange-50 text-orange-700" },
  A: { label: "Absent", cell: "bg-red-50 text-red-700" },
  LV: { label: "Leave", cell: "bg-navy-soft text-navy" },
  H: { label: "Holiday / off", cell: "bg-gray-100 text-gray-400" },
  "": { label: "", cell: "" },
} as const;

/** Full-screen page of the office QR (staff check-in), outside the panel so the idle lock does not cover it. */
export const OFFICE_QR_PATH = "/staff-qr";

/** How many notifications the bell lists (newest first). */
export const NOTIFICATIONS_SHOWN = 30;

/** Periods of the refused check-ins list (Staff Attendance). */
export const STAFF_LOG_PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Dates" },
] as const;

export type StaffLogPeriod = (typeof STAFF_LOG_PERIODS)[number]["value"];

/** Late after (HH:mm) offered first when teachers are called during a holiday. */
export const STAFF_DUTY_LATE_AFTER = "09:00";

/** Most refused check-ins read for one period (newest first). */
export const STAFF_LOG_LIMIT = 300;
