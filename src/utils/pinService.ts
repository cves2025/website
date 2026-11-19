/**
 * Unlock PIN: the setting (password or PIN, panelSettings/lockSettings) and
 * the server calls. The PIN is only ever checked on the server
 * (`/api/pin/*`); the browser never sees a hash.
 */
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { API_BASE_URL, authHeaders } from "../component/context/api";
import { COLLECTION, LOCK_SETTINGS_DOC, type UnlockMethod } from "../constants";
import { db } from "../firebase/config";

export interface PinStatus {
  set: boolean;
  /** When the PIN was last set (ms), null = never. */
  updatedAt: number | null;
  /** The PIN is locked after too many wrong tries until this time (ms). */
  lockedUntil: number | null;
}

export type PinCheck =
  | { ok: true }
  | { ok: false; code: "WRONG_PIN" | "PIN_LOCKED" | "PIN_NOT_SET" | "ERROR"; message: string; triesLeft?: number };

const lockRef = () => doc(db, COLLECTION.PANEL_SETTINGS, LOCK_SETTINGS_DOC);

/** The school's choice; "password" when nothing is saved. */
export async function loadUnlockSetting(): Promise<UnlockMethod> {
  const snap = await getDoc(lockRef());
  return snap.exists() && snap.data().unlockWith === "pin" ? "pin" : "password";
}

export async function saveUnlockSetting(method: UnlockMethod, uid: string): Promise<void> {
  await setDoc(lockRef(), { unlockWith: method, updatedAt: serverTimestamp(), updatedBy: uid });
  cachedMethod = null;
}

async function callPinApi<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<{ status: number; body: T }> {
  const response = await fetch(`${API_BASE_URL}/api/pin/${path}`, {
    method: init.method,
    headers: await authHeaders(),
    credentials: "include",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

export async function loadPinStatus(): Promise<PinStatus> {
  const { status, body } = await callPinApi<Partial<PinStatus> & { error?: string }>("status", { method: "GET" });
  if (status !== 200) throw new Error(body.error || "The PIN status could not be read.");
  return { set: body.set === true, updatedAt: body.updatedAt ?? null, lockedUntil: body.lockedUntil ?? null };
}

/** Saves the signed-in admin's PIN (the server refuses easy PINs). */
export async function savePin(pin: string): Promise<void> {
  const { status, body } = await callPinApi<{ error?: string }>("set", { method: "POST", body: { pin } });
  if (status !== 200) throw new Error(body.error || "The PIN could not be saved.");
  cachedMethod = null;
}

export async function verifyPin(pin: string): Promise<PinCheck> {
  try {
    const { status, body } = await callPinApi<{ error?: string; code?: string; triesLeft?: number }>("verify", {
      method: "POST",
      body: { pin },
    });
    if (status === 200) return { ok: true };
    const code =
      body.code === "WRONG_PIN" || body.code === "PIN_LOCKED" || body.code === "PIN_NOT_SET" ? body.code : "ERROR";
    return {
      ok: false,
      code: status === 429 ? "PIN_LOCKED" : code,
      message: body.error || "The PIN could not be checked. Please try again.",
      triesLeft: body.triesLeft,
    };
  } catch {
    return { ok: false, code: "ERROR", message: "The PIN could not be checked. Check the internet and try again." };
  }
}

/** Remembered for a minute, so dialogs open at once; saving the setting / PIN clears it. */
let cachedMethod: { value: UnlockMethod; at: number } | null = null;
const CACHE_MS = 60 * 1000;

/**
 * What to ask this user for: "pin" only when the school chose PIN and this
 * user has a PIN that is not locked; otherwise (or when anything fails) "password".
 */
export async function loadUnlockMethod(): Promise<UnlockMethod> {
  if (cachedMethod && Date.now() - cachedMethod.at < CACHE_MS) return cachedMethod.value;
  let value: UnlockMethod = "password";
  try {
    if ((await loadUnlockSetting()) === "pin") {
      const status = await loadPinStatus();
      value = status.set && !status.lockedUntil ? "pin" : "password";
    }
  } catch (cause) {
    console.warn("Unlock method could not be read; asking for the password.", cause);
  }
  cachedMethod = { value, at: Date.now() };
  return value;
}

/** After a PIN lock the next dialog must not offer the PIN again from the cache. */
export function forgetUnlockMethod(): void {
  cachedMethod = null;
}
