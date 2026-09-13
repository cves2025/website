import * as XLSX from "xlsx";

// Flexible column mapping - accepts many common header spellings.
// Every alias is normalized (lowercase, non-alphanumeric removed) then matched.
type FieldKey =
  | "firstName"
  | "lastName"
  | "enrollment"
  | "className"
  | "section"
  | "fatherName"
  | "motherName"
  | "dob"
  | "phone"
  | "email"
  | "address";

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  firstName: [
    "firstname", "first name", "name", "student name", "studentname",
    "full name", "fullname", "student", "child name",
  ],
  lastName: ["lastname", "last name", "surname"],
  enrollment: [
    "enrollment", "enrollmentno", "enrollment number", "enrolmentno",
    "admno", "admission no", "admissionno", "rollno", "roll no",
    "formno", "regno", "registration no",
  ],
  className: ["class", "cls", "classname", "class name", "standard", "grade"],
  section: ["section", "sec", "div", "division"],
  fatherName: ["fathername", "father name", "father", "fathersname", "father's name"],
  motherName: ["mothername", "mother name", "mother", "mothersname", "mother's name"],
  dob: ["dateofbirth", "date of birth", "dob", "birthdate", "birth date"],
  phone: ["phone", "mobile", "mobile no", "mobile number", "contact", "contact no", "phone no", "phonenumber"],
  email: ["email", "emailid", "email id", "emailaddress", "mail"],
  address: ["address", "addr", "fulladdress", "full address", "permanent address"],
};

export interface StudentRow {
  firstName: string;
  lastName: string;
  enrollment: string;
  className: string;
  section: string;
  fatherName: string;
  motherName: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  id: string;
}

export interface StudentImportError {
  row: number;
  enrollment: string;
  name: string;
  message: string;
}

export interface StudentImportResult {
  students: StudentRow[];
  errors: StudentImportError[];
  headers: string[];
}

const normalizeKey = (key: string): string =>
  String(key).toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIAS_MAP: Record<string, FieldKey> = {};
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_MAP[normalizeKey(alias)] = field as FieldKey;
  }
}

export function mapHeaderToField(header: string): FieldKey | null {
  return ALIAS_MAP[normalizeKey(header)] || null;
}

/** Split a full name into first/last. */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Parse an Excel (.xlsx/.xls) or CSV file into normalized student rows.
 * Returns { students, errors, headers } where students are the valid rows.
 */
export async function parseStudentFile(file: File): Promise<StudentImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets.");
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (!rows.length) throw new Error("The file is empty - no data rows found.");

  const headers = Object.keys(rows[0]);
  const students: StudentRow[] = [];
  const errors: StudentImportError[] = [];
rows.forEach((row, index) => {
    const getValue = (field: FieldKey): string => {
      // find the header matching `field`
      const found = headers.find((h) => mapHeaderToField(h) === field);
      const raw = found !== undefined ? row[found] : "";
      const val = String(raw ?? "").trim();
      return val.toLowerCase() === "n/a" || val.toLowerCase() === "na" ? "" : val;
    };

    const nameValue = getValue("firstName");
    const { firstName, lastName } = splitName(nameValue);
    const lName = getValue("lastName") || lastName;
    const enrollment = getValue("enrollment");
    const className = getValue("className");

    const rowErrors: string[] = [];
    if (!nameValue) rowErrors.push("Name missing");
    if (!enrollment) rowErrors.push("Enrollment missing");
    if (!className) rowErrors.push("Class missing");

    if (rowErrors.length) {
      errors.push({ row: index + 2, enrollment: enrollment || "-", name: nameValue || "-", message: rowErrors.join(", ") });
      return;
    }

    students.push({
      firstName,
      lastName: lName,
      enrollment,
      className,
      section: getValue("section") || "A",
      fatherName: getValue("fatherName"),
      motherName: getValue("motherName"),
      dob: getValue("dob"),
      phone: getValue("phone"),
      email: getValue("email"),
      address: getValue("address"),
      id: Date.now() + Math.random().toString(36).slice(2, 8),
    });
  });

  return { students, errors, headers };
}

/** Generate a .csv template string with a few sample rows. */
export function studentCsvTemplate(): string {
  const header: string[][] = [
    ["Name", "Enrollment", "Class", "Section", "Father's Name", "Mother's Name", "DOB", "Phone", "Email", "Address"],
    ["Aarav Sharma", "1001", "5", "A", "Rajesh Sharma", "Sunita Sharma", "2016-05-10", "9876543210", "aarav@example.com", "Mahmoorganj, Varanasi"],
    ["Diya Verma", "1002", "5", "A", "Ramesh Verma", "Sita Verma", "2016-08-22", "9876543211", "diya@example.com", "Lanka, Varanasi"],
    [],
  ];
  return header.map((r) => r.join(",")).join("\n");
}

export function downloadCsvTemplate(): void {
  const blob = new Blob([studentCsvTemplate()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "students-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Merge rows into the local list keyed by enrollment (upsert). */
export function saveStudentsLocally(students: StudentRow[]): StudentRow[] {
  const list: StudentRow[] = JSON.parse(localStorage.getItem("cves_students") || "[]");
  const map = new Map(list.map((s) => [String(s.enrollment), s]));
  students.forEach((s) => map.set(String(s.enrollment), s));
  const merged = Array.from(map.values());
  localStorage.setItem("cves_students", JSON.stringify(merged));
  return merged;
}