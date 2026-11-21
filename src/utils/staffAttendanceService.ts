/**
 * Staff attendance (admin): settings, the records of a day, the linked
 * phones, the log and the selfies. Check-ins come from the mobile app; the
 * records, log, phones and selfies are written only by the server
 * (`../server/router/staffAttendanceHandler.js`), so the admin's marks and
 * phone resets go through `/api/staff-attendance/*` too.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
} from "firebase/firestore";

import { API_BASE_URL, authHeaders } from "../component/context/api";
import { COLLECTION, STAFF_ATTENDANCE_SETTINGS_DOC } from "../constants";
import { db } from "../firebase/config";
import type {
  StaffAttendanceRecord,
  StaffAttendanceSettings,
  StaffAttendanceStatus,
  StaffCheck,
  StaffDevice,
  StaffLeave,
  StaffLeaveType,
  StaffLogEntry,
} from "./type";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const millis = (value: unknown): number | null =>
  value && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ? (value as { toMillis: () => number }).toMillis()
    : null;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const BSSID = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/;
const STATUSES = new Set(["present", "late", "halfDay", "absent", "leave"]);

export const DEFAULT_STAFF_ATTENDANCE_SETTINGS: StaffAttendanceSettings = {
  location: null,
  radiusM: 150,
  wifiCheck: false,
  wifiNetworks: [],
  qrCheck: false,
  checkOut: true,
  lateAfter: "08:00",
  halfDayAfter: "",
  earlyLeaveBefore: "",
  lateToHalfDay: 0,
  selfie: false,
  includeStaff: false,
  leaveTypes: [],
};

const toLeaveTypes = (value: unknown): StaffLeaveType[] =>
  Array.isArray(value)
    ? value
        .map((item: DocumentData) => ({
          id: text(item?.id),
          name: text(item?.name),
          quota: num(item?.quota) && item.quota > 0 ? item.quota : 0,
        }))
        .filter((item) => item.id && item.name)
    : [];

/** An id for a new leave type from its name ("Casual Leave" -> "casual-leave"), unique in `taken`. */
export function leaveTypeId(name: string, taken: string[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "leave";
  let id = base;
  for (let index = 2; taken.includes(id); index += 1) id = `${base}-${index}`;
  return id;
}

/* ----------------------------------------------------------- settings -- */

const settingsRef = () => doc(db, COLLECTION.STAFF_ATTENDANCE_SETTINGS, STAFF_ATTENDANCE_SETTINGS_DOC);

export function toStaffSettings(data: DocumentData | undefined): StaffAttendanceSettings {
  const d = DEFAULT_STAFF_ATTENDANCE_SETTINGS;
  if (!data) return d;
  const lat = num(data.location?.lat);
  const lng = num(data.location?.lng);
  const time = (value: unknown, fallback: string) => (TIME.test(text(value)) ? text(value) : fallback);
  return {
    location: lat !== null && lng !== null ? { lat, lng } : null,
    radiusM: num(data.radiusM) && data.radiusM > 0 ? data.radiusM : d.radiusM,
    wifiCheck: data.wifiCheck === true,
    wifiNetworks: Array.isArray(data.wifiNetworks)
      ? data.wifiNetworks
          .map((item: DocumentData) => ({ bssid: text(item?.bssid).toLowerCase(), name: text(item?.name) }))
          .filter((item: { bssid: string }) => BSSID.test(item.bssid))
      : [],
    qrCheck: data.qrCheck === true,
    checkOut: data.checkOut !== false,
    lateAfter: time(data.lateAfter, d.lateAfter),
    halfDayAfter: time(data.halfDayAfter, ""),
    earlyLeaveBefore: time(data.earlyLeaveBefore, ""),
    lateToHalfDay: num(data.lateToHalfDay) ?? 0,
    selfie: data.selfie === true,
    includeStaff: data.includeStaff === true,
    leaveTypes: toLeaveTypes(data.leaveTypes),
  };
}

export async function loadStaffSettings(): Promise<StaffAttendanceSettings> {
  const snap = await getDoc(settingsRef());
  return toStaffSettings(snap.exists() ? snap.data() : undefined);
}

export async function saveStaffSettings(settings: StaffAttendanceSettings, uid: string): Promise<void> {
  await setDoc(settingsRef(), { ...settings, updatedAt: serverTimestamp(), updatedBy: uid });
}

/** True for a Wi-Fi router id like "aa:bb:cc:dd:ee:ff". */
export const isBssid = (value: string) => BSSID.test(value.trim().toLowerCase());

/* -------------------------------------------------------------- a day -- */

const toCheck = (value: DocumentData | null | undefined): StaffCheck | null =>
  value
    ? {
        at: millis(value.at),
        source: value.source === "admin" ? "admin" : "app",
        distanceM: num(value.distanceM),
        model: text(value.model),
        selfie: value.selfie === true,
        byName: text(value.byName),
      }
    : null;

export function toStaffRecord(id: string, data: DocumentData): StaffAttendanceRecord {
  return {
    id,
    uid: text(data.uid),
    name: text(data.name),
    personType: data.personType === "staff" ? "staff" : "teacher",
    date: text(data.date),
    status: (STATUSES.has(data.status) ? data.status : "present") as StaffAttendanceStatus,
    checkIn: toCheck(data.checkIn),
    checkOut: toCheck(data.checkOut),
    earlyLeave: data.earlyLeave === true,
    manual: data.manual === true,
    manualReason: text(data.manualReason),
    manualByName: text(data.manualByName),
    leaveType: text(data.leaveType),
  };
}

/** Every record of a date ("yyyy-MM-dd"), by uid. */
export async function loadStaffDay(date: string): Promise<Record<string, StaffAttendanceRecord>> {
  const snap = await getDocs(query(collection(db, COLLECTION.STAFF_ATTENDANCE), where("date", "==", date)));
  const records: Record<string, StaffAttendanceRecord> = {};
  snap.docs.forEach((item) => {
    const record = toStaffRecord(item.id, item.data());
    if (record.uid) records[record.uid] = record;
  });
  return records;
}

/** The log of a date (refused tries and admin changes), newest first. */
export async function loadStaffLog(date: string): Promise<StaffLogEntry[]> {
  const snap = await getDocs(query(collection(db, COLLECTION.STAFF_ATTENDANCE_LOG), where("date", "==", date)));
  return snap.docs
    .map((item): StaffLogEntry => {
      const data = item.data();
      return {
        id: item.id,
        type: data.type === "edit" ? "edit" : data.type === "deviceReset" ? "deviceReset" : "refused",
        uid: text(data.uid),
        name: text(data.name),
        date: text(data.date),
        code: text(data.code),
        message: text(data.message),
        reason: text(data.reason),
        byName: text(data.byName),
        model: text(data.model),
        distanceM: num(data.distanceM),
        at: millis(data.at),
      };
    })
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

/** The linked phone of every teacher, by uid. */
export async function loadStaffDevices(): Promise<Record<string, StaffDevice>> {
  const snap = await getDocs(collection(db, COLLECTION.STAFF_DEVICES));
  const devices: Record<string, StaffDevice> = {};
  snap.docs.forEach((item) => {
    const data = item.data();
    devices[item.id] = { uid: item.id, model: text(data.model), boundAt: millis(data.boundAt) };
  });
  return devices;
}

/** A selfie as a JPEG data URL, or "" when there is none. */
export async function loadStaffSelfie(recordId: string, action: "in" | "out"): Promise<string> {
  const snap = await getDoc(doc(db, COLLECTION.STAFF_SELFIES, `${recordId}_${action}`));
  const image = snap.exists() ? text(snap.data().image) : "";
  return image.startsWith("data:image/jpeg;base64,") ? image : "";
}

/* -------------------------------------------------------------- leave -- */

const LEAVE_STATUSES = new Set(["pending", "approved", "rejected", "cancelled"]);

function toLeave(id: string, data: DocumentData): StaffLeave {
  return {
    id,
    uid: text(data.uid),
    name: text(data.name),
    typeId: text(data.typeId),
    typeName: text(data.typeName),
    session: text(data.session),
    from: text(data.from),
    to: text(data.to),
    halfDay: data.halfDay === true,
    days: num(data.days) ?? 0,
    reason: text(data.reason),
    status: (LEAVE_STATUSES.has(data.status) ? data.status : "pending") as StaffLeave["status"],
    byAdmin: data.byAdmin === true,
    decidedByName: text(data.decidedByName),
    decisionNote: text(data.decisionNote),
    cancelReason: text(data.cancelReason),
    createdAt: millis(data.createdAt),
  };
}

/** Every leave of a session, newest first (admin). */
export async function loadStaffLeaves(session: string): Promise<StaffLeave[]> {
  const snap = await getDocs(query(collection(db, COLLECTION.STAFF_LEAVES), where("session", "==", session)));
  return snap.docs.map((item) => toLeave(item.id, item.data())).sort((a, b) => b.from.localeCompare(a.from));
}

/** Days used per person and type (approved + waiting): used[uid][typeId]. */
export function leaveUsage(leaves: StaffLeave[]): Record<string, Record<string, number>> {
  const used: Record<string, Record<string, number>> = {};
  leaves
    .filter((leave) => leave.status === "pending" || leave.status === "approved")
    .forEach((leave) => {
      used[leave.uid] = used[leave.uid] ?? {};
      used[leave.uid][leave.typeId] = (used[leave.uid][leave.typeId] ?? 0) + leave.days;
    });
  return used;
}

/* ------------------------------------------------------ server calls -- */

const callStaffApi = (path: string, body: unknown) => fetchServer(`/api/staff-attendance/${path}`, body);

async function fetchServer(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  });
  const answer = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(answer.error || "The server could not save this. Please try again.");
}

export interface StaffMarkInput {
  uid: string;
  date: string;
  status: StaffAttendanceStatus;
  /** "HH:mm" or "" (keeps the saved time). */
  checkIn: string;
  checkOut: string;
  reason: string;
}

/** The admin marks or corrects one person's day (logged with the reason). */
export const markStaffAttendance = (input: StaffMarkInput) => callStaffApi("mark", input);

export interface StaffLeaveInput {
  uid: string;
  typeId: string;
  from: string;
  to: string;
  halfDay: boolean;
  reason: string;
}

/** The admin adds a leave for a person (approved at once). */
export const addStaffLeave = (input: StaffLeaveInput) =>
  fetchServer("/api/staff-leave/request", input);

export const decideStaffLeave = (id: string, decision: "approved" | "rejected", note: string) =>
  fetchServer("/api/staff-leave/decide", { id, decision, note });

export const cancelStaffLeave = (id: string, reason: string) => fetchServer("/api/staff-leave/cancel", { id, reason });

/** Unlinks a teacher's phone; the next check-in links the new one. */
export const resetStaffDevice = (uid: string, reason: string) => callStaffApi("reset-device", { uid, reason });
