# Transfer Certificate (TC)

Routes: `/welcome/student/tc` (`TC_PATH`, list + TC register), `/welcome/student/tc/edit?enrollment=<enrollmentId>[&id=<tcId>]`
(`TC_EDIT_PATH`, one TC), `/welcome/student/tc/settings` (`TC_SETTINGS_PATH`). Sidebar: Student > Transfer Certificate.
Website only (not in the mobile app). The printed format follows the school's sample TC (21 Hindi + English rows).

## Permissions

| Permission | Who | Allows |
|---|---|---|
| `tc.view` | admin; teacher if granted on the Permissions page | TC page, open saved TCs, print |
| `tc.issue` | admin; teacher if granted | make / save draft / issue / revise a TC of any class |
| `tc.settings` | admin only (`TEACHER_BLOCKED_PERMISSIONS`) | TC Settings |
| cancel a TC | admin only (role check, not a permission) | |

Neither `tc.view` nor `tc.issue` is ON by default for teachers. Both are excluded from
`LEGACY_CATALOG_PERMISSIONS`.

## Files

| File | What it does |
|---|---|
| `src/component/panel/students/tc/TcList.tsx` | Filters (session, class, section, TC status, search) and the table with a status chip and Generate / Continue / Open. Class "All classes (TC register)" (`TC_REGISTER_CLASS`) lists every TC of the session by Sr. No. |
| `src/component/panel/students/tc/TcEditor.tsx` | Form (`useForm<TcFields>`, one `TcInput` per row with one-click answers from `TC_SUGGESTIONS`), live A4 preview, actions, dialogs (issue, revise reason, cancel reason, delete draft), fee-due warning, history list, Print (`@page A4 margin 0`) |
| `src/component/panel/students/tc/TcSheet.tsx` | `TcSheet` = the printed page (inline styles, Times New Roman except the name: Affiliation No. top-left + U-DISE Code top-right, letterhead with the school name in the Cancun font coloured word by word (`TC_NAME_COLORS`), numbers box in two lines (Scholar No. | Book No. | Sr. No., then P.E.N. | TC No.), `TC_ROWS`, QR code, signatures, note, DRAFT / CANCELLED stamp, DUPLICATE mark). `TcPage` = A4 box (margin 8 mm top / bottom, 7 mm sides) that the sheet fills top to bottom (spare height goes between the rows) and that scales tall content down to one page. `TcPreview` = scaled to fill the parent width (also above 100%), real size in print |
| `src/component/panel/students/tc/TcSettingsPage.tsx` | Letterhead (name, affiliation line / No., School Code, U-DISE; the address is fixed: `TC_SCHOOL_ADDRESS`; e-mail / website / phone line under it), school category, QR on/off, principal sign + stamp on/off, Book No., last Sr. No. |
| `src/utils/tcService.ts` | Firestore: `loadTcSettings` / `saveTcSettings`, `loadTcRows`, `loadTc`, `loadStudentTcs`, `loadTcStudent`, `buildTcPrefill`, `loadTcRecords` (attendance + fee due), `saveTcDraft`, `issueTc` (transaction), `reviseTc`, `cancelTc`, `markTcPrinted`, `deleteTcDraft` |
| `src/utils/transferCertificate.ts` | Pure helpers: `emptyTcFields`, `readTcFields` / `readTcSettings` / `readTransferCertificate`, `currentTc`, `formatTcNo`, `fullSession`, `romanClass`, `tcDateText`, `dateInWords`, `tcQrText` |
| `src/hooks/useTcSettings.ts`, `useTcRows.ts`, `useTcEditor.ts`, `useTcRecords.ts` | Reads |
| `src/constants.ts` | `TC_*` paths, `TC_SETTINGS_DOC`, `DEFAULT_TC_SETTINGS`, `DEFAULT_TC_NOTE`, `TC_ROWS` (labels), `TC_DATE_FIELDS`, `TC_SUGGESTIONS`, `TC_STATUS_META`, `TC_NAME_COLORS`, `TC_SCHOOL_ADDRESS` |
| `src/utils/type.ts` | `TcFields`, `TcRow`, `TcSchoolDetails`, `TcSettings`, `TransferCertificate`, `TcStudent`, `TcStudentRow`, `TcRecords`, `TcHistoryEntry` |

## Data

- `transferCertificates/{autoId}`: `studentId`, `enrollmentId`, `session`, `className`, `section`,
  `status` (`draft` | `issued` | `cancelled`), `srNo` (0 until issued), `bookNo`, `tcNo`
  (`2026-2027/<book>/<sr>`), `fields` (`TcFields`, all text, dates `yyyy-MM-dd`), `school`
  (letterhead copied at issue; null on a draft, which uses the live settings), `printCount`,
  `lastPrintedAt`, `createdAt` / `issuedAt` / `cancelledAt` (ISO), `issuedByName`, `duesAtIssue`,
  `cancelReason`, `history` (`Issued` / `Revised` with `previous` fields / `Cancelled`).
- `settings/transferCertificate`: `TcSettings` (letterhead, `schoolCategory`, `bookNo`, `lastSerial`).
- Issue marks `enrollments/{id}`: `isDeleted: true`, `leftReason: "tc"`, `tcNo`, `leftAt`. So the
  student moves to the Student List recycle bin. Cancel (admin) clears these again.

## Flow

1. New TC: `buildTcPrefill` fills the fields from `students` (names in capitals, P.E.N. from `penOfStudent`, DOB + words,
   category, nationality, address + city), the first enrollment (admission class), `subjects` of
   the class the TC is for (editable), `createdAt` (admission date; imported students have none) and the settings.
   `loadTcRecords` counts marked days / present days of the section up to the struck-off date and
   the fee due up to that month (`duesUpTo`). A new TC fills rows 12, 13, 17 and 18 from them if
   they are empty. A teacher cannot read fees, so the page says so.
2. Save Draft (any number of times) -> Issue TC. Issue runs one transaction: the Sr. No. is
   `lastSerial + 1`, the TC is saved as issued, `lastSerial` is updated and the student is marked Left.
   A fee due only warns.
3. Issued = locked. **Revise** asks for a reason and keeps the old fields in `history`.
   **Cancel** (admin) needs a reason: CANCELLED stamp, number not reused, student back.
   Then **Make a new TC** starts a fresh one.
4. Print: the first print of an issued TC is the original. `printCount` goes up after it, and every
   later print shows DUPLICATE. A draft prints with a DRAFT watermark.

## Change X -> look here

- Labels / order of the printed rows: `TC_ROWS` (constants). New field: `TcFields` (type.ts),
  `TC_FIELD_KEYS` (transferCertificate.ts), `TC_ROWS`, `buildTcPrefill` if it can be filled.
- Look of the printed TC: `TcSheet.tsx`. QR content: `tcQrText`.
- TC No. format: `formatTcNo`.
- Firestore rules: `transferCertificates`, `settings/transferCertificate` (tc.issue may only add 1
  to `lastSerial`) and the `enrollments` Left update in `firestore.rules`. They were tested on the
  emulator (21 cases).

## Gotchas

- Restoring a TC student from the Student List recycle bin does not cancel the TC. Cancel the
  TC instead.
- Roll numbers are refreshed after issue only when the user is an admin. A teacher's try fails
  quietly because of the rules.
