/**
 * Pure helpers of the Transfer Certificate: empty values, reading Firestore
 * data safely, TC No., class / date text for the printed sheet.
 */
import { format, isValid, parse } from "date-fns";

import { DEFAULT_TC_SETTINGS } from "../constants";
import type {
  TcFields,
  TcHistoryEntry,
  TcSchoolDetails,
  TcSettings,
  TcStatus,
  TransferCertificate,
} from "./type";

const text = (value: unknown): string =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

const TC_FIELD_KEYS: (keyof TcFields)[] = [
  "scholarNo",
  "registrationNo",
  "pen",
  "studentName",
  "fatherName",
  "motherName",
  "address",
  "nationality",
  "category",
  "dob",
  "dobInWords",
  "lastClass",
  "admissionDate",
  "admissionClass",
  "subjects",
  "lastResult",
  "promotion",
  "duesPaid",
  "feeConcession",
  "nccCadet",
  "struckOffDate",
  "reason",
  "attendance",
  "schoolDays",
  "conduct",
  "schoolCategory",
  "issueDate",
  "preparedBy",
  "checkedBy",
];

export function emptyTcFields(): TcFields {
  return Object.fromEntries(TC_FIELD_KEYS.map((key) => [key, ""])) as unknown as TcFields;
}

/** Any object (Firestore data, form values) as TcFields: every key a string. */
export function readTcFields(data: unknown): TcFields {
  const source = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return Object.fromEntries(
    TC_FIELD_KEYS.map((key) => [key, text(source[key]).trim()])
  ) as unknown as TcFields;
}

const SCHOOL_TEXT_KEYS = [
  "schoolName",
  "affiliationText",
  "affiliationNo",
  "schoolCode",
  "udiseCode",
  "address",
  "email",
  "website",
  "phone",
  "note",
] as const;

export function readSchoolDetails(data: unknown): TcSchoolDetails {
  const source = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const details = { ...schoolDetailsOf(DEFAULT_TC_SETTINGS) };
  SCHOOL_TEXT_KEYS.forEach((key) => {
    if (typeof source[key] === "string") details[key] = source[key] as string;
  });
  if (typeof source.showQr === "boolean") details.showQr = source.showQr;
  if (typeof source.principalSign === "boolean") details.principalSign = source.principalSign;
  return details;
}

export function readTcSettings(data: unknown): TcSettings {
  const source = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const serial = Number(source.lastSerial);
  return {
    ...readSchoolDetails(source),
    schoolCategory:
      typeof source.schoolCategory === "string"
        ? source.schoolCategory
        : DEFAULT_TC_SETTINGS.schoolCategory,
    bookNo: text(source.bookNo).trim() || DEFAULT_TC_SETTINGS.bookNo,
    lastSerial: Number.isInteger(serial) && serial > 0 ? serial : 0,
  };
}

/** The letterhead part of the settings (copied into a TC when issued). */
export function schoolDetailsOf(settings: TcSettings): TcSchoolDetails {
  return {
    schoolName: settings.schoolName,
    affiliationText: settings.affiliationText,
    affiliationNo: settings.affiliationNo,
    schoolCode: settings.schoolCode,
    udiseCode: settings.udiseCode,
    address: settings.address,
    email: settings.email,
    website: settings.website,
    phone: settings.phone,
    note: settings.note,
    showQr: settings.showQr,
    principalSign: settings.principalSign,
  };
}

const STATUSES = new Set<TcStatus>(["draft", "issued", "cancelled"]);
const ACTIONS = new Set(["Issued", "Revised", "Cancelled"]);

function readHistory(value: unknown): TcHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): TcHistoryEntry[] => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const action = text(entry.action);
    if (!ACTIONS.has(action)) return [];
    return [
      {
        at: text(entry.at),
        byName: text(entry.byName),
        action: action as TcHistoryEntry["action"],
        reason: text(entry.reason),
        ...(entry.previous ? { previous: readTcFields(entry.previous) } : {}),
      },
    ];
  });
}

export function readTransferCertificate(id: string, data: Record<string, unknown>): TransferCertificate {
  const status = text(data.status) as TcStatus;
  const srNo = Number(data.srNo);
  const printCount = Number(data.printCount);
  const dues = data.duesAtIssue;
  return {
    id,
    studentId: text(data.studentId),
    enrollmentId: text(data.enrollmentId),
    session: text(data.session),
    className: text(data.className),
    section: text(data.section),
    status: STATUSES.has(status) ? status : "draft",
    srNo: Number.isInteger(srNo) && srNo > 0 ? srNo : 0,
    bookNo: text(data.bookNo),
    tcNo: text(data.tcNo),
    fields: readTcFields(data.fields),
    school: data.school && typeof data.school === "object" ? readSchoolDetails(data.school) : null,
    printCount: Number.isInteger(printCount) && printCount > 0 ? printCount : 0,
    createdAt: text(data.createdAt),
    issuedAt: text(data.issuedAt),
    issuedByName: text(data.issuedByName),
    duesAtIssue: typeof dues === "number" ? dues : null,
    cancelReason: text(data.cancelReason),
    cancelledAt: text(data.cancelledAt),
    cancelledByName: text(data.cancelledByName),
    history: readHistory(data.history),
  };
}

/**
 * The TC that counts for a student among all of theirs: the issued or
 * draft one, else the newest cancelled one (null when there is none).
 */
export function currentTc(list: TransferCertificate[]): TransferCertificate | null {
  const newestFirst = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return newestFirst.find((tc) => tc.status !== "cancelled") ?? newestFirst[0] ?? null;
}

/** "2026-27" -> "2026-2027" (as the TC No. prints it). */
export function fullSession(session: string): string {
  const start = Number.parseInt(session.slice(0, 4), 10);
  return Number.isFinite(start) ? `${start}-${start + 1}` : session;
}

/** e.g. "2026-2027/1/12": session / book no. / Sr. No. */
export const formatTcNo = (session: string, bookNo: string, srNo: number): string =>
  `${fullSession(session)}/${bookNo}/${srNo}`;

const ROMAN: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** "8" -> "VIII"; names (Nursery, LKG ...) stay as they are. */
export function romanClass(className: string): string {
  let value = Number(className);
  if (!Number.isInteger(value) || value < 1 || value > 39) return className;
  let result = "";
  for (const [size, numeral] of ROMAN) {
    while (value >= size) {
      result += numeral;
      value -= size;
    }
  }
  return result;
}

const toDate = (key: string): Date | null => {
  const date = parse(key, "yyyy-MM-dd", new Date());
  return isValid(date) ? date : null;
};

/** "2011-01-19" -> "19-01-2011" ("" when not a date). */
export function tcDateText(key: string): string {
  const date = toDate(key);
  return date ? format(date, "dd-MM-yyyy") : key;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(value: number): string {
  if (value < 20) return ONES[value];
  return `${TENS[Math.floor(value / 10)]} ${ONES[value % 10]}`.trim();
}

/** A year in words: 2011 -> "Two Thousand Eleven", 1998 -> "One Thousand Nine Hundred Ninety Eight". */
function yearInWords(year: number): string {
  const thousands = Math.floor(year / 1000);
  const hundreds = Math.floor((year % 1000) / 100);
  const rest = year % 100;
  return [
    thousands ? `${ONES[thousands]} Thousand` : "",
    hundreds ? `${ONES[hundreds]} Hundred` : "",
    rest ? belowHundred(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** "2011-01-19" -> "19th of January Two Thousand Eleven" ("" when not a date). */
export function dateInWords(key: string): string {
  const date = toDate(key);
  if (!date) return "";
  return `${format(date, "do")} of ${format(date, "MMMM")} ${yearInWords(date.getFullYear())}`;
}

/** What the QR code on a TC holds: the main facts, readable by any scanner. */
export function tcQrText(tc: Pick<TransferCertificate, "tcNo" | "fields">, schoolName: string): string {
  const { fields } = tc;
  return [
    schoolName,
    "TRANSFER CERTIFICATE",
    `TC No.: ${tc.tcNo || "DRAFT"}`,
    `Scholar No.: ${fields.scholarNo}`,
    ...(fields.pen ? [`P.E.N.: ${fields.pen}`] : []),
    `Name: ${fields.studentName}`,
    `Father: ${fields.fatherName}`,
    `DOB: ${tcDateText(fields.dob)}`,
    `Class: ${fields.lastClass}`,
    `Struck off: ${tcDateText(fields.struckOffDate)}`,
    `Issued: ${tcDateText(fields.issueDate)}`,
  ].join("\n");
}
