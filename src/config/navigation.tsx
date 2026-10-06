import { ReactElement } from "react";
import { Permission, canAccessPath } from "../permissions";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaAddressCard,
  FaClipboardList,
} from "react-icons/fa";

export const BRAND = {
  green: "#1E9E5C",
  blue: "#3763E0",
  red: "#DC3D42",
  pink: "#D6408F",
};

export type MenuItem =
  | {
      label: string;
      icon: ReactElement;
      accent: string;
      subLinks: { label: string; path: string; end?: boolean }[];
    }
  | { label: string; icon: ReactElement; accent: string; path: string; end?: boolean };

export const MENU: MenuItem[] = [
  {
    label: "Student",
    icon: <FaUserGraduate />,
    accent: BRAND.green,
    subLinks: [
      { label: "Add Student", path: "/welcome/student/add" },
      { label: "Student List", path: "/welcome/student/list" },
      { label: "Subject", path: "/welcome/student/subject" },
    ],
  },
  {
    label: "Teacher",
    icon: <FaChalkboardTeacher />,
    accent: BRAND.blue,
    subLinks: [
      { label: "Add Teacher", path: "/welcome/teacher/add" },
      { label: "Teachers List", path: "/welcome/teacher/list" },
    ],
  },
  {
    label: "ID Card",
    icon: <FaAddressCard />,
    accent: BRAND.pink,
    subLinks: [
      { label: "Students", path: "/welcome/id-card/students" },
      { label: "Teachers", path: "/welcome/id-card/teachers" },
      { label: "Staff", path: "/welcome/id-card/staff" },
      { label: "Admin", path: "/welcome/id-card/admin" },
    ],
  },
  {
    label: "Exam",
    icon: <FaClipboardList />,
    accent: BRAND.red,
    subLinks: [
      { label: "Exam", path: "/welcome/exam/list" },
      { label: "Admit Card", path: "/welcome/admit-card", end: true },
      { label: "Marks", path: "/welcome/marks" },
      { label: "Cross List", path: "/welcome/cross-list" },
      { label: "Result", path: "/welcome/result" },
      { label: "Exam Settings", path: "/welcome/exam-settings" },
    ],
  },
];

export function filterMenu(
  menu: MenuItem[],
  permissions: readonly Permission[]
): MenuItem[] {
  return menu.flatMap((item): MenuItem[] => {
    if ("subLinks" in item) {
      const subLinks = item.subLinks.filter((link) =>
        canAccessPath(link.path, permissions)
      );
      return subLinks.length > 0 ? [{ ...item, subLinks }] : [];
    }
    return canAccessPath(item.path, permissions) ? [item] : [];
  });
}

export function groupOfPath(menu: MenuItem[], pathname: string): string {
  for (const item of menu) {
    if (!("subLinks" in item)) continue;
    const match = item.subLinks.some(
      (link) => pathname === link.path || pathname.startsWith(`${link.path}/`)
    );
    if (match) return item.label;
  }
  return "";
}