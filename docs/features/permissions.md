# Permissions (teacher access)

Route `/welcome/settings/permissions` (`PERMISSIONS_MANAGE`, admins). Admin-only features (adding
teachers / students, promotion, exams, fees, settings) are never offered to teachers.

## Files

| File | What it does |
|---|---|
| `src/component/panel/settings/permissions/Permissions.tsx` | Page: title + the two tabs (All Teachers / Individual Teacher) |
| `.../permissions/PermissionMatrix.tsx` | The table: groups and rows from the catalog, one column per setting (switch, or something else via `replace`, e.g. an "Included" chip), ON count under a column title (`countOn`), row tags (`TAG_DEFAULT` / `TAG_CLASS_TEACHER` / `TAG_CUSTOM`), `Chip`, `PermissionFooter` (sticky buttons + note) |
| `.../permissions/TeacherDefaultsTab.tsx` | "All teachers" + "Class teachers (extra)" columns; draft until Save; Restore built-in defaults (`ROLE_PERMISSIONS.teacher`, `CLASS_TEACHER_BONUS`), Discard |
| `.../permissions/IndividualTeacherTab.tsx` | Pick a teacher (`useTeachers`); "Default" column (read-only On / Off) + "This teacher" switches; differences saved as overrides; Reset to default |
| `.../permissions/useTeacherRoleDefaults.ts` | Live school-wide defaults |
| `src/utils/permissionSettingsService.ts` | `subscribeTeacherRoleDefaults`, `saveTeacherRoleDefaults`, `saveTeacherOverrides` |
| `src/permissions/permissionCatalog.ts` | `TEACHER_PERMISSION_GROUPS` (what the page lists: label, description) |
| `src/permissions/resolvePermissions.ts` | `teacherDefaultPermissions`, `resolvePermissions` (defaults + grant - revoke), `isClassTeacherProfile`, `cleanPermissionList` |
| `src/permissions/permissions.ts`, `rolePermissions.ts`, `routePermissions.ts` | Permission names, built-in role lists, which route needs which permission |

## Data

- `panelSettings/rolePermissions` (`PRE_DEFINED_DOC_ID.ROLE_PERMISSIONS`): `{ teacher: [], classTeacher: [] }`
  - what all teachers get, and the class-teacher extras.
- `users/{uid}.permissionOverrides`: `{ grant: [], revoke: [] }` - one teacher's differences from
  their defaults. Saved changes reach the teacher's open app at once (`MyContextProvider`).

## Change X -> look here

- A new permission on the page: `PERMISSIONS` (permissions.ts), its route in `routePermissions.ts`,
  and an item in `TEACHER_PERMISSION_GROUPS`; the table picks it up.
- Look of the table / switches: `PermissionMatrix.tsx`. Switches are the app's `CustomToggle`
  (react-hook-form): a small form there mirrors what is ON (`values`), a click calls the column's
  `onToggle`. Field names replace "." with "_" (`fieldName`), or they would be nested paths.
