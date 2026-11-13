# Marks Entry card (dashboard): which classes still miss marks

Dashboard card for admins (whole school) and teachers with `MARKS_ENTER` / `MARKS_VIEW` (only the
classes / subjects they teach, plus their class-teacher classes). For one exam of the current
session (active, started; the latest by default) it shows per class + section: complete, in
progress (which subjects miss how many marks) or not started.

## Files

| File | What it does |
|---|---|
| `src/component/panel/marks/MarksPendingCard.tsx` | The card: exam dropdown, pending count, tiles (Complete / In progress / Not started / Marks left), "Pending (N)" list -> opens the marks sheet. `startedExams` picks the exams |
| `src/utils/marksProgress.ts` | Pure: `readMarksProgress` (checks the document), `marksPendingRows` (state per class + section, filtered by what the user sees), `progressKey` |
| `src/utils/marksProgressService.ts` | `loadMarksProgress` (1 read), `countSectionStudents` (count query, cached per app session) |
| `src/hooks/useMarksProgress.ts` | Progress + student counts for sections the document does not know |
| `src/utils/marksService.ts` | `saveStudentMarks` now runs in a transaction: reads the student's marks doc, writes it, and moves `marksProgress` counts by the subjects added / removed (`increment`); with `progress` it also stores the section's students and the subject columns |
| `src/component/panel/marks/ExamMarks.tsx` | Passes `progress` (students of the section on the sheet, subject columns); reads `?session=&exam=&class=&section=` to open a sheet |
| `src/component/panel/marks/useMarksUploadSave.ts` | Excel upload passes the subject columns (no student count) |
| `../server/scripts/rebuildMarksProgress.js` | Builds the progress documents from the saved marks (dry run / `--apply`); for marks saved before, or to fix counts |

## Data

`marksProgress/{session}_{examId}` (`COLLECTION.MARKS_PROGRESS`):
`{ session, examId, sections: { "<class>|<section>": { className, section, students, subjects: {id: name}, entered: {id: count} } } }`.
A subject counts as entered for a student when its record has a `status` (marks, absent or exempt).

## Cost

Dashboard: exams (cached) + 1 progress read; a section the document does not know yet costs one
count query (~1 read), once per app session. Each marks save: +1 read, +1 write.

## Gotchas

- Marks saved outside `saveStudentMarks` would not move the counts; rebuild with the script.
- A student moved to another section keeps being counted in the old one until a rebuild.
- Sections are `ADMISSION_SECTIONS` (A, B).
