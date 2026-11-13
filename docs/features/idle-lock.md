# Idle lock (admin panel)

After `IDLE_LOCK_MS` (5 minutes) without mouse, keyboard, wheel, scroll or touch activity, an
admin's panel locks: a full-screen, blurred lock screen that cannot be closed until the password is
entered again. Teachers are not locked (yet); later the same lock can guard sensitive actions
(e.g. fee changes).

## Files

| File | What it does |
|---|---|
| `src/hooks/useIdleLock.ts` | Tracks activity, counts down (`remainingMs`), `lock()` / `unlock()`. Last activity (`IDLE_ACTIVITY_KEY`) and the lock (`IDLE_LOCKED_KEY` = uid) are in localStorage: shared by every open tab, and a reload stays locked |
| `src/component/IdleLockScreen.tsx` | Lock screen: password checked by Firebase (`reauthenticateWithCredential`), `IDLE_LOCK_MAX_ATTEMPTS` (5) wrong tries -> logged out; "Log out" button |
| `src/component/Welcome.tsx` | Uses the hook for admins; header timer chip (lock icon + m:ss, amber in the last minute, click = lock now); renders the lock screen |
| `src/constants.ts` | `IDLE_LOCK_MS`, `IDLE_LOCK_MAX_ATTEMPTS`, `IDLE_ACTIVITY_KEY`, `IDLE_LOCKED_KEY` |

## Change X -> look here

- Lock time / tries: constants. Who is locked: the `enabled` argument in `Welcome.tsx`
  (`user?.role === "admin"`).
- Locking before a sensitive action: call `lock()` (or reuse `IdleLockScreen`) at that action.
