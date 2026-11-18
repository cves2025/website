# Transfer Certificate (TC)

Routes: `/welcome/student/tc` (`TC_PATH`, list + TC register), `/welcome/student/tc/edit?enrollment=<enrollmentId>[&id=<tcId>]`
(`TC_EDIT_PATH`, one TC), `/welcome/student/tc/settings` (`TC_SETTINGS_PATH`). Sidebar: Student > Transfer Certificate.
Public, no login: `/verify-tc/<tcId>` (`TC_VERIFY_PATH`), the page the TC's QR code opens.
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
| `src/component/panel/students/tc/TcList.tsx` | Filters (session, class, section, TC status, search; `?session=&class=` set the first two, e.g. from the dashboard) and the table with the student photo (`StudentPhoto` cell, `useStudentPhoto`: one cached read of `students/{id}` per student), a status chip and Generate / Continue / Open. Class "All classes (TC register)" (`TC_REGISTER_CLASS`) lists every TC of the session by Sr. No. |
| `src/component/panel/students/tc/TcEditor.tsx` | Form (`useForm<TcFields>`, one `TcInput` per row with one-click answers from `TC_SUGGESTIONS`; date fields use the shadcn `DatePicker` with month / year dropdowns and DD/MM/YYYY typing, years `TC_DATE_YEARS_BACK` back to `TC_DATE_YEARS_AHEAD` ahead; Book No. + Sr. No. + TC No. inputs at the top, locked once issued; TC No. filled once with `nextTcNo(last issued TC No.)` from `useLastTcNo`, editable), live A4 preview, actions (Save Draft of a saved draft and Save changes of a revision are off until the form is changed: RHF `isDirty`), dialogs (issue, revise reason, cancel reason, delete draft), fee-due warning, history list, Print (`@page A4 margin 0`) |
| `src/component/panel/students/tc/TcSheet.tsx` | `TcSheet` = the printed page (inline styles, Times New Roman except the name: Affiliation No. top-left + U-DISE Code top-right, letterhead with the school name in the Cancun font coloured word by word (`TC_NAME_COLORS`), numbers box in two lines (Scholar No. | Book No. | Sr. No., then P.E.N. | TC No.), `TC_ROWS`, QR code (prop `verifyUrl`; a dashed "after issue" box on a draft), signatures, note, DRAFT / CANCELLED stamp, DUPLICATE mark). `TcPage` = A4 box (margin 8 mm top / bottom, 4 mm sides) that the sheet fills top to bottom (spare height goes between the rows) and that scales tall content down to one page. `TcPreview` = scaled to fill the parent width (also above 100%), real size in print |
| `src/component/panel/students/tc/TcDashboardCard.tsx` | Dashboard card: TCs of a session (counts only) + session-wise bars; see [dashboard.md](dashboard.md) |
| `src/component/panel/students/tc/TcSettingsPage.tsx` | Letterhead (name, affiliation line / No., School Code, U-DISE; the address is fixed: `TC_SCHOOL_ADDRESS`; e-mail / website / phone line under it), Prepared By / Checked By names (printed on every TC; not on the TC form), Save Settings off until a field changes (RHF `isDirty`, `isSubmitting`; reset to the saved values after saving), school category, QR on/off, principal sign + stamp on/off. No numbering: Book No. / Sr. No. are typed on each TC |
| `src/utils/tcService.ts` | Firestore: `loadTcSettings` / `saveTcSettings`, `loadTcRows`, `loadTc`, `loadStudentTcs`, `loadTcStudent`, `buildTcPrefill`, `loadTcRecords` (attendance + fee due), `saveTcDraft`, `issueTc` (transaction), `reviseTc`, `cancelTc` (both batches with the verify copy), `markTcPrinted`, `deleteTcDraft`, `loadTcVerify` (public) |
| `src/component/TcVerify.tsx` | Public verify page (`/verify-tc/:tcId`, inside the public site's header / menu / footer): Valid (green) / Cancelled (red) / Not found, with TC No., name, father, class, session, struck-off and issue date. Hook `useTcVerify` |
| `src/utils/transferCertificate.ts` | Pure helpers: `emptyTcFields`, `readTcFields` / `readTcSettings` / `readTransferCertificate`, `currentTc`, `tcSerial`, `tcNumberProblem`, `tcSerialLockKey` / `tcNoLockKey`, `nextTcNo` (last number + 1), `romanClass`, `tcDateText`, `dateInWords`, `tcVerifyUrl` (QR link = `window.location.origin` + `/verify-tc/<tcId>`), `tcVerifyRecord` / `readTcVerify` |
| `src/hooks/useTcSettings.ts`, `useTcRows.ts`, `useTcEditor.ts`, `useTcRecords.ts`, `useTcVerify.ts`, `useLastTcNo.ts` | Reads |
| `src/constants.ts` | `TC_*` paths, `TC_SETTINGS_DOC`, `DEFAULT_TC_SETTINGS`, `DEFAULT_TC_NOTE`, `TC_ROWS` (labels), `TC_DATE_FIELDS`, `TC_SUGGESTIONS`, `TC_STATUS_META`, `TC_NAME_COLORS`, `TC_SCHOOL_ADDRESS` |
| `src/utils/type.ts` | `TcFields`, `TcRow`, `TcSchoolDetails`, `TcSettings`, `TransferCertificate`, `TcStudent`, `TcStudentRow`, `TcRecords`, `TcHistoryEntry`, `TcVerifyRecord` |

## Data

- `transferCertificates/{autoId}`: `studentId`, `enrollmentId`, `session`, `className`, `section`,
  `status` (`draft` | `issued` | `cancelled`), `srNo` (0 until issued), `bookNo`, `tcNo`
  (`2026-2027/<book>/<sr>`), `fields` (`TcFields`, all text, dates `yyyy-MM-dd`), `school`
  (letterhead + Prepared By / Checked By names copied at issue; null on a draft, which uses the
  live settings), `printCount`,
  `lastPrintedAt`, `createdAt` / `issuedAt` / `cancelledAt` (ISO), `issuedByName`, `duesAtIssue`,
  `cancelReason`, `history` (`Issued` / `Revised` with `previous` fields / `Cancelled`).
- `tcVerify/{tcId}` (same id as the TC): the public copy for the verify page, `TcVerifyRecord`
  (`status` issued | cancelled, `tcNo`, `studentName`, `fatherName`, `lastClass`, `session`,
  `struckOffDate`, `issueDate`, `cancelledAt`, `schoolName`, `updatedAt`). No DOB, address or fees.
  Written with the TC on issue (transaction), revise and cancel (batch). Anyone may `get` one,
  nobody may list them; the rules check it matches the TC after the write (`tcAfter`).
- `tcNumbers/sr_<book>_<sr>` and `tcNumbers/tc_<TC No. with / as _>`: `tcId`, `tcNo`, `createdAt`.
  Two locks per issued TC, written in the issue transaction, never changed or deleted (a cancelled
  TC keeps its numbers). The rules only let a TC become issued when both locks are written for
  it (`tcNumberLocked`), so neither the Sr. No. nor the TC No. is ever on two TCs.
- `settings/transferCertificate`: `TcSettings` (letterhead, `schoolCategory`). Old `bookNo` /
  `lastSerial` keys there are no longer used.
- Issue marks `enrollments/{id}`: `isDeleted: true`, `leftReason: "tc"`, `tcNo`, `leftAt`. So the
  student moves to the Student List recycle bin. Cancel (admin) clears these again.

## Flow

1. New TC: `buildTcPrefill` fills the fields from `students` (names in capitals, P.E.N. from `penOfStudent`, DOB + words,
   category, nationality, address + city), the first enrollment (admission class), `subjects` of
   the class the TC is for (editable), `createdAt` (admission date; imported students have none) and the settings.
   `loadTcRecords` counts marked days / present days of the section up to the struck-off date and
   the fee due up to that month (`duesUpTo`). A new TC fills rows 12, 13, 17 and 18 from them if
   they are empty. A teacher cannot read fees, so the page says so.
2. Save Draft (any number of times) -> Issue TC. The admin types the Book No. (letters, digits,
   `-`; `TC_BOOK_NO_PATTERN`), the Sr. No. and the TC No. (`TC_NO_PATTERN`; filled in with the
   last issued TC No. + 1 by `loadLastTcNo` / `nextTcNo`, changeable). `tcNumberProblem` checks
   them; Issue stays disabled until all are fine. Issue runs one transaction: if a lock exists it
   stops with `TC_SERIAL_USED` (toast names the TC that has it) or `TC_NO_USED`; else the TC is
   saved as issued (`fields.bookNo` / `srNo` / `tcNo` and top-level `bookNo` / `srNo` / `tcNo`),
   both locks are written and the student is marked Left.
   A fee due only warns.
3. Issued = locked. **Revise** asks for a reason and keeps the old fields in `history`.
   **Cancel** (admin) needs a reason: CANCELLED stamp, number not reused, student back.
   Then **Make a new TC** starts a fresh one.
4. Print: the first print of an issued TC is the original. `printCount` goes up after it, and every
   later print shows DUPLICATE. A draft prints with a DRAFT watermark.
5. QR: an issued / cancelled TC prints a QR with only its public link (`tcVerifyUrl`). Scanning
   opens the verify page, which reads `tcVerify/{tcId}` live, so a cancelled TC shows CANCELLED
   and a fake QR shows Not found. The TC id is a random 20-character id, so links cannot be guessed.

## Change X -> look here

- Labels / order of the printed rows: `TC_ROWS` (constants). New field: `TcFields` (type.ts),
  `TC_FIELD_KEYS` (transferCertificate.ts), `TC_ROWS`, `buildTcPrefill` if it can be filled.
- Look of the printed TC: `TcSheet.tsx`. QR link: `tcVerifyUrl`. What the verify page shows:
  `TcVerifyRecord` + `tcVerifyRecord` + the `tcVerify` key list in `firestore.rules` + `TcVerify.tsx`.
- TC No.: typed by the admin; the suggestion is `nextTcNo` (last digits + 1) of `loadLastTcNo`.
- Firestore rules: `transferCertificates`,
  `tcNumbers` (`tcNumberLocked`), `tcVerify` and the `enrollments` Left update in `firestore.rules`.
  They were tested on the emulator (32 + 20 verify cases).

## Gotchas

- Restoring a TC student from the Student List recycle bin does not cancel the TC. Cancel the
  TC instead.
- The QR link uses the address the TC is printed from (`window.location.origin`). Print real TCs
  from the live site (www.cves.in), not from localhost or the dev site.
- A TC issued before the verify page existed has no `tcVerify` copy; its QR says Not found until
  it is revised once (revise writes the copy).
- Roll numbers are refreshed after issue only when the user is an admin. A teacher's try fails
  quietly because of the rules.
