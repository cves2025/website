/**
 * Firestore access for the school-wide exam rules. The rules live in ONE
 * document: `panelSettings/exam`. A module-level cache keeps every screen on
 * the same copy; saving rules here replaces the cache and notifies listeners,
 * so other open pages pick up the new values without a full reload.
 */
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import {
  DEFAULT_EXAM_RULES,
  sanitizeExamRules,
  validateExamRules,
  type ExamRules,
} from "./examRules";

/** Document id inside COLLECTION.PANEL_SETTINGS that holds the exam rules. */
const EXAM_RULES_DOC = "exam";

/** In-memory copy of the rules; null until the first successful load. */
let cachedExamRules: ExamRules | null = null;

type CacheListener = (rules: ExamRules) => void;
const cacheListeners = new Set<CacheListener>();

function notifyCacheListeners(): void {
  const current = cachedExamRules;
  if (current) {
    cacheListeners.forEach((listener) => listener(current));
  }
}

/** Latest known rules, or null the very first time nothing was loaded yet. */
export function getCachedExamRules(): ExamRules | null {
  return cachedExamRules;
}

/** Registers a listener fired whenever the cached rules are replaced. */
export function subscribeExamRules(listener: CacheListener): () => void {
  cacheListeners.add(listener);
  return () => {
    cacheListeners.delete(listener);
  };
}

/** Replaces the cached rules and notifies every subscribed screen. */
export function setCachedExamRules(rules: ExamRules): void {
  cachedExamRules = rules;
  notifyCacheListeners();
}

/**
 * Reads `panelSettings/exam` merged over the defaults.
 *
 * Two distinct cases:
 *  - the document does not exist  -> the defaults are the correct value;
 *  - the read FAILED (network/permission) -> the error propagates to the
 *    caller, which surfaces an error state instead of pretending the defaults
 *    are the real settings.
 */
export async function loadExamRules(): Promise<ExamRules> {
  const snapshot = await getDoc(
    doc(db, COLLECTION.PANEL_SETTINGS, EXAM_RULES_DOC)
  );
  if (!snapshot.exists()) return DEFAULT_EXAM_RULES;
  return sanitizeExamRules(snapshot.data());
}

/**
 * Validates and saves the exam rules (`setDoc` merge so a future concurrent
 * writer cannot clobber other fields of the document). The in-memory cache is
 * replaced right after a successful write, so every screen using the shared
 * cache re-renders with the new rules.
 */
export async function saveExamRules(rules: ExamRules): Promise<void> {
  const validationError = validateExamRules(rules);
  if (validationError) throw new Error(validationError);
  const toSave = sanitizeExamRules(rules);
  await setDoc(
    doc(db, COLLECTION.PANEL_SETTINGS, EXAM_RULES_DOC),
    {
      ...toSave,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  setCachedExamRules(toSave);
}