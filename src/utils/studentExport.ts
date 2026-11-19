/**
 * Download Excel of the students (Student List -> Download Excel).
 * Reads the enrollments of the chosen session (only the class + section
 * pairs the user may see), their master `students` documents (30 per query)
 * and the roll numbers, then writes one sheet or one sheet per class.
 * Mobile / Enrollment No. / PIN are written as text, so Excel keeps them as typed.
 */
import {
  collection,
  documentId,
  getDocs,
  query,
  Timestamp,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import * as XLSX from "xlsx";

import { CLASSES, COLLECTION, FIRESTORE_IN_LIMIT, type StudentExportColumn } from "../constants";
import { db } from "../firebase/config";
import { loadRollNumbers } from "./rollNumbers";
import { buildQuerySpecs, pairKey, type ClassSectionPair, type EnrollmentQuerySpec } from "./studentScope";
import { toOrdinalLabel } from "./toOrdinalLabel";

export type StudentExportStatus = "active" | "left" | "all";
export type StudentExportLayout = "single" | "perClass";

/** One student of the file: column key -> text. */
export type StudentExportRow = Record<string, string>;

export interface StudentExportFilter {
  session: string;
  /** Empty = every class the user may see. */
  classes: string[];
  /** "" = every section. */
  section: string;
  status: StudentExportStatus;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";

/** "2014-03-09" -> "09-03-2014"; anything else as it is. */
const dayText = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
};

const timestampDay = (value: unknown): string => {
  if (!(value instanceof Timestamp)) return "";
  const date = value.toDate();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
};

const joinText = (...parts: string[]) => parts.filter(Boolean).join(", ");

/** The queries for the filter: the user's own class + section pairs only (pairs null = admin). */
function querySpecs(filter: StudentExportFilter, pairs: ClassSectionPair[] | null): EnrollmentQuerySpec[] {
  // Admin, every class: one query for the session; the section is checked in memory.
  if (pairs === null && filter.classes.length === 0) return [{ className: "", section: "" }];
  const classes = filter.classes.length
    ? filter.classes
    : [...new Set((pairs ?? []).map((pair) => pair.className))];
  return classes.flatMap((className) => buildQuerySpecs(pairs, className, filter.section));
}

async function loadEnrollments(session: string, specs: EnrollmentQuerySpec[]) {
  const snapshots = await Promise.all(
    specs.map((spec) => {
      const constraints: QueryConstraint[] = [where("academicYear", "==", session)];
      if (spec.className) constraints.push(where("className", "==", spec.className));
      if (spec.section) constraints.push(where("section", "==", spec.section));
      return getDocs(query(collection(db, COLLECTION.ENROLLMENTS), ...constraints));
    })
  );
  const byId = new Map<string, DocumentData>();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((item) => byId.set(item.id, item.data())));
  return [...byId.values()];
}

/** Master `students` documents by id, 30 ids per query. */
async function loadStudentDocs(ids: string[]): Promise<Map<string, DocumentData>> {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += FIRESTORE_IN_LIMIT) {
    chunks.push(ids.slice(index, index + FIRESTORE_IN_LIMIT));
  }
  const snapshots = await Promise.all(
    chunks.map((chunk) => getDocs(query(collection(db, COLLECTION.STUDENTS), where(documentId(), "in", chunk))))
  );
  const byId = new Map<string, DocumentData>();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((item) => byId.set(item.id, item.data())));
  return byId;
}

function statusText(enrollment: DocumentData): string {
  if (enrollment.isDeleted !== true) return "Active";
  const tcNo = text(enrollment.tcNo);
  return enrollment.leftReason === "tc" || tcNo ? `Left (TC${tcNo ? ` ${tcNo}` : ""})` : "Left";
}

function toExportRow(enrollment: DocumentData, student: DocumentData, rollNo: number | undefined): StudentExportRow {
  const exam = (student.previousQualifyingExam ?? {}) as DocumentData;
  const health = (student.physicalStatus ?? {}) as DocumentData;
  const obtained = text(exam.marksObtained);
  const max = text(exam.maximumMarks);
  return {
    enrollment: text(enrollment.enrollment) || text(student.enrollment),
    rollNo: rollNo ? String(rollNo) : "",
    studentName: text(student.fullName) || text(enrollment.studentName),
    className: text(enrollment.className),
    classLabel: toOrdinalLabel(text(enrollment.className)),
    section: text(enrollment.section),
    fatherName: text(student.fatherName) || text(enrollment.fatherName),
    motherName: text(student.motherName),
    dob: dayText(text(student.dob)),
    gender: text(student.gender),
    phone: text(student.phone) || text(enrollment.phone),
    status: statusText(enrollment),
    phone2: text(student.phone2),
    email: text(student.email),
    address: text(student.address),
    city: text(student.city),
    state: text(student.state),
    pin: text(student.pin),
    permanentAddress: joinText(
      text(student.permanentAddress),
      text(student.permanentCity),
      text(student.permanentState),
      text(student.permanentPin)
    ),
    category: text(student.category),
    nationality: text(student.nationality),
    pen: text(student.penOfStudent),
    fatherOccupation: text(student.fatherOccupation),
    admissionDate: timestampDay(student.createdAt),
    lastSchoolName: text(student.lastSchoolName),
    lastSchoolAddress: text(student.lastSchoolAddress),
    passingYear: text(student.passingYear),
    previousClass: text(exam.previousClass),
    previousMarks: obtained || max ? `${obtained}/${max}` : "",
    previousPercentage: text(exam.percentage),
    height: text(health.height),
    weight: text(health.weight),
    bloodGroup: text(health.bloodGroup),
    allergy: joinText(text(health.allergyMedicine), text(health.allergyOther)),
    disease: text(health.disease),
  };
}

const classIndex = (className: string) => {
  const index = CLASSES.indexOf(className);
  return index < 0 ? CLASSES.length : index;
};

/** Class order of the school, then section, roll no., name. */
function compareRows(a: StudentExportRow, b: StudentExportRow): number {
  return (
    classIndex(a.className) - classIndex(b.className) ||
    a.section.localeCompare(b.section) ||
    (Number(a.rollNo) || Number.MAX_SAFE_INTEGER) - (Number(b.rollNo) || Number.MAX_SAFE_INTEGER) ||
    a.studentName.localeCompare(b.studentName)
  );
}

/**
 * The students of the filter that the user may see, sorted class-wise.
 * `pairs` = the user's class + section pairs (null = admin, every class).
 */
export async function loadStudentsForExport(
  filter: StudentExportFilter,
  pairs: ClassSectionPair[] | null
): Promise<StudentExportRow[]> {
  const allowed = pairs ? new Set(pairs.map((pair) => pairKey(pair.className, pair.section))) : null;
  const wantedClasses = new Set(filter.classes);
  const enrollments = (await loadEnrollments(filter.session, querySpecs(filter, pairs))).filter((item) => {
    const className = text(item.className);
    const section = text(item.section);
    if (wantedClasses.size && !wantedClasses.has(className)) return false;
    if (filter.section && section !== filter.section) return false;
    if (allowed && !allowed.has(pairKey(className, section))) return false;
    const left = item.isDeleted === true;
    return filter.status === "all" || (filter.status === "left" ? left : !left);
  });
  if (enrollments.length === 0) return [];

  const studentIds = [...new Set(enrollments.map((item) => text(item.studentId)).filter(Boolean))];
  const [students, rollNumbers] = await Promise.all([
    loadStudentDocs(studentIds),
    loadRollNumbers(
      filter.session,
      enrollments.map((item) => text(item.className))
    ),
  ]);

  return enrollments
    .map((item) => {
      const studentId = text(item.studentId);
      return toExportRow(item, students.get(studentId) ?? {}, rollNumbers.get(studentId));
    })
    .sort(compareRows);
}

/** Excel sheet names: at most 31 characters, none of : \ / ? * [ ]. */
const sheetName = (value: string) => value.replace(/[:\\/?*[\]]/g, "-").slice(0, 31) || "Students";

function sheetOf(title: string, rows: StudentExportRow[], columns: StudentExportColumn[]) {
  const header = ["S.No.", ...columns.map((column) => column.label)];
  const body = rows.map((row, index) => [
    index + 1,
    ...columns.map((column) => (column.key === "className" ? row.classLabel : row[column.key] ?? "")),
  ]);
  // Every value except S.No. is a string, so Excel keeps mobile numbers and leading zeros as typed.
  const sheet = XLSX.utils.aoa_to_sheet([[title], [], header, ...body]);
  sheet["!cols"] = [{ wch: 6 }, ...columns.map((column) => ({ wch: column.width }))];
  // Filter buttons on the header row (row 3).
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2 + body.length, c: header.length - 1 } }),
  };
  return sheet;
}

/** Students_2026-27_All-classes.xlsx: one sheet, or one sheet per class. */
export function exportStudentsExcel(
  rows: StudentExportRow[],
  columns: StudentExportColumn[],
  options: { session: string; classLabel: string; layout: StudentExportLayout }
): void {
  const { session, classLabel, layout } = options;
  const workbook = XLSX.utils.book_new();

  if (layout === "perClass") {
    const byClass = new Map<string, StudentExportRow[]>();
    rows.forEach((row) => byClass.set(row.className, [...(byClass.get(row.className) ?? []), row]));
    byClass.forEach((classRows, className) => {
      const label = toOrdinalLabel(className);
      XLSX.utils.book_append_sheet(
        workbook,
        sheetOf(`Students - ${session} - Class ${label}`, classRows, columns),
        sheetName(`Class ${label}`)
      );
    });
  } else {
    XLSX.utils.book_append_sheet(workbook, sheetOf(`Students - ${session} - ${classLabel}`, rows, columns), "Students");
  }

  XLSX.writeFile(workbook, `Students_${session}_${classLabel.replace(/\s+/g, "-")}.xlsx`);
}
