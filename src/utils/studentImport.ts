import * as XLSX from "xlsx";
import type { PhysicalStatus, PreviousQualifyingExam } from "./type";
import { EMAIL_PATTERN, PHONE_PATTERN, SECTIONS } from "../constants";
import { normalizeClassName } from "./normalizeClassName";

export type FieldKey =
  | "firstName"
  | "lastName"
  | "fullName"
  | "enrollment"
  | "className"
  | "section"
  | "academicYear"
  | "sessionStart"
  | "sessionEnd"
  | "fatherName"
  | "motherName"
  | "fatherOccupation"
  | "gender"
  | "category"
  | "nationality"
  | "dob"
  | "dobDay"
  | "dobMonth"
  | "dobYear"
  | "phone"
  | "phone2"
  | "email"
  | "address"
  | "correspondenceName"
  | "city"
  | "state"
  | "pin"
  | "permanentAddress"
  | "permanentCity"
  | "permanentState"
  | "permanentPin"
  | "penOfStudent"
  | "lastSchoolName"
  | "lastSchoolAddress"
  | "passingYear"
  | "maxMarks"
  | "previousClass"
  | "marksObtained"
  | "percentage"
  | "weight"
  | "height"
  | "bloodGroup"
  | "allergyMedicine"
  | "allergyOther"
  | "disease"
  | "otherInformation";

/** Flexible header spellings - every alias is normalized before matching. */
const FIELD_ALIASES: Record<FieldKey, string[]> = {
  firstName: ["firstname", "first name", "fname"],
  lastName: ["lastname", "last name", "lname", "surname", "sirname"],
  fullName: [
    "student_name",
    "name",
    "student name",
    "student's name",
    "students name",
    "studentname",
    "full name",
    "fullname",
    "student",
    "child name",
    "candidate name",
    "name of student",
    "name of the student",
    "student full name",
    "students full name",
    "student's full name",
    "name of child",
    "name of the child",
    "name of pupil",
    "pupil name",
  ],
  enrollment: [
    "enrollment",
    "enrollmentno",
    "enrollment number",
    "enrolmentno",
    "admission no",
    "admissionno",
    "adm no",
    "admno",
    "admission number",
    "admission_number",
    "rollno",
    "roll number",
    "registration no",
    "reg no",
    "regno",
    "form no",
    "formno",
    "scholar no",
    "scholar number",
    "student id",
    "student code",
    "school admission no",
  ],
  className: [
    "class",
    "cls",
    "classname",
    "class name",
    "standard",
    "grade",
    "std",
    "present class",
    "current class",
    "class of admission",
    "admission class",
    "class studying",
    "studying class",
  ],
  section: [
    "section",
    "sec",
    "division",
    "div",
    "class section",
    "classsection",
    "class sec",
    "class div",
    "class section no",
  ],
  academicYear: [
    "academic year",
    "academicyear",
    "session",
    "academic session",
    "school year",
    "admission year",
    "session year",
  ],
  sessionStart: [
    "session start",
    "sessionstart",
    "academic year start",
    "session from",
    "session from year",
    "from session",
  ],
  sessionEnd: [
    "session end",
    "sessionend",
    "academic year end",
    "session to",
    "session to year",
    "to session",
  ],
  fatherName: [
    "fathername",
    "father name",
    "father",
    "fathersname",
    "father_name",
    "father's name",
    "fathers name",
    "guardian name",
    "guardianname",
  ],
  motherName: [
    "mothername",
    "mother_name",
    "mother name",
    "mother",
    "mothersname",
    "mother's name",
    "mothers name",
    "mother_contact_no",
  ],
  fatherOccupation: [
    "father occupation",
    "fathers occupation",
    "father's occupation",
    "fatheroccupation",
    "occupation",
  ],
  gender: ["gender", "sex"],
  category: ["category", "caste", "cast", "community"],
  nationality: ["nationality", "citizenship"],
  dob: [
    "dob",
    "date of birth",
    "dateofbirth",
    "birth date",
    "birthdate",
    "birthday",
    "date",
  ],
  dobDay: [
    "dob day",
    "dobday",
    "date of birth day",
    "birth day",
    "birthday day",
    "day",
  ],
  dobMonth: [
    "dob month",
    "dobmonth",
    "date of birth month",
    "birth month",
    "birthday month",
    "month",
  ],
  dobYear: [
    "dob year",
    "dobyear",
    "date of birth year",
    "birth year",
    "birthday year",
    "year",
  ],
  phone: [
    "phone",
    "phoneno",
    "phone number",
    "phone no",
    "mobile",
    "mobile no",
    "mobileno",
    "mobile number",
    "contact",
    "contact no",
    "contactno",
    "contact number",
    "telephone",
    "tel",
    "primary_contact_no",
  ],
  phone2: [
    "phone2",
    "alternate phone",
    "alternate mobile",
    "alternate contact",
    "second phone",
    "secondary phone",
    "mobile 2",
    "other phone",
    "parents phone",
    "parent phone",
  ],
  email: [
    "email",
    "emailid",
    "email id",
    "emailaddress",
    "email address",
    "mail",
    "e mail",
  ],
  address: [
    "address",
    "addr",
    "full address",
    "fulladdress",
    "correspondence address",
    "mailing address",
  ],
  correspondenceName: [
    "correspondence name",
    "correspondencename",
    "name on address",
    "address name",
  ],
  city: ["city", "town", "village"],
  state: ["state", "province", "region"],
  pin: [
    "pin",
    "pincode",
    "pin code",
    "pinno",
    "pin no",
    "postal code",
    "zip",
    "zipcode",
  ],
  permanentAddress: [
    "permanent address",
    "permanentaddress",
    "perm address",
    "home_address",
  ],
  permanentCity: ["permanent city", "permanentcity", "perm city"],
  permanentState: ["permanent state", "permanentstate", "perm state"],
  permanentPin: [
    "permanent pin",
    "permanent pin code",
    "permanent pincode",
    "permanentpin",
    "permpin",
  ],
  penOfStudent: [
    "pen",
    "pen of student",
    "penofstudent",
    "pen no",
    "pen number",
  ],
  lastSchoolName: [
    "last school name",
    "lastschoolname",
    "previous school name",
    "previousschoolname",
    "school name",
    "last school",
    "previous school",
  ],
  lastSchoolAddress: [
    "last school address",
    "lastschooladdress",
    "previous school address",
    "previousschooladdress",
    "school address",
  ],
  passingYear: [
    "passing year",
    "passingyear",
    "year of passing",
    "passed year",
    "pass year",
  ],
  maxMarks: [
    "maximum marks",
    "maximummarks",
    "max marks",
    "maxmarks",
    "total marks",
    "maximummark",
  ],
  previousClass: [
    "previous class",
    "previousclass",
    "last class",
    "lastclass",
    "previous std",
    "class passed",
  ],
  marksObtained: [
    "marks obtained",
    "marksobtained",
    "obtained marks",
    "marks scored",
    "scored marks",
    "marks",
  ],
  percentage: ["percentage", "percent", "percentage obtained", "percent marks"],
  weight: ["weight", "weight in kg", "weightinkg", "weight kg", "body weight"],
  height: ["height", "height in cm", "heightincm", "height cm"],
  bloodGroup: ["blood group", "bloodgroup", "blood", "blood type"],
  allergyMedicine: [
    "allergy medicine",
    "allergymedicine",
    "allergy from medicine",
    "allergy from any medicine",
    "medicine allergy",
    "drug allergy",
  ],
  allergyOther: [
    "allergy other",
    "allergyother",
    "allergy from other",
    "any other allergy",
    "other allergy",
  ],
  disease: [
    "disease",
    "any disease",
    "anydisease",
    "illness",
    "medical condition",
  ],
  otherInformation: [
    "other information",
    "otherinformation",
    "any other information",
    "any other info",
    "additional information",
    "remarks",
    "notes",
  ],
};

export interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  firstNameLower: string;
  lastNameLower: string;
  enrollment: string;
  className: string;
  section: string;
  academicYear: string;
  sessionStart: string;
  sessionEnd: string;
  fatherName: string;
  motherName: string;
  fatherOccupation: string;
  gender: string;
  category: string;
  nationality: string;
  dob: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  phone: string;
  phone2: string;
  email: string;
  address: string;
  correspondenceName: string;
  city: string;
  state: string;
  pin: string;
  permanentAddress: string;
  permanentCity: string;
  permanentState: string;
  permanentPin: string;
  penOfStudent: string;
  lastSchoolName: string;
  lastSchoolAddress: string;
  passingYear: string;
  previousQualifyingExam: PreviousQualifyingExam;
  physicalStatus: PhysicalStatus;
  studentPhoto: string;
  motherPhoto: string;
  fatherPhoto: string;
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
  /** Required fields with no matching column (or acceptable alias) in the file. */
  missingRequiredColumns: string[];
}

/** Mirrors page1RequiredFields in AddStudent.tsx (the form's required fields). */
export const REQUIRED_STUDENT_FIELDS: ReadonlyArray<{
  key: FieldKey;
  label: string;
}> = [
  { key: "fullName", label: "Student's Name" },
  { key: "enrollment", label: "Enrollment" },
  { key: "className", label: "Class" },
  { key: "sessionStart", label: "Session / Academic Year" },
  { key: "sessionEnd", label: "Session / Academic Year" },
  // { key: "motherName", label: "Mother's Name" },
  // { key: "fatherName", label: "Father's Name" },
  // { key: "gender", label: "Gender" },
  // { key: "category", label: "Category" },
  // { key: "nationality", label: "Nationality" },
  //   { key: "dobYear", label: "Date of Birth" },
  // { key: "phone", label: "Phone" },
];

const normalizeKey = (key: string): string =>
  String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const ALIAS_MAP: Record<string, FieldKey> = {};
const ALIAS_PRIORITY: Record<string, number> = {};
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  aliases.forEach((alias, i) => {
    const normalized = normalizeKey(alias);
    if (!normalized) return;
    if (ALIAS_MAP[normalized] === undefined || i < ALIAS_PRIORITY[normalized]) {
      ALIAS_MAP[normalized] = field as FieldKey;
      ALIAS_PRIORITY[normalized] = i;
    }
  });
}

/**
 * Priority of a column matched by the loose word rules below. Exact alias
 * matches are always preferred, so a real "Phone" column is never overruled by
 * a stray "Father's Mobile No" column.
 */
const WORD_RULE_PRIORITY = 1000;

interface HeaderWordRule {
  field: FieldKey;
  /** Every token must appear somewhere in the header. */
  all?: string[];
  /** At least one of these tokens must appear in the header. */
  any?: string[];
  /** None of these tokens may appear in the header. */
  none?: string[];
}

/**
 * Fallback matcher for the header spellings the alias table does not know
 * verbatim ("Name of Student", "Class & Sec", "Student's Name (In English)",
 * "Mobile No.", headers wrapped over several lines, ...). The header is reduced
 * to letters/digits and every rule is tested in order, so the specific rules
 * sit above the generic ones.
 */
const HEADER_WORD_RULES: HeaderWordRule[] = [
  // ---- school of the previous year ---------------------------------------
  { field: "lastSchoolAddress", all: ["school"], any: ["address", "addr"] },
  { field: "lastSchoolName", all: ["school"], any: ["name"] },
  // ---- family -------------------------------------------------------------
  { field: "fatherName", all: ["name"], any: ["father", "guardian", "parent"] },
  { field: "motherName", all: ["name"], any: ["mother"] },
  { field: "correspondenceName", all: ["name"], any: ["correspondence"] },
  { field: "fatherOccupation", any: ["occupation"] },
  // ---- previous qualifying exam -------------------------------------------
  {
    field: "previousClass",
    all: ["class"],
    any: ["previous", "last", "passed", "passing", "qualifying"],
  },
  {
    field: "maxMarks",
    all: ["marks"],
    any: ["max", "maximum", "total", "full"],
  },
  {
    field: "marksObtained",
    all: ["marks"],
    any: ["obtained", "scored", "secured", "gain"],
  },
  { field: "percentage", any: ["percentage", "percent"] },
  {
    field: "passingYear",
    all: ["year"],
    any: ["passed", "passing", "pass", "completion"],
  },
  // ---- class / section ----------------------------------------------------
  {
    field: "className",
    any: ["class", "grade", "standard", "std", "studying"],
    none: [
      "previous",
      "last",
      "passed",
      "passing",
      "section",
      "sec",
      "division",
      "div",
      "teacher",
      "subject",
    ],
  },
  { field: "section", any: ["section", "sec", "division", "div"] },
  // ---- date of birth ------------------------------------------------------
  { field: "dobDay", all: ["day"], any: ["birth", "dob"] },
  { field: "dobMonth", all: ["month"], any: ["birth", "dob"] },
  { field: "dobYear", all: ["year"], any: ["birth", "dob"] },
  {
    field: "dob",
    any: ["dob", "birth"],
    none: ["place", "time", "hospital", "certificate"],
  },
  // ---- personal details ---------------------------------------------------
  { field: "gender", any: ["gender", "sex"], none: ["father", "mother"] },
  {
    field: "category",
    any: ["category", "caste", "community"],
    none: ["father", "mother"],
  },
  { field: "nationality", any: ["nationality", "citizenship"] },
  { field: "bloodGroup", any: ["blood"] },
  { field: "weight", any: ["weight"] },
  { field: "height", any: ["height"] },
  { field: "allergyMedicine", all: ["allergy"], any: ["medicine", "drug"] },
  { field: "allergyOther", any: ["allergy"] },
  { field: "disease", any: ["disease", "illness", "ailment"] },
  {
    field: "otherInformation",
    any: ["remarks", "remark", "note", "comment", "additionalinformation"],
  },
  // ---- contact ------------------------------------------------------------
  { field: "phone2", any: ["alternate", "second", "secondary"] },
  {
    field: "email",
    any: ["email", "mail", "gmail"],
    none: ["school", "college"],
  },
  {
    field: "phone",
    any: ["phone", "mobile", "contact", "telephone", "whatsapp", "cell"],
    none: [
      "alternate",
      "second",
      "secondary",
      "emergency",
      "aadhaar",
      "reference",
    ],
  },
  // ---- address ------------------------------------------------------------
  { field: "permanentPin", all: ["permanent"], any: ["pin", "postal", "zip"] },
  { field: "permanentState", all: ["permanent", "state"] },
  {
    field: "permanentCity",
    all: ["permanent"],
    any: ["city", "town", "village", "district"],
  },
  { field: "permanentAddress", all: ["permanent"], any: ["address", "addr"] },
  {
    field: "pin",
    any: ["pincode", "pin", "zip", "postal"],
    none: ["permanent", "perm"],
  },
  {
    field: "city",
    any: ["city", "town", "village", "district"],
    none: ["permanent", "perm"],
  },
  { field: "state", any: ["state"], none: ["permanent", "perm"] },
  {
    field: "address",
    any: ["address", "addr"],
    none: ["permanent", "perm", "school", "email"],
  },
  // ---- identity -----------------------------------------------------------
  {
    field: "enrollment",
    any: [
      "enrollment",
      "enrolment",
      "admission",
      "admno",
      "roll",
      "registration",
      "scholar",
      "formno",
      "studentid",
    ],
    none: ["date", "year", "fee", "status", "medium", "class", "total"],
  },
  { field: "penOfStudent", any: ["penofstudent", "penno", "pennumber"] },
  // ---- name (last: any remaining "... name" column is the student's name) --
  {
    field: "fullName",
    all: ["name"],
    none: [
      "bank",
      "book",
      "village",
      "city",
      "state",
      "district",
      "religion",
      "nationality",
      "blood",
      "subject",
      "teacher",
      "address",
      "nominee",
      "account",
      "holder",
      "signature",
      "library",
      "bus",
    ],
  },
  {
    field: "fullName",
    any: ["student", "pupil", "child", "candidate"],
    none: ["photo", "id", "code", "address", "mobile", "phone"],
  },
];

function guessFieldFromWords(normalized: string): FieldKey | null {
  for (const rule of HEADER_WORD_RULES) {
    if (rule.all && !rule.all.every((token) => normalized.includes(token))) {
      continue;
    }
    if (rule.any && !rule.any.some((token) => normalized.includes(token))) {
      continue;
    }
    if (rule.none && rule.none.some((token) => normalized.includes(token))) {
      continue;
    }
    return rule.field;
  }
  return null;
}

/**
 * Resolve a spreadsheet header to a student field: exact alias first, then the
 * loose word rules. The priority decides which column wins when the same field
 * appears twice (lower priority = better match).
 */
export function resolveHeaderField(header: unknown): {
  field: FieldKey | null;
  priority: number;
} {
  const normalized = normalizeKey(String(header ?? ""));
  if (!normalized) return { field: null, priority: 0 };
  const exact = ALIAS_MAP[normalized];
  if (exact) return { field: exact, priority: ALIAS_PRIORITY[normalized] ?? 0 };
  const loose = guessFieldFromWords(normalized);
  return { field: loose, priority: loose ? WORD_RULE_PRIORITY : 0 };
}

export function mapHeaderToField(header: string): FieldKey | null {
  return resolveHeaderField(header).field;
}

/** Trim a cell value and treat placeholder values (n/a, -, nil, ...) as empty. */
function cellText(raw: unknown): string {
  const value = String(raw ?? "").trim();
  const lowered = value.toLowerCase();
  if (
    lowered === "n/a" ||
    lowered === "na" ||
    lowered === "-" ||
    lowered === "nil" ||
    lowered === "null"
  ) {
    return "";
  }
  return value;
}

const ENUM_SYNONYMS: Record<string, string> = {
  M: "MALE",
  MALE: "MALE",
  BOY: "MALE",
  BOYS: "MALE",
  F: "FEMALE",
  FEMALE: "FEMALE",
  GIRL: "FEMALE",
  GIRLS: "FEMALE",
  GENERAL: "GEN",
  GEN: "GEN",
  OBC: "OBC",
  SC: "SC",
  ST: "ST",
  INDIAN: "INDIAN",
  INDIA: "INDIAN",
  OTHERS: "OTHERS",
  OTHER: "OTHERS",
  FOREIGNER: "OTHERS",
};

/** Normalize gender / category / nationality from common spreadsheet spellings. */
function normalizeEnum(value: string): string {
  const key = value.trim().toUpperCase();
  return ENUM_SYNONYMS[key] || key;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function isValidDate(year: number, month: number, day: number): boolean {
  if (
    year < 1900 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Accepts "16" as 2016 (year column) and keeps 4-digit years as-is. */
function normalizeYearString(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}$/.test(trimmed)) return String(2000 + Number(trimmed));
  return /^\d{4}$/.test(trimmed) ? String(Number(trimmed)) : trimmed;
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

/**
 * Split a single DOB cell into day / month / year.
 * Handles "2016-05-10", "10/05/2016", "10-May-2016", "May 10, 2016",
 * "20160510" and Excel serial date numbers.
 */
function parseDob(raw: unknown): {
  dobDay: string;
  dobMonth: string;
  dobYear: string;
} {
  const empty = { dobDay: "", dobMonth: "", dobYear: "" };
  if (raw === null || raw === undefined) return empty;
  let value = String(raw).trim();
  if (!value) return empty;

  // Excel stores date cells as serial numbers (days since 1899-12-30).
  // CSV reads also arrive here because XLSX auto-converts date-like text
  // ("10-05-2016", "2016-08-22", "10-May-2016") into a serial number.
  const looksLikeSerial =
    typeof raw === "number" || /^\d{4,6}(\.\d+)?$/.test(value);
  if (looksLikeSerial) {
    const numeric = Number(value);
    // Genuine birth-date serials for school children are roughly 20000-60000.
    if (Number.isFinite(numeric) && numeric > 20000 && numeric < 60000) {
      const date = new Date(Date.UTC(1899, 11, 30) + numeric * 86400000);
      return {
        dobDay: pad2(date.getUTCDate()),
        dobMonth: pad2(date.getUTCMonth() + 1),
        dobYear: String(date.getUTCFullYear()),
      };
    }
  }

  // Compact "YYYYMMDD".
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const [, yearText, monthText, dayText] = compact;
    if (isValidDate(Number(yearText), Number(monthText), Number(dayText))) {
      return { dobDay: dayText, dobMonth: monthText, dobYear: yearText };
    }
    return empty;
  }

  // Replace a month name with its number, then parse the number tokens.
  let monthFromName = 0;
  const monthMatch = value
    .toLowerCase()
    .match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*/);
  if (monthMatch) {
    const monthNumber = MONTH_NAMES[monthMatch[1]];
    if (monthNumber) {
      value = value.toLowerCase().replace(monthMatch[0], String(monthNumber));
      monthFromName = monthNumber;
    }
  }

  const tokens = (value.match(/\d{1,4}/g) || []).map(Number);
  if (tokens.length >= 3) {
    const year =
      tokens.filter((token) => token > 99).sort((a, b) => b - a)[0] || 0;
    if (isValidDate(year, 1, 1)) {
      const yearIndex = tokens.indexOf(year);
      const remaining =
        yearIndex === -1
          ? tokens.filter((token) => token !== year)
          : [...tokens.slice(0, yearIndex), ...tokens.slice(yearIndex + 1)];
      if (monthFromName) {
        const day = remaining.find((token) => token !== monthFromName) || 0;
        if (isValidDate(year, monthFromName, day)) {
          return {
            dobDay: pad2(day),
            dobMonth: pad2(monthFromName),
            dobYear: String(year),
          };
        }
      } else if (remaining.length >= 2) {
        if (yearIndex === 0) {
          // YYYY-MM-DD (ISO) - remaining is [month, day].
          const month = remaining[0];
          const day = remaining[1];
          if (isValidDate(year, month, day)) {
            return {
              dobDay: pad2(day),
              dobMonth: pad2(month),
              dobYear: String(year),
            };
          }
          // Fall back to DD/MM if that ordering is the valid one.
          if (isValidDate(year, day, month)) {
            return {
              dobDay: pad2(month),
              dobMonth: pad2(day),
              dobYear: String(year),
            };
          }
        } else {
          // DD/MM/YYYY (Indian day-first convention).
          const day = remaining[0];
          const month = remaining[1];
          if (isValidDate(year, month, day)) {
            return {
              dobDay: pad2(day),
              dobMonth: pad2(month),
              dobYear: String(year),
            };
          }
          // Fall back to US-style MM/DD/YYYY if the first ordering was invalid.
          if (isValidDate(year, day, month)) {
            return {
              dobDay: pad2(month),
              dobMonth: pad2(day),
              dobYear: String(year),
            };
          }
        }
      }
    }
  }

  return empty;
}

/** Turn "25"/"2025" into 2025, "26"/"2026" into 2026, etc. */
function expandYearToken(token: string): number {
  const number = Number(token.trim());
  if (!Number.isFinite(number) || number <= 0) return NaN;
  return number < 100 ? 2000 + number : Math.round(number);
}

/** Combine Session Start/End columns or a single "Academic Year" column like "2025-26". */
function resolveSession(
  startRaw: string,
  endRaw: string,
  academicYearRaw: string,
) {
  const start = startRaw.trim();
  const end = endRaw.trim();
  const academicYear = academicYearRaw.trim();

  if (start && end) {
    const startYear = expandYearToken(start);
    const endYear = expandYearToken(end);
    if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
      return {
        sessionStart: String(startYear).slice(-2),
        sessionEnd: String(endYear).slice(-2),
        // e.g. "2025-26" (4-digit start + 2-digit end), matching the
        // "2026-27" format used by generateAcademicYears() and AddStudent.tsx.
        academicYear: `${startYear}-${String(endYear).slice(-2)}`,
      };
    }
  }
  if (academicYear) {
    const tokens = academicYear.match(/\d{2,4}/g) || [];
    if (tokens.length) {
      const startYear = expandYearToken(tokens[0] ?? "");
      const endYear =
        tokens.length > 1 ? expandYearToken(tokens[1] ?? "") : startYear + 1;
      if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
        return {
          sessionStart: String(startYear).slice(-2),
          sessionEnd: String(endYear).slice(-2),
          // e.g. "2025-26" (4-digit start + 2-digit end), matching the
          // "2026-27" format used by generateAcademicYears() and AddStudent.tsx.
          academicYear: `${startYear}-${String(endYear).slice(-2)}`,
        };
      }
    }
  }
  return {
    sessionStart: start.slice(-2),
    sessionEnd: end.slice(-2),
    academicYear,
  };
}

/**
 * Many sheets keep the class and the section in the same cell ("Class & Sec" ->
 * "5-A", "V/B", "Nursery A"). This splits such a value into the stored CLASSES
 * spelling plus the section letter. An empty `className` means the value is not
 * a combined class + section.
 */
function splitClassAndSection(value: string): {
  className: string;
  section: string;
} {
  const empty = { className: "", section: "" };
  const text = value.trim();
  if (!text) return empty;
  const match = text.match(/^(.*?)[\s\-_./&,]*([A-Za-z])$/);
  if (!match) return empty;
  const section = match[2].toUpperCase();
  if (!SECTIONS.includes(section)) return empty;
  const className = normalizeClassName(match[1]);
  return className ? { className, section } : empty;
}

/** "Section A" / "sec-A" / "- B" -> "A"; values that are no section -> "". */
function normalizeSection(value: string): string {
  const cleaned = value
    .trim()
    .replace(/^(section|sec|division|div)\b[.\s:/-]*/i, "")
    .trim();
  if (!cleaned) return "";
  const upper = cleaned.toUpperCase();
  if (SECTIONS.includes(upper)) return upper;
  // Single letters (schools also use D, E, ...) and values such as "A1" are
  // kept; anything else is not a section.
  return /^[A-Za-z]\d?$/.test(cleaned) ? upper : "";
}

/** Section stored when the sheet carries none - same default as the form. */
const DEFAULT_SECTION = "A";

/**
 * Parse an Excel (.xlsx / .xls) or CSV file into validated student rows.
 * Rows with missing/invalid required data are returned in `errors` with the
 * exact problem and are NOT uploadable.
 */
export async function parseStudentFile(
  file: File,
): Promise<StudentImportResult> {
  const buffer = await file.arrayBuffer();
  // `raw: true` keeps CSV cells as written - without it SheetJS converts
  // "10-05-2016" into a US-ordered date serial (5 October) instead of leaving
  // the day-first text for parseDob().
  const workbook = XLSX.read(buffer, { type: "array", raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets.");
  const sheet = workbook.Sheets[sheetName];
  // Cell matrix instead of sheet_to_json's object form: merged / blank cells
  // stay under control and the row that really carries the column names can be
  // located (files exported from other software often put a title row above it).
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  if (!matrix.length)
    throw new Error("The file is empty - no data rows found.");

  // ---- Locate the header row ----------------------------------------------
  // The row matching the most known columns wins, so a "STUDENT LIST" or school
  // name title row above the headers no longer makes every column unknown.
  const HEADER_SEARCH_ROWS = 15;
  let headerRowIndex = 0;
  let bestHeaderScore = -1;
  const headerSearchLimit = Math.min(matrix.length, HEADER_SEARCH_ROWS);
  for (let i = 0; i < headerSearchLimit; i += 1) {
    const cells = matrix[i] || [];
    let score = 0;
    for (const cell of cells) {
      if (resolveHeaderField(cell).field) score += 1;
    }
    if (score > bestHeaderScore) {
      bestHeaderScore = score;
      headerRowIndex = i;
    }
  }
  if (bestHeaderScore < 2) headerRowIndex = 0;

  const headerCells = (matrix[headerRowIndex] || []).map((cell) =>
    String(cell ?? "").trim(),
  );
  const headers = headerCells.filter((header) => header !== "");

  // Resolve each column to a field ONCE; per-row lookups are then O(1).
  const columnByField = new Map<FieldKey, number>();
  const columnPriority = new Map<FieldKey, number>();
  headerCells.forEach((header, columnIndex) => {
    if (!header) return;
    const { field, priority } = resolveHeaderField(header);
    if (!field) return;
    const existing = columnPriority.get(field);
    // First matching column wins. The only exception: a later column may
    // upgrade a loose word-rule guess (priority === WORD_RULE_PRIORITY) into a
    // confirmed exact-alias match. This stops unrelated columns further right
    // in wide exports (a blank "name" column for a sibling, a "standard"/
    // "grade" column from prior-school marks, etc.) from overriding a field
    // that's already correctly matched to an earlier column.
    if (existing === undefined) {
      columnByField.set(field, columnIndex);
      columnPriority.set(field, priority);
    } else if (
      existing === WORD_RULE_PRIORITY &&
      priority < WORD_RULE_PRIORITY
    ) {
      columnByField.set(field, columnIndex);
      columnPriority.set(field, priority);
    }
  });

  const dataRows = matrix.slice(headerRowIndex + 1).map((cells, i) => ({
    cells: cells || [],
    rowNumber: headerRowIndex + i + 2,
  }));
  // A sheet without any filled data row is reported instead of importing zero
  // students without a word.
  const hasDataRow = dataRows.some(({ cells }) =>
    cells.some((cell) => String(cell ?? "").trim() !== ""),
  );
  if (!hasDataRow) throw new Error("The file is empty - no data rows found.");

  const students: StudentRow[] = [];
  const errors: StudentImportError[] = [];
  const seenDocIds = new Set<string>();

  dataRows.forEach(({ cells, rowNumber }) => {
    // Fully blank spacer rows (and the empty tail of a formatted sheet) are
    // ignored instead of being reported as invalid rows.
    if (cells.every((cell) => String(cell ?? "").trim() === "")) return;
    const getValue = (field: FieldKey): string => {
      const columnIndex = columnByField.get(field);
      return columnIndex === undefined ? "" : cellText(cells[columnIndex]);
    };

    // ---- Name --------------------------------------------------------------
    const fullNameRaw = getValue("fullName");
    const firstNameRaw = getValue("firstName");
    const lastNameRaw = getValue("lastName");
    const fullName = fullNameRaw || `${firstNameRaw} ${lastNameRaw}`.trim();
    const trimmedFullName = fullName.trim();
    const lastSpaceIndex = trimmedFullName.lastIndexOf(" ");
    const firstName =
      firstNameRaw ||
      (lastSpaceIndex === -1
        ? trimmedFullName
        : trimmedFullName.slice(0, lastSpaceIndex));
    const lastName =
      lastNameRaw ||
      (lastSpaceIndex === -1 ? "" : trimmedFullName.slice(lastSpaceIndex + 1));

    // ---- Date of birth (single column -> day / month / year) ---------------
    const dobColumnValue = getValue("dob");
    const parsedDob = parseDob(dobColumnValue);
    const dobDay = getValue("dobDay") || parsedDob.dobDay;
    const dobMonth = getValue("dobMonth") || parsedDob.dobMonth;
    const dobYear = normalizeYearString(
      getValue("dobYear") || parsedDob.dobYear,
    );
    const dobValid =
      Boolean(dobDay && dobMonth && /^\d{4}$/.test(dobYear)) &&
      isValidDate(Number(dobYear), Number(dobMonth), Number(dobDay));
    const dobInvalid =
      Boolean(dobDay || dobMonth || dobYear || dobColumnValue) && !dobValid;
    const dob = dobValid
      ? `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`
      : "";

    // ---- Session / academic year -------------------------------------------
    const session = resolveSession(
      getValue("sessionStart"),
      getValue("sessionEnd"),
      getValue("academicYear"),
    );

    // ---- Class / section -----------------------------------------------------
    // Spreadsheets spell the class in many ways ("5th", "Class 5", "V") and often
    // keep the section in the same cell ("5-A", "Class 5 B"). The class is mapped
    // onto the CLASSES spelling used everywhere else (so the uploaded students
    // land in the same class bucket as the manual ones) and the section is split
    // out instead of ending up inside the class value.
    const classColumnValue = getValue("className");
    const sectionColumnValue = getValue("section");
    const splitFromClassColumn = splitClassAndSection(classColumnValue);
    const splitFromSectionColumn = splitClassAndSection(sectionColumnValue);
    const className =
      splitFromClassColumn.className ||
      normalizeClassName(classColumnValue) ||
      classColumnValue.trim() ||
      splitFromSectionColumn.className ||
      normalizeClassName(sectionColumnValue);
    // A combined column ("Class & Section" -> "5-A") carries the section too.
    const sectionFromSectionColumn = splitFromSectionColumn.className
      ? splitFromSectionColumn.section
      : normalizeSection(sectionColumnValue);
    const section =
      sectionFromSectionColumn ||
      splitFromClassColumn.section ||
      DEFAULT_SECTION;

    // ---- Enumerated fields ---------------------------------------------------
    const gender = normalizeEnum(getValue("gender"));
    const category = normalizeEnum(getValue("category"));
    const nationality = normalizeEnum(getValue("nationality"));

    // ---- Previous qualifying exam (percentage auto-calculated) ---------------
    const maximumMarks = getValue("maxMarks");
    const marksObtained = getValue("marksObtained");
    const rawPercentage = getValue("percentage");
    const maxMarksNumber = Number(maximumMarks);
    const marksNumber = Number(marksObtained);
    const percentage =
      maximumMarks &&
      marksObtained &&
      maxMarksNumber > 0 &&
      !Number.isNaN(marksNumber)
        ? ((marksNumber / maxMarksNumber) * 100).toFixed(2)
        : rawPercentage;

    // ---- Required field validation ------------------------------------------
    const emailValue = getValue("email");
    const phoneValue = getValue("phone");
    const checks: Record<string, string> = {
      fullName,
      enrollment: getValue("enrollment"),
      className,
      sessionStart: session.sessionStart,
      sessionEnd: session.sessionEnd,
      motherName: getValue("motherName"),
      fatherName: getValue("fatherName"),
      gender,
      category,
      nationality,
      dobYear,
      phone: phoneValue,
      email: emailValue,
    };

    const missing: string[] = [];
    for (const required of REQUIRED_STUDENT_FIELDS) {
      // "Session / Academic Year" covers two entries, so the label is deduped.
      if (!checks[required.key] && !missing.includes(required.label)) {
        missing.push(required.label);
      }
    }

    const badFormat: string[] = [];
    if (dobInvalid)
      badFormat.push(
        "Invalid/incomplete DOB (use day/month/year or yyyy-mm-dd)",
      );
    if (emailValue && !EMAIL_PATTERN.test(emailValue))
      badFormat.push("Invalid email address");
    if (phoneValue && !PHONE_PATTERN.test(phoneValue))
      badFormat.push("Invalid phone format");

    if (missing.length || badFormat.length) {
      errors.push({
        row: rowNumber,
        enrollment: getValue("enrollment") || "-",
        name: fullName || "-",
        message: [
          missing.length
            ? `Missing required field(s): ${missing.join(", ")}`
            : "",
          ...badFormat,
        ]
          .filter(Boolean)
          .join(" · "),
      });
      return;
    }

    // Reject duplicate enrollment numbers (one student record per enrollment).
    const enrollmentValue = getValue("enrollment");
    const enrollmentKey = enrollmentValue.trim().toLowerCase();
    if (seenDocIds.has(enrollmentKey)) {
      errors.push({
        row: rowNumber,
        enrollment: enrollmentValue,
        name: fullName || "-",
        message: "Duplicate enrollment number in file",
      });
      return;
    }
    seenDocIds.add(enrollmentKey);

    const fatherName = getValue("fatherName");
    const motherName = getValue("motherName");

    students.push({
      id: `${Date.now().toString(36)}${rowNumber.toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      firstName,
      lastName,
      fullName: trimmedFullName,
      firstNameLower: firstName.toLowerCase(),
      lastNameLower: lastName.toLowerCase(),
      enrollment: enrollmentValue,
      className,
      section,
      academicYear: session.academicYear,
      sessionStart: session.sessionStart,
      sessionEnd: session.sessionEnd,
      fatherName,
      motherName,
      fatherOccupation: getValue("fatherOccupation"),
      gender,
      category,
      nationality,
      dob,
      dobDay: dobDay.padStart(2, "0"),
      dobMonth: dobMonth.padStart(2, "0"),
      dobYear,
      phone: phoneValue,
      phone2: getValue("phone2"),
      email: emailValue,
      address: getValue("address"),
      correspondenceName: getValue("correspondenceName"),
      city: getValue("city"),
      state: getValue("state"),
      pin: getValue("pin"),
      permanentAddress: getValue("permanentAddress"),
      permanentCity: getValue("permanentCity"),
      permanentState: getValue("permanentState"),
      permanentPin: getValue("permanentPin"),
      penOfStudent: getValue("penOfStudent"),
      lastSchoolName: getValue("lastSchoolName"),
      lastSchoolAddress: getValue("lastSchoolAddress"),
      passingYear: getValue("passingYear"),
      previousQualifyingExam: {
        maximumMarks,
        previousClass: getValue("previousClass"),
        marksObtained,
        percentage,
      },
      physicalStatus: {
        studentName: fullName,
        fatherName,
        motherName,
        weight: getValue("weight"),
        height: getValue("height"),
        bloodGroup: getValue("bloodGroup"),
        allergyMedicine: getValue("allergyMedicine"),
        allergyOther: getValue("allergyOther"),
        disease: getValue("disease"),
        otherInformation: getValue("otherInformation"),
      },
      studentPhoto: "",
      motherPhoto: "",
      fatherPhoto: "",
    });
  });

  // Inform the caller which required fields have NO usable column in the file.
  const satisfiedBy: Partial<Record<FieldKey, FieldKey>> = {
    fullName: "firstName",
    // A "Class & Section" column carries the class as well.
    className: "section",
    sessionStart: "academicYear",
    sessionEnd: "academicYear",
    dobYear: "dob",
  };
  const hasColumn = (key: FieldKey): boolean => {
    if (columnByField.has(key)) return true;
    const alternative = satisfiedBy[key];
    return alternative !== undefined && columnByField.has(alternative);
  };
  const missingRequiredColumns = [
    ...new Set(
      REQUIRED_STUDENT_FIELDS.filter(({ key }) => !hasColumn(key)).map(
        ({ label }) => label,
      ),
    ),
  ];

  return { students, errors, headers, missingRequiredColumns };
}

// ===========================================================================
// Firestore document builders - identical shape to what AddStudent.tsx
// writes (buildStudentFields / buildEnrollmentFields).
// ===========================================================================

/** Mirrors buildStudentFields() in AddStudent.tsx -> `students/{enrollment}`. */
export function toFirestoreStudent(row: StudentRow) {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    firstNameLower: row.firstNameLower,
    lastNameLower: row.lastNameLower,
    enrollment: row.enrollment,
    className: row.className,
    section: row.section,
    academicYear: row.academicYear,
    fatherName: row.fatherName,
    motherName: row.motherName,
    fatherOccupation: row.fatherOccupation,
    gender: row.gender,
    category: row.category,
    nationality: row.nationality,
    dob: row.dob,
    phone: row.phone,
    phone2: row.phone2,
    email: row.email,
    address: row.address,
    correspondenceName: row.correspondenceName,
    city: row.city,
    state: row.state,
    pin: row.pin,
    permanentAddress: row.permanentAddress,
    permanentCity: row.permanentCity,
    permanentState: row.permanentState,
    permanentPin: row.permanentPin,
    penOfStudent: row.penOfStudent,
    lastSchoolName: row.lastSchoolName,
    lastSchoolAddress: row.lastSchoolAddress,
    passingYear: row.passingYear,
    previousQualifyingExam: { ...row.previousQualifyingExam },
    physicalStatus: { ...row.physicalStatus },
    studentPhoto: row.studentPhoto,
    motherPhoto: row.motherPhoto,
    fatherPhoto: row.fatherPhoto,
  };
}

/** Mirrors buildEnrollmentFields() in AddStudent.tsx -> `enrollments/{enrollment}`. */
export function toFirestoreEnrollment(row: StudentRow, studentId: string) {
  return {
    studentId,
    academicYear: row.academicYear,
    className: row.className,
    section: row.section,
    enrollment: row.enrollment,
    studentName: row.fullName,
    firstName: row.firstName,
    lastName: row.lastName,
    firstNameLower: row.firstNameLower,
    lastNameLower: row.lastNameLower,
    fatherName: row.fatherName,
    phone: row.phone,
  };
}

/** Quote a CSV field when it carries a comma / quote / line break. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Generate a .csv template string with a sample row covering every field. */
export function studentCsvTemplate(): string {
  const headerRow = [
    "Name",
    "Enrollment",
    "Class",
    "Section",
    "Session Start",
    "Session End",
    "Mother's Name",
    "Father's Name",
    "Father's Occupation",
    "Gender",
    "Category",
    "Nationality",
    "DOB",
    "Phone",
    "Alternate Phone",
    "Email",
    "Address",
    "Correspondence Name",
    "City",
    "State",
    "PIN",
    "Permanent Address",
    "Permanent City",
    "Permanent State",
    "Permanent PIN",
    "PEN of Student",
    "Last School Name",
    "Last School Address",
    "Passing Year",
    "Maximum Marks",
    "Previous Class",
    "Marks Obtained",
    "Percentage",
    "Weight",
    "Height",
    "Blood Group",
    "Allergy Medicine",
    "Allergy Other",
    "Disease",
    "Other Information",
  ];
  const sampleRow = [
    "Aarav Sharma",
    "1001",
    "5",
    "A",
    "25",
    "26",
    "Sunita Sharma",
    "Rajesh Sharma",
    "Shopkeeper",
    "MALE",
    "GEN",
    "INDIAN",
    "10-05-2016",
    "9876543210",
    "",
    "aarav@example.com",
    "Mahmoorganj, Varanasi",
    "Aarav Sharma",
    "Varanasi",
    "Uttar Pradesh",
    "221001",
    "Mahmoorganj, Varanasi",
    "Varanasi",
    "Uttar Pradesh",
    "221001",
    "123456789",
    "Sunrise Public School",
    "Varanasi",
    "2025",
    "500",
    "5",
    "420",
    "84.00",
    "32",
    "138",
    "B+",
    "None",
    "None",
    "None",
    "None",
  ];
  // Every field is quoted when needed - an unquoted comma in an address used to
  // shift all following columns of the sample row.
  return [
    headerRow.map(csvField).join(","),
    sampleRow.map(csvField).join(","),
    "",
  ].join("\n");
}

export function downloadCsvTemplate(): void {
  const blob = new Blob([studentCsvTemplate()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "students-template.csv";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Mirror the rows into the local list keyed by enrollment (upsert) so the
 * Admit Card / ID card panels (which read `cves_students`) keep working.
 */
export function saveStudentsLocally(students: StudentRow[]): StudentRow[] {
  const list: StudentRow[] = JSON.parse(
    localStorage.getItem("cves_students") || "[]",
  );
  const map = new Map(list.map((s) => [String(s.enrollment), s]));
  students.forEach((s) => map.set(String(s.enrollment), s));
  const merged = Array.from(map.values());
  localStorage.setItem("cves_students", JSON.stringify(merged));
  return merged;
}
