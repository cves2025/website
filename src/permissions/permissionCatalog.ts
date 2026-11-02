import { PERMISSIONS as P, Permission } from "./permissions";

export interface PermissionCatalogItem {
  permission: Permission;
  label: string;
  description: string;
}

export interface PermissionCatalogGroup {
  label: string;
  items: PermissionCatalogItem[];
}

/**
 * The permissions an admin can switch ON / OFF for teachers on the
 * Permissions page, grouped like the sidebar. Admin-only permissions
 * (TEACHER_BLOCKED_PERMISSIONS) are not listed, and neither is
 * RESULT_PUBLISH, which no screen uses yet.
 */
export const TEACHER_PERMISSION_GROUPS: PermissionCatalogGroup[] = [
  {
    label: "Account",
    items: [
      {
        permission: P.PROFILE_VIEW,
        label: "My Profile",
        description: "See their own profile (the details saved on Add Teacher).",
      },
    ],
  },
  {
    label: "School",
    items: [
      {
        permission: P.BANNER_MANAGE,
        label: "Home Banner",
        description: "Change the slides (photo and text) at the top of the Home page.",
      },
      {
        permission: P.NEWS_MANAGE,
        label: "News",
        description: "Add, edit, publish and delete the news on the Home page.",
      },
      {
        permission: P.GALLERY_MANAGE,
        label: "Gallery",
        description: "Upload, hide and delete the photos of the Gallery page.",
      },
      {
        permission: P.DOWNLOADS_MANAGE,
        label: "Downloads",
        description: "Upload, hide and delete the syllabus and time table PDFs.",
      },
    ],
  },
  {
    label: "Student",
    items: [
      {
        permission: P.STUDENT_READ,
        label: "Student List",
        description: "See the students of their own classes.",
      },
      {
        permission: P.STUDENT_FORM_VIEW,
        label: "View Admission Form",
        description:
          "Open and print the admission form of a student of their own classes.",
      },
      {
        permission: P.SUBJECT_MANAGE,
        label: "Subjects",
        description: "Add, edit and delete subjects of a class.",
      },
    ],
  },
  {
    label: "Teacher",
    items: [
      {
        permission: P.TEACHER_READ,
        label: "Teachers List",
        description: "See the list of all teachers.",
      },
    ],
  },
  {
    label: "ID Card",
    items: [
      {
        permission: P.IDCARD_STUDENT,
        label: "Student ID Cards",
        description: "Print the ID cards of students.",
      },
      {
        permission: P.IDCARD_TEACHER,
        label: "Teacher ID Cards",
        description: "Print the ID cards of teachers.",
      },
      {
        permission: P.IDCARD_STAFF,
        label: "Staff ID Cards",
        description: "Print the ID cards of the staff.",
      },
      {
        permission: P.IDCARD_ADMIN,
        label: "Admin ID Cards",
        description: "Print the ID cards of admins.",
      },
    ],
  },
  {
    label: "Exam",
    items: [
      {
        permission: P.ADMITCARD_VIEW,
        label: "Admit Card",
        description: "Open the Admit Card page and view admit cards.",
      },
      {
        permission: P.ADMITCARD_GENERATE,
        label: "Generate Admit Cards",
        description: "Edit exam schedules and generate admit cards.",
      },
      {
        permission: P.DESK_SLIP,
        label: "Desk Slip",
        description: "Print desk slips.",
      },
    ],
  },
  {
    label: "Marks & Result",
    items: [
      {
        permission: P.MARKS_ENTER,
        label: "Enter Marks",
        description: "Enter and edit the marks of their subjects.",
      },
      {
        permission: P.MARKS_VIEW,
        label: "View Marks",
        description: "See the marks that have been entered.",
      },
      {
        permission: P.CROSSLIST_VIEW,
        label: "Cross List",
        description: "Open the cross list of a class.",
      },
      {
        permission: P.RESULT_VIEW,
        label: "Result",
        description: "Open and print result cards.",
      },
    ],
  },
];

export const TEACHER_PERMISSION_ITEMS: PermissionCatalogItem[] =
  TEACHER_PERMISSION_GROUPS.flatMap((group) => group.items);

/** Every permission the page offers - saved as `known` with the defaults. */
export const TEACHER_CATALOG_PERMISSIONS: Permission[] =
  TEACHER_PERMISSION_ITEMS.map((item) => item.permission);

/**
 * The page's permissions before `known` was saved with the defaults. A
 * permission added to the catalog later is missing here, so a document saved
 * earlier falls back to that permission's built-in default.
 */
export const LEGACY_CATALOG_PERMISSIONS: Permission[] =
  TEACHER_CATALOG_PERMISSIONS.filter(
    (p) => p !== P.PROFILE_VIEW && p !== P.STUDENT_FORM_VIEW
  );
