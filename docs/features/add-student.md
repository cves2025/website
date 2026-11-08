# Add / edit / remove student (admission form, Student List delete)

Route `/welcome/student/add` (`ADD_STUDENT_PATH`); `?edit=<enrollmentId>` edits a student.
The form looks like the printed admission form, in two pages (Student Info, then school details).

## Files

| File | What it does |
|---|---|
| `src/component/panel/students/AddStudent.tsx` | Page + form (`useForm<AdmissionStudentFormValues>`). `buildStudentFields` (master `students` doc) / `buildEnrollmentFields` (per-session `enrollments` doc), load for edit, page 1 -> 2 check (`page1RequiredFields`), photo paste routing, "Next Student" in edit mode (`findNextStudentToEdit`), submit (duplicate enrollment check, photo upload, save, counter update), Enrollment No. suggestion |
| `src/component/panel/students/AdmissionFormSheet.tsx` | The two sheets: `AdmissionInfoSheet` (header, class / section / session / enrollment, names, DOB, contacts, photos via `renderPhoto`) and `AdmissionSchoolSheet`. Also used read-only by Student View |
| `src/custom-components/admission/*` | Form-styled inputs: `AdmissionLineInput`, `AdmissionBoxedInput`, `AdmissionSelectInput`, `AdmissionSessionInput`, `AdmissionDateOfBirth`, `AdmissionPinInput`, `AdmissionCheckboxGroup`, `MobileNumberInputBox`, `PhotoUploadBox` |
| `src/utils/enrollmentCounter.ts` | `fetchNextEnrollment` -> `{ next, highest, owner }`, `recordEnrollments` (moves the counter up after saves; Add Student and Bulk Import), `isEnrollmentTaken` |
| `src/firebase/studentPhotos.ts` | `uploadStudentPhoto(studentId, kind, file)` (student / mother / father) |
| `src/component/panel/BulkStudentImport.tsx` | CSV / Excel import; also calls `recordEnrollments` |
| `src/component/panel/students/StudentList.tsx` | Delete (left / wrong entry) and the recycle bin: see [student-list.md](student-list.md) |
| `src/utils/studentRemoval.ts` | `wrongEntryBlocker` (fee receipts or another session = real admission, refused), `removeWrongEntry` (deletes the enrollment + master `students` doc) |

## Data

- `students/{id}`: master record (name parts, `enrollment`, parents, contacts, addresses,
  photos, `isDeleted` = recycle bin).
- `enrollments/{id}`: one per student per session (`academicYear`, `className`, `section`,
  `enrollment`, `studentName`, `fatherName`, `phone`, `studentId`).
- `panelSettings/enrollmentCounter` (`PRE_DEFINED_DOC_ID.ENROLLMENT_COUNTER`):
  `{ lastEnrollment }` = highest numeric Enrollment No. in use.

## Enrollment No. suggestion

`fetchNextEnrollment`: read the counter, then check a student still holds that number (1 query).
If nobody does (typo corrected, student deleted for good) or there is no counter, scan all
students once, reset the counter to the real highest and save it. It also returns `highest`
and `owner` (who holds it), not shown on the form (removed on request); handy for finding an
outlier such as the "Test" student with 3456. Recycle-bin students keep their numbers. Enrollment numbers may be saved as text or as a number; queries check both.

## Removing a student: the two cases

- **Student left / admission cancelled:** a real admission; its number stays taken (admission
  register). Only the enrollment is marked `isDeleted`; the master `students` doc stays and keeps
  holding the number. Restorable from the recycle bin view.
- **Wrong entry:** typo number / added twice. Enrollment + master doc are deleted, so the number is
  free and the counter heals on the next Add Student.
- Add Student asks "Is this Enrollment No. right?" when the typed number is more than
  `ENROLLMENT_JUMP_WARNING` (10) after the highest in use (`farEnrollment` modal; confirmed once
  per number via `farEnrollmentConfirmed`).

## Change X -> look here

- A new admission field: `AdmissionStudentFormValues` (type.ts), the sheet in
  `AdmissionFormSheet.tsx`, `buildStudentFields` / `buildEnrollmentFields`, and the edit loader in
  `AddStudent.tsx`; also Student View and Bulk Import if they show / import it.
- Validation before page 2: `page1RequiredFields`.
