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
