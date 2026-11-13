# Teachers, staff and Job Role

Route `/welcome/teacher/add` (the list lives here too; `/welcome/teacher/list` redirects).

## Files

| File | What it does |
|---|---|
| `src/component/panel/teacher/AddTeacher.tsx` | `AddTeacher` page: Teachers / Staff tabs (counts), table with Job Role column, add / edit / delete (soft, `isDeleted`). `TeacherForm`: Type (teacher / staff, fixed once saved), Job Role, details, section-wise assignments (teachers only), photo |
| `src/hooks/useTeachers.ts` | `useTeachers(role = "teacher")`: live list of `users` with that role (`"staff"`, `"admin"` too; `""` reads nothing). `teacherRecordFromData` (jobRole defaults; admin name from `fullName`) |
| `src/utils/teacherIdentity.ts` | `loadUserIdentities` (all users), `nextEmployeeId` (one T001 series for everyone), duplicate employee ID / email checks, assignment owners |
| `src/component/panel/settings/profile/Profile.tsx` | My Profile; an admin picks their own Job Role there (`AdminJobRole`, saved at once) |
| `../server/router/routeHandler.js` | `addTeacherHandler`: creates the login account + `users/{uid}`; saves a whitelist of fields (incl. `jobRole`) |

## Data

`users/{id}`: teachers (`role: "teacher"`, created by the server with a login), staff
(`role: "staff"`, no login, written straight from the app with `addDoc`), admins (`role: "admin"`).
`jobRole` (Teacher / Accountant / Director ...) is separate from a teacher's `designation`
(Subject / Class Teacher, which drives the class-teacher rules).
Lists: `TEACHER_JOB_ROLES`, `STAFF_JOB_ROLES`, `ADMIN_JOB_ROLES`, `PERSON_TYPE_OPTIONS`,
`STAFF_ROLE` in constants.

## Class teacher of several classes

In each section (`sectionAssignments[]`) a class teacher can look after **one or more classes**:
`classTeacherClasses: string[]`. `classTeacherOf` still holds the first one, for older readers and
records. Always read with `classTeacherClassesOf(assignment)` and write with
`withClassTeacherClasses()` (`src/utils/teacherSections.ts`); `normalizeSectionAssignments` turns an
old single-class record into a one-item list. Used by `teacherScope.ts` (`isClassTeacherOf`,
`classTeacherSections`, `scopedClasses`, `scopedSections`, `subjectAccess`), the clash check
(`teacherIdentity.ts`: one class of a section has one class teacher), the dashboard attendance card,
My Profile, and the form (multi-select "Class Teacher of Class(es)"). The server's
`normalizeSectionAssignments` keeps the list too; until it is redeployed the app writes
`sectionAssignments` itself right after `/api/add-teacher`.

## Gotchas

- Staff are not in `ROLES` (permissions): they can never log in, and every teacher feature
  (attendance, permissions, subjects) uses `useTeachers()` = teachers only.
- A field added to teachers must also be added to the server whitelist, or a new teacher loses it
  (the app writes `jobRole` itself after `/api/add-teacher` as a fallback).
