/**
 * UDISE+ answers of a student, worked out from our records (read only) and
 * merged with the school defaults and the answers typed for the student.
 * Pure functions; see docs/features/udise.md.
 */
import {
  DEFAULT_UDISE_SETTINGS,
  UDISE_BLOOD_GROUP_CODES,
  UDISE_CATEGORY_CODES,
  UDISE_FIELDS,
  UDISE_MULTI_SEPARATOR,
  UDISE_NONE,
} from "../constants";
import type { UdiseAnswer, UdiseFieldDef, UdiseForm, UdiseSettings, UdiseValues } from "./type";

const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value).trim() : "");
const digits = (value: unknown) => text(value).replace(/\D/g, "");

/** dd/MM/yyyy of a Firestore Timestamp, a Date, epoch ms or an ISO / yyyy-MM-dd text ("" when unknown). */
export function udiseDate(value: unknown): string {
  let date: Date | null = null;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    date = (value as { toDate: () => Date }).toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value);
  } else if (typeof value === "string" && value.trim()) {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    date = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value);
  }
  if (!date || Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export interface UdiseRecordInput {
  /** students/{id} data. */
  student: Record<string, unknown>;
  /** enrollments/{id} of the chosen session. */
  enrollment: Record<string, unknown>;
  /** The student's enrollment of the previous session, when there is one. */
  previousEnrollment: Record<string, unknown> | null;
  rollNumber: number;
  classCodes: Record<string, string>;
}

/** The answers our records give (only fields marked `derived`). */
export function udiseFromRecords(input: UdiseRecordInput): UdiseValues {
  const { student, enrollment, previousEnrollment, rollNumber, classCodes } = input;
  const physical = (student.physicalStatus ?? {}) as Record<string, unknown>;
  const address = [text(student.address), text(student.city)].filter(Boolean).join(" ");
  const nationality = text(student.nationality).toUpperCase();
  const bloodGroup = text(physical.bloodGroup).toUpperCase().replace(/\s/g, "");
  const previousClass = previousEnrollment ? classCodes[text(previousEnrollment.className)] ?? "" : "";

  return {
    address: address.slice(0, 150),
    pincode: digits(student.pin).slice(0, 6),
    primaryMobile: digits(student.phone || enrollment.phone).slice(-10),
    secondaryMobile: digits(student.phone2).slice(-10),
    email: text(student.email),
    socCatId: UDISE_CATEGORY_CODES[text(student.category).toUpperCase()] ?? "",
    natIndYN: nationality === "INDIAN" ? "Y" : nationality ? "N" : "",
    bloodGroup: UDISE_BLOOD_GROUP_CODES[bloodGroup] ?? "",
    admnNumber: text(enrollment.enrollment || student.enrollment),
    admnStartDate: udiseDate(student.admissionDate) || udiseDate(student.createdAt),
    rollNumber: rollNumber > 0 ? String(rollNumber) : "",
    // A student of last session here studied at this school.
    enrStatusPY: previousEnrollment ? "1" : "",
    classPY: previousClass,
    heightInCm: digits(physical.height).slice(0, 3),
    weightInKg: digits(physical.weight).slice(0, 3),
  };
}

/**
 * Final answer of every field: the student's own answer, else our records,
 * else the school default. A field that only applies after a "Yes" (AAY, CWSN
 * details, OOSC, RTE amount) is left empty when the "Yes" is not there.
 */
export function udiseAnswers(
  records: UdiseValues,
  saved: UdiseValues,
  settings: UdiseSettings = DEFAULT_UDISE_SETTINGS
): Record<string, UdiseAnswer> {
  const answers: Record<string, UdiseAnswer> = {};
  for (const field of UDISE_FIELDS) {
    const own = saved[field.key] ?? "";
    const fromRecords = field.derived ? records[field.key] ?? "" : "";
    const fallback = field.defaultable ? settings.defaults[field.key] ?? "" : "";
    answers[field.key] = own
      ? { value: own, source: "student" }
      : fromRecords
        ? { value: fromRecords, source: "records" }
        : fallback
          ? { value: fallback, source: "default" }
          : { value: "", source: "none" };
  }
  const off = (key: string) => (answers[key] = { value: "", source: "none" });
  if (answers.isBplYN?.value !== "Y") off("aayBplYN");
  if (answers.cwsnYN?.value !== "Y") ["impairmentType", "disabilityCerti", "impairmentPercent"].forEach(off);
  if (answers.natIndYN?.value !== "N") off("natOtherCountry");
  if (answers.ooscYN?.value !== "Y") off("ooscMainstreamedYN");
  if (answers.isRte?.value !== "Y") off("isRteAmount");
  // No previous class to give when the student did not study last year.
  if (answers.enrStatusPY?.value === "4") off("classPY");
  return answers;
}

/** Is a field needed for this student (asked by the portal with a *)? */
export function udiseFieldNeeded(field: UdiseFieldDef, answers: Record<string, UdiseAnswer>): boolean {
  if (!field.required) return false;
  if (field.key === "classPY") return answers.enrStatusPY?.value !== "4";
  return true;
}

/** Required fields that still have no answer. */
export function udiseMissing(answers: Record<string, UdiseAnswer>): UdiseFieldDef[] {
  return UDISE_FIELDS.filter((field) => udiseFieldNeeded(field, answers) && !answers[field.key]?.value);
}

/** Readable text of an answer (option label, Yes / No, list). */
export function udiseAnswerText(field: UdiseFieldDef, value: string): string {
  if (!value) return "";
  if (field.kind === "yesno") return value === "Y" ? "Yes" : value === "N" ? "No" : value;
  if (field.kind === "multi") return value.split(UDISE_MULTI_SEPARATOR).filter(Boolean).join(", ");
  if (field.kind === "select") return field.options?.find((option) => option.value === value)?.label ?? value;
  return value;
}

/** Settings as saved, with every default key and class present. */
export function readUdiseSettings(data: unknown): UdiseSettings {
  const raw = (data ?? {}) as Partial<UdiseSettings>;
  const clean = (values: unknown) =>
    Object.fromEntries(
      Object.entries((values ?? {}) as Record<string, unknown>).map(([key, value]) => [key, text(value)])
    );
  return {
    defaults: { ...DEFAULT_UDISE_SETTINGS.defaults, ...clean(raw.defaults) },
    classCodes: { ...DEFAULT_UDISE_SETTINGS.classCodes, ...clean(raw.classCodes) },
  };
}

/** Only known field keys with text values; empty answers dropped. */
export function cleanUdiseValues(values: UdiseValues): UdiseValues {
  const known = new Set(UDISE_FIELDS.map((field) => field.key));
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, text(value)] as const)
      .filter(([key, value]) => known.has(key) && value !== "")
  );
}

/** Answers -> form values of these fields ("" becomes the "not set" choice of a dropdown). */
export function toUdiseForm(values: UdiseValues, fields: UdiseFieldDef[]): UdiseForm {
  const form: UdiseForm = { values: {}, multi: {} };
  for (const field of fields) {
    const value = values[field.key] ?? "";
    if (field.kind === "multi") form.multi[field.key] = value.split(UDISE_MULTI_SEPARATOR).filter(Boolean);
    else if (field.kind === "select" || field.kind === "yesno") form.values[field.key] = value || UDISE_NONE;
    else form.values[field.key] = value;
  }
  return form;
}

/** Form values -> answers ("not set" and empty are dropped). */
export function fromUdiseForm(form: UdiseForm, fields: UdiseFieldDef[]): UdiseValues {
  const values: UdiseValues = {};
  for (const field of fields) {
    const value =
      field.kind === "multi"
        ? (form.multi?.[field.key] ?? []).join(UDISE_MULTI_SEPARATOR)
        : text(form.values?.[field.key]);
    if (value && value !== UDISE_NONE) values[field.key] = value;
  }
  return values;
}
