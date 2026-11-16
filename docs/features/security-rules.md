# Security rules (Firestore + Storage)

One `firestore.rules` and one `storage.rules` for dev and prod, website and mobile app.

Deploy:
- Dev: `npm run deploy:rules:dev` (Firestore `(default)` + Storage).
- Prod: `npm run deploy:rules:prod`.

On the first Storage deploy the CLI asks to let Storage rules read Firestore. Say yes.

## Files

| File | What it does |
|---|---|
| `firestore.rules` | Who may read / write each collection |
| `storage.rules` | Who may upload / delete in each Storage folder, file type + size |
| `firebase.json` / `firebase.prod.json` | Which rules go to which project |

## Who is who

| Name in rules | Meaning (same as `MyContextProvider.buildUser`) |
|---|---|
| public | Anyone, also not signed in (website pages) |
| staff | Signed in, `users/{uid}` with role `admin` / `teacher`, not deleted, status `Active` or empty |
| admin | Staff with role `admin` |
| `can(p)` | Admin, or a teacher with permission `p` |

`can(p)` for a teacher works in this order:
1. It starts from the school defaults in `panelSettings/rolePermissions`, or the built-in lists when that document is missing.
2. It adds the teacher's own `permissionOverrides`.
3. Admin-only permissions are never given.

These lists are copied from `src/permissions`.

Class teacher is read from the `isClassTeacher` flag on the user document. Rules cannot look inside the `sectionAssignments` list.

## Firestore

| Collection | Read | Write |
|---|---|---|
| `users` | own doc, staff | admin; own doc: only `lastSeenReleaseId`, `updatedAt` |
| `students`, `enrollments`, `rollNumber`, `exams`, `stampSign` | staff | admin |
| `subjects` | staff | `subject.manage` |
| `examSchedules` | staff | `admitcard.generate` |
| `marks`, `marksProgress`, `examSheets`, `attendance` | staff | `marks.enter` |
| `dailyAttendance` | staff | `attendance.mark` |
| `holidayCalendar` | staff | `holiday.manage` |
| `news`, `gallery`, `downloads` | public if `isPublished`, else staff | `news.manage` / `gallery.manage` / `downloads.manage` |
| `settings/homeBanner` | public | `banner.manage` |
| `settings/*` (admitCard, idCard) | staff | admin |
| `panelSettings/siteImages`, `galleryImport` | public | `gallery.manage` |
| `panelSettings/rolePermissions` | signed in | admin |
| `panelSettings/*` (exam, suggestedRemarks, enrollmentCounter) | staff | admin |
| `feeStructures` | public | admin, never deleted |
| `feeSettings`, `feeAccounts`, `feePayments`, `feeCounters` | admin | admin. Receipts are only cancelled; the counter only goes up by 1 |
| anything else | no | no |

## Storage

Files are shown through download URLs. The token in the URL skips the rules, so public pages keep working. Reading through the SDK needs staff.

| Folder | Upload / delete | File |
|---|---|---|
| `news/`, `gallery/`, `banner/`, `site/` | staff | image < 10 MB |
| `downloads/` | staff | PDF < 20 MB |
| `students/`, `teachers/photos/`, `idCard/images/` | admin | image < 10 MB |
| anything else | no | |

## Change X -> look here

- **New collection or Storage folder:** add a `match` block. Without one, the app gets "permission denied".
- **New or changed permission or default list** in `src/permissions`: change the same list in the "teacher permissions" functions of `firestore.rules`.
- **Test before deploying:** run `firebase emulators:exec --only firestore,storage` with `@firebase/rules-unit-testing`.
