import { useCallback, useEffect, useRef, useState } from "react";

import { IDLE_ACTIVITY_KEY, IDLE_LOCK_MS, IDLE_LOCKED_KEY } from "../constants";

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the lock still works in this tab.
  }
};

/** Activity that keeps the panel unlocked. */
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Idle lock for a signed-in user (`uid`): after IDLE_LOCK_MS without mouse,
 * keyboard or touch activity the panel locks. The last activity and the lock
 * live in localStorage, so every open tab shares them and a reload does not
 * unlock. `remainingMs` drives the header timer.
 */
export function useIdleLock(uid: string | null, enabled: boolean) {
  const active = enabled && Boolean(uid);
  const [locked, setLocked] = useState(() => active && read(IDLE_LOCKED_KEY) === uid);
  const [remainingMs, setRemainingMs] = useState(IDLE_LOCK_MS);
  const lastWrite = useRef(0);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const lock = useCallback(() => {
    if (!uid) return;
    write(IDLE_LOCKED_KEY, uid);
    setLocked(true);
  }, [uid]);

  const unlock = useCallback(() => {
    write(IDLE_LOCKED_KEY, null);
    write(IDLE_ACTIVITY_KEY, String(Date.now()));
    setLocked(false);
    setRemainingMs(IDLE_LOCK_MS);
  }, []);

  useEffect(() => {
    if (!active) {
      setLocked(false);
      return;
    }
    // A lock left by another user is not this user's.
    const lockedUid = read(IDLE_LOCKED_KEY);
    if (lockedUid && lockedUid !== uid) write(IDLE_LOCKED_KEY, null);
    if (lockedUid === uid) setLocked(true);
    if (!read(IDLE_ACTIVITY_KEY) || lockedUid !== uid) write(IDLE_ACTIVITY_KEY, String(Date.now()));

    const onActivity = () => {
      if (lockedRef.current) return;
      const now = Date.now();
      // At most one write a second.
      if (now - lastWrite.current > 1000) {
        lastWrite.current = now;
        write(IDLE_ACTIVITY_KEY, String(now));
      }
    };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));

    const tick = window.setInterval(() => {
      if (read(IDLE_LOCKED_KEY) === uid) {
        if (!lockedRef.current) setLocked(true);
        return;
      }
      if (lockedRef.current) {
        // Unlocked in another tab.
        setLocked(false);
      }
      const last = Number(read(IDLE_ACTIVITY_KEY)) || Date.now();
      const left = Math.max(0, IDLE_LOCK_MS - (Date.now() - last));
      setRemainingMs(left);
      if (left === 0) lock();
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
      window.clearInterval(tick);
    };
  }, [active, uid, lock]);

  return { locked: active && locked, remainingMs, lock, unlock };
}

export default useIdleLock;
