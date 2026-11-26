# UDISE+ (testing)

Route `/welcome/udise` (`UDISE_PATH`), `?tab=settings` = UDISE Settings. Sidebar: Student > UDISE+ (Testing).
Admin only (`udise.manage`, in `TEACHER_BLOCKED_PERMISSIONS`). Website only.

Purpose: the answers each student needs on the UDISE+ SDMS portal (sdms.udiseplus.gov.in): General
Profile (GP, 4.1.x), Enrolment Profile (EP, 4.2.x), Facility Profile (FP, 4.3.x). A browser helper
(Chrome extension, next step) will fill the portal with them; the user logs in and presses Save.

**A separate module (user's rule):** it only READS `students`, `enrollments` and roll numbers. Its own
answers live in `udiseStudents`, its settings in `settings/udise` and inside the UDISE page (not the
main Settings page). Add Student / the student form are not changed. Full integration only after
testing.

## Files

| File | What it does |
|---|---|
| `src/component/panel/udise/UdisePage.tsx` | Tabs Students / UDISE Settings; filters (session, class, section); table (roll, student, Adm. No., PEN, fields still needed) with **Answers** per student |
| `src/component/panel/udise/UdiseStudentEditor.tsx` | Modal: every field of GP / EP / FP with the hint (Records: … / Default: …), the live Final answer and its source, red when the portal needs it and it is empty. Save (off until changed) writes `udiseStudents`. **Copy for portal** copies the final answers as JSON (`kind: "cves-udise"`) for testing the helper |
| `src/component/panel/udise/UdiseSettingsTab.tsx` | School default of every `defaultable` field + our class -> portal class code |
| `src/component/panel/udise/UdiseFieldInput.tsx` | One field as input (text / number / CustomSelect with a "not set" choice / checkbox group for multi) |
| `src/utils/udiseRecord.ts` | Pure: `udiseFromRecords` (our data -> portal codes), `udiseAnswers` (student > records > default; fields that need a "Yes" first are emptied), `udiseMissing`, `udiseAnswerText`, `readUdiseSettings`, `cleanUdiseValues`, `toUdiseForm` / `fromUdiseForm` |
| `src/utils/udiseService.ts` | Firestore: `loadUdiseSettings` / `saveUdiseSettings` (whole doc), `loadUdiseSection` (enrollments of a section + their `students`, `udiseStudents`, previous-session enrollments, roll numbers; `in` queries of 30), `saveUdiseStudent` |
| `src/hooks/useUdise.ts` | `useUdiseSettings`, `useUdiseSection` |
| `src/constants.ts` (UDISE block) | `UDISE_FIELDS` (key = portal `formcontrolname`, step, question no., kind, options with portal codes, `required`, `derived`, `defaultable`, `radio` ids), `DEFAULT_UDISE_SETTINGS`, `DEFAULT_UDISE_CLASS_CODES`, `UDISE_CLASS_OPTIONS`, `UDISE_CATEGORY_CODES`, `UDISE_BLOOD_GROUP_CODES`, `UDISE_NONE`, `UDISE_MULTI_SEPARATOR` |
| `src/utils/type.ts` (UDISE block) | `UdiseStep`, `UdiseFieldDef`, `UdiseValues`, `UdiseSettings`, `UdiseStudentDoc`, `UdiseAnswer`, `UdiseStudentRow`, `UdiseForm` |

## Data

- `udiseStudents/{studentId}`: `{ values: { <formcontrolname>: text }, updatedAt, updatedBy, updatedByName }`.
  Only answers typed for that student; empty ones are not saved. Multi answers joined with `|`.
  Yes / No saved as `Y` / `N` (the helper clicks the `radio` ids).
- `settings/udise`: `{ defaults: { key: text }, classCodes: { ourClass: portalCode }, updatedBy, updatedAt }`.
- Rules: `udiseStudents` read / write `isAdmin()`; `settings/udise` falls under `settings/{docId}`
  (staff read, admin write).

## Where an answer comes from (`udiseAnswers`)

1. Typed for the student (UDISE page) - always wins.
2. Our records (`derived` fields): address + city, pin, phone, phone2, e-mail, category
   (General/SC/ST/OBC -> 1/2/3/4), nationality (INDIAN -> Yes), blood group (A+ ... -> 1..8),
   Adm. No. (enrollment), admission date (`admissionDate`, else `createdAt` of the student),
   roll number, previous session's enrollment -> status 1 + its class (via class codes), height, weight.
3. The school default (Settings tab).

Locked on the portal (name, gender, DOB, parents, Aadhaar) are not filled; the helper may compare them.
The school is Pvt. Unaided: the portal's FP has no "facilities provided" inputs for it.

## Next steps

- Chrome extension (separate folder): reads the PEN on the portal page, fills GP / EP / FP from the
  answers (first by pasting the "Copy for portal" JSON, later from Firestore), never presses Save.
- Days attended last year (`attendancePy`) from our attendance; marks % from results.
