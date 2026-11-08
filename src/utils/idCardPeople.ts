/** People of the ID Card page as card data. Pure. */
import { format } from "date-fns";

import type { SectionStudent } from "../hooks/useSectionStudents";
import { toOrdinalLabel } from "./toOrdinalLabel";
import type { IdCardKind, IdCardPerson, TeacherRecord } from "./type";

export function studentCard(student: SectionStudent, className: string, section: string): IdCardPerson {
  return {
    id: student.studentId,
    kind: "student",
    name: student.studentName,
    photo: student.photo,
    code: student.admissionNo || student.studentId,
    values: {
      name: student.studentName,
      className: `${toOrdinalLabel(className)} - ${section}`,
      rollNumber: student.rollNumber ? String(student.rollNumber) : "",
      enrollment: student.admissionNo,
      fatherName: student.fatherName,
      phone: student.phone,
    },
  };
}

/** A teacher, staff member or admin (all are `users` documents). */
export function memberCard(member: TeacherRecord, kind: IdCardKind): IdCardPerson {
  const name = `${member.firstName} ${member.lastName}`.trim() || member.email;
  return {
    id: member.id,
    kind,
    name,
    photo: member.photo,
    code: member.employeeId || member.id,
    values: {
      name,
      jobRole: member.jobRole,
      employeeId: member.employeeId,
      phone: member.phone,
      email: member.email,
      joiningDate: member.joiningDate ? format(member.joiningDate, "dd MMM yyyy") : "",
    },
  };
}

/** Shown in the preview while no one is on the list yet. */
export function sampleCard(kind: IdCardKind): IdCardPerson {
  const values: Record<string, string> =
    kind === "student"
      ? {
          name: "Student Name",
          className: "5th - A",
          rollNumber: "12",
          enrollment: "1234",
          fatherName: "Father's Name",
          phone: "9876543210",
        }
      : {
          name: "Full Name",
          jobRole: kind === "admin" ? "Admin" : kind === "staff" ? "Accountant" : "Teacher",
          employeeId: "T001",
          phone: "9876543210",
          email: "name@example.com",
          joiningDate: "01 Apr 2026",
        };
  return { id: "sample", kind, name: values.name, photo: "", code: values.enrollment ?? values.employeeId, values };
}
