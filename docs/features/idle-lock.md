# Idle lock (admin panel)

After `IDLE_LOCK_MS` (5 minutes) without mouse, keyboard, wheel, scroll or touch activity, an
admin's panel locks: a full-screen, blurred lock screen that cannot be closed until the password is
entered again. Teachers are not locked (yet); later the same lock can guard sensitive actions
(e.g. fee changes).

The Office QR page (`/staff-qr`, staff attendance) is outside `/welcome` on purpose, so it is never
locked; going back to the panel from it uses the normal lock.

## Files

| File | What it does |
|---|---|
| `src/hooks/useIdleLock.ts` | Tracks activity, counts down (`remainingMs`), `lock()` / `unlock()`. Last activity (`IDLE_ACTIVITY_KEY`) and the lock (`IDLE_LOCKED_KEY` = uid) are in localStorage: shared by every open tab, and a reload stays locked |
| `src/component/IdleLockScreen.tsx` | Lock screen: password checked by Firebase (`reauthenticateWithCredential`), `IDLE_LOCK_MAX_ATTEMPTS` (5) wrong tries -> logged out; "Log out" button |
| `src/component/Welcome.tsx` | Uses the hook for admins; header timer chip (lock icon + m:ss, amber in the last minute, click = lock now); renders the lock screen |
| `src/constants.ts` | `IDLE_LOCK_MS`, `IDLE_LOCK_MAX_ATTEMPTS`, `IDLE_ACTIVITY_KEY`, `IDLE_LOCKED_KEY` |

## Password or PIN (Settings > Lock & PIN)

The admin chooses what the lock screen and the confirm dialog ask for: `panelSettings/lockSettings`
`{ unlockWith: "password" | "pin" }` (staff read, admin write). PIN mode is used for a user only
when they have a PIN that is not locked; otherwise the password is asked. "Use password instead"
is always shown under the PIN.

| File | What it does |
|---|---|
| `src/component/panel/settings/LockPinSection.tsx` | Settings section: two `CircleCheckbox`es, Password / PIN; the ticked one is saved (after the password) and only its form is shown: Password = change the account password (`changeAccountPassword` in `utils/verifyAccountPassword.ts`), PIN = set / change the PIN (the first PIN with PIN ticked switches PIN on). Save buttons off until changed |
| `src/utils/pinService.ts` | `loadUnlockSetting` / `saveUnlockSetting`, server calls `loadPinStatus`, `savePin`, `verifyPin`; `loadUnlockMethod()` = what to ask this user (cached 1 minute) |
| `src/hooks/useLockSettings.ts` | Setting + own PIN status for the section |
| `../server/router/pinHandler.js` | `GET /api/pin/status`, `POST /api/pin/verify`, `POST /api/pin/set` (admin; `uid` for a teacher later) |

- The PIN is only checked on the server: `pinSecrets/{uid}` holds a scrypt hash (random salt +
  `PIN_PEPPER` env of the server). Rules deny every client access to `pinSecrets`.
- 4 digits; easy PINs (`WEAK_PINS`, same list on the server) are refused.
- 5 wrong PINs in a row lock the PIN for 15 minutes on the server (the password still works);
  the server also limits PIN checks to 30 per 15 minutes per IP. On the lock screen PIN and
  password tries count together towards `IDLE_LOCK_MAX_ATTEMPTS` (logout); a server that cannot be
  reached does not count as a try.
- Teachers: not locked and no PIN yet (the server API already takes a `uid`).
- The mobile app still asks for the password.
- `CustomInput` with `type="password"` has a show / hide eye button (as on Login).
- `<main>` in `Welcome.tsx` is `relative`, so the hidden inputs Radix adds to checkboxes / radios inside a `<form>` cannot stretch the whole page (outer scrollbar).

## Change X -> look here

- Lock time / tries: constants. Who is locked: the `enabled` argument in `Welcome.tsx`
  (`user?.role === "admin"`).
- Locking before a sensitive action: call `lock()` (or reuse `IdleLockScreen`) at that action.

## Password before sensitive actions

`src/hooks/usePasswordConfirm.tsx` (Modal + CustomInput + `utils/verifyAccountPassword.ts`; the PIN instead when Lock & PIN says so) asks for the account
password every time before:

| Page | Action |
|---|---|
| Fees > Fee Structure | Save |
| Fees > Fee Settings | Save |
| Fees > Collect Fee | Cancel a receipt |
| Fees > Dues Report | Carry forward dues |
| Students > List | Delete (recycle bin) / Wrong entry |
| Students > Promote | Promote, Undo promotion |
| Add Teacher | Delete a teacher / staff |
| Settings > Permissions | Save (All Teachers and Individual Teacher) |
| Settings > All Class Lists | Delete a class's students (own password step, older code) |

The mobile app does the same for Permissions (`mobile/src/hooks/usePasswordConfirm.tsx`).

Usage: `const { confirmPassword, passwordDialog } = usePasswordConfirm();`, then
`if (!(await confirmPassword({ title }))) return;` at the start of the save, and `{passwordDialog}` once in the page.
It is checked in the browser only (Firestore rules do not ask for a recent login).
