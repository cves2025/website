# Cross List: marks register of one exam

Marks page "Cross List": for one session + exam, one table per class + section with every
student's marks per subject, total, result and rank. Printable. Rows with missing marks show an
**Incomplete** badge, get no rank, and are counted in the block heading ("N incomplete").

## Files

| File | What it does |
|---|---|
| `src/component/panel/marks/CrossList.tsx` | The page: loads exams, marks, enrollments, roll numbers, exam sheets; builds the blocks; `CrossListBlock` renders one class + section (badge, ranks, print) |
| `src/utils/marksEntry.ts` | `buildCompletenessColumns(subjects, exam, className)`: which components each subject must have for a student to be complete. Built from `enrichSubjectColumn`, the same layout marks entry saves; `dropUnitTestPracticalSiblings` drops the Unit Test practical rows |
| `src/utils/marks.ts` | `isSubjectComplete` / `isMarksDocComplete` (the check), `computeRanks`, `formatMarks` |
| `src/utils/marksService.ts` | `getExamSheet` (frozen subject columns of exam + class), `loadMarksForExam`, `loadLiveSubjects`, `syncSheetWithLiveSubjects` (subjects added after the sheet: display only) |
| `src/hooks/useExamRules.ts` | Rank scope (class / section) and the rules line under each block |
| `src/utils/examRules.ts` | `rankScopeOf(rules, className)`: the class's own rank scope (`rankScopeByClass`), else the school-wide `rankScope` |

## Rank scope (per class)

Settings > Exam has one switch per class: ON = Class-wise (one rank list for every section of
the class), OFF = Section-wise. Saved in `panelSettings/exam.rankScopeByClass`
(`{ "2": "class", "5": "section", ... }`); a class missing there uses `rankScope`. The mobile
app's Settings > Exam screen edits the same field.

Used by the Cross List (each block: its column header "Rank (Class)" / "Rank (Section)" and
rules line) and the result cards (`GeneratedResultCards`). The result cards always load the
whole class, so a class-wise rank is right even when one section is printed.

## Completeness rule

A subject is complete when its record is absent / exempt, has a grade (Scholastic), or every
component marks entry has for that subject holds a number (or AB / EX per component). A subject
without inputs (practical paper of 0 marks) is not checked.

The components come from `buildCompletenessColumns`, **not** from the sheet's `componentMax`.
`componentMax` lists components marks entry never saves: "theory" on a Main Exam "Practical" row,
and "theory" on Written + Oral / Oral / Written rows of classes 1-8. Using it made fully entered
students show Incomplete (fixed 2026-11-15).

## Data

Reads only: `exams`, `examSheets`, `marks` (per student: `subjectMarks.{subjectId}` with `status`,
`obtained`, `components`, `componentStatus`, `grade`), `enrollments`, `rollNumber`, `subjects`.
