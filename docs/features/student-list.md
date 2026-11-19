# Student List (and its recycle bin)

Route `/welcome/student/list` (permission `STUDENT_READ`). Admins see every class; a teacher only
the class + section pairs assigned to them. Adding / editing a student and the Enrollment No.
rules: [add-student.md](add-student.md).

## Files

| File | What it does |
|---|---|
| `src/component/panel/students/StudentList.tsx` | The whole page: filters (search, academic year, class, section), table, sorting, pagination, View / Edit / Delete, delete dialog, recycle bin |
| `src/utils/studentScope.ts` | `allowedClassSections(scope)` (a teacher's pairs), `buildQuerySpecs` (which Firestore queries a filter needs), `specKey` / `rowsFromCache` (answer a narrower filter from rows already read), `pairKey` |
| `src/utils/studentRemoval.ts` | `wrongEntryBlocker`, `removeWrongEntry` (wrong entry = removed for good) |
| `src/utils/rollNumbers.ts` | `generateClassRollNumbers` - run after a remove / restore so roll numbers close up |
| `src/permissions` | `scopedSections`, `PERMISSIONS.STUDENT_CREATE` (= can manage: edit, delete, bin), `STUDENT_FORM_VIEW` (View button), `STUDENT_EXPORT` (Download Excel) |
| `src/component/panel/students/StudentExportModal.tsx` | Download Excel modal: session, classes (multi), section, status (Active / Left-TC / Both), file (one sheet / one per class), column groups; remembers columns / status / file in localStorage (`STUDENT_EXPORT_STORAGE_KEY`) |
| `src/utils/studentExport.ts` | `loadStudentsForExport(filter, pairs)` (enrollments of the user's own pairs, master `students` docs 30 per `in` query, roll numbers; sorted class -> section -> roll -> name), `exportStudentsExcel` (xlsx, every value text except S.No., autofilter) |
| `src/constants.ts` | `STUDENT_EXPORT_GROUPS` (the columns: Basic, Contact / Address, Other details, Previous school, Health), `STUDENT_EXPORT_DEFAULT_COLUMNS` (Basic), status / layout options |

## How it works (StudentList.tsx)

- **Reading:** `loadStudents` is the only reader. The filters go into the query
  (`fetchEnrollments(year, spec)`, `enrollments` by `academicYear` [+ class, section]); results
  are cached per query in `cacheRef` for the visit, so changing filters back reads nothing.
  Removed rows (`isDeleted`) are fetched too and split in memory.
- **List:** the `students` memo filters `rows` by `showBin` (list = not removed, bin = removed),
  section and search (`matchesSearch`), then sorts: a clicked column (`compareRows`), by name when
  searching / a class is chosen, else newest student on top and the rest class-wise
  (`compareByClassOrder`). Pagination is in memory (`PAGE_SIZE_OPTIONS`).
- **Header:** recycle-bin icon (count badge `binCount`, toggles `showBin`) + "+ Add Student".
  With the bin open a pink note explains it.
- **Delete** (`handleDelete(reason)`), dialog asks why:
  - `"left"`: student left / admission cancelled -> enrollment `isDeleted: true`; keeps its
    Enrollment No. (master `students` doc untouched).
  - `"wrong"`: wrong entry -> `removeWrongEntry` (enrollment + master doc deleted, number freed);
    refused when the student has fee receipts or another session.
  In the bin only "Wrong entry" is offered (`hideSubmit={showBin}`).
- **Restore** (`handleRestore`): enrollment `isDeleted: false`.
- Issuing a Transfer Certificate also removes the student this way (`leftReason: "tc"`, `tcNo`):
  see [transfer-certificate.md](transfer-certificate.md).
- `updateRow(id, patch | null)` changes / removes a row in the cache and the list (no re-read).
- **Download Excel** (header button, permission `student.export`: admin always, a teacher only
  when given on the Permissions page and then only their own class + section pairs). The modal
  starts from the list's session / class / section. File `Students_<session>_<classes>.xlsx`;
  no photos. Status "Left / TC" = enrollments with `isDeleted` (TC No. shown when issued).
  Reads only (staff may read `students` / `enrollments`), no rules change.

## Change X -> look here

- A new column: `StudentListRow` + `toStudentRow`, the table head and row, `SortField` /
  `compareRows` if sortable, `matchesSearch` if searchable.
- What a teacher may see: `studentScope.ts` and `permissions` (`scopedSections`).
- Delete / restore rules: `handleDelete`, `handleRestore`, `studentRemoval.ts`.
