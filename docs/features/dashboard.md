# Dashboard

Route `/welcome` (index; `component/admin/Dashboard.tsx`). On the dashboard the top bar in
`component/Welcome.tsx` shares the banner gradient (`DASHBOARD_GRADIENT`, `onDashboard`). The
header (school name, Go to Website) is the same for admins and teachers; the rupee button needs
`FEE_MANAGE`.

## Files

| File | What it does |
|---|---|
| `src/component/admin/Dashboard.tsx` | Greeting banner + cards grid (attendance card, Marks Entry card - see [marks-progress.md](marks-progress.md), Transfer Certificates, Students, Teachers & Staff cards - 3 per row on xl, 2 on lg; the fee card is a floating icon) |
| `src/component/panel/students/tc/TcDashboardCard.tsx` | Transfer Certificates card (admin, `tc.view`, `tc.issue`), styled like the Fee Collection card: session dropdown (`TC_DASHBOARD_SESSIONS` newest sessions), magenta status ring (issued / cancelled / draft, total in the middle), issued count big with cancelled + drafts to issue, pink tile with session-wise bars of issued TCs (a row picks its session), pink tile with links "Open TC Register" (`TC_PATH?session=&class=all`) and "Open TC Page". Counts only (`useTcCounts` -> `tcCountsOf`, 3 counts per session, no composite index) |
| `src/component/panel/students/AdmissionDashboardCard.tsx` | Students (admin, `student.read`), laid out like the TC card: ring Male / Female (cves indigo / pink) of the current session with the total, its Classes | Sections in use, tile of horizontal bars of new admissions of the last `ADMISSION_DASHBOARD_SESSIONS` (3) sessions (`generateAcademicYears`, current = `bg-cves`, others `primaryGreen`), links tile Student List / Add Student. |
| `src/component/panel/teacher/PeopleDashboardCard.tsx` | Teachers & Staff (admin only: staffAttendance is admin-read): per group total (`isDeleted == false`), active (`status == "Active"`), Male / Female bar (cves indigo / pink, gender "Male" / "Female"), pink tile "On leave today" (staffAttendance of `todayKey()`: `status == "leave"` + `halfDayLeave == true`), links Teachers & Staff / Staff Attendance. No session-wise data |
| `src/component/panel/attendance/AttendanceTodayCard.tsx` | Today's attendance: admin = whole school by aggregation; teacher = own sections. `PendingDropdown` ("Not marked (N)", CustomSelect, animated cves ring, "Teacher - 5th A" -> opens Mark Attendance; marked list read lazily on open) |
| `src/component/panel/fees/FeeTodayCard.tsx` | Fee icon fixed on the right edge; the card grows out of it / shrinks back (`FEE_PANEL_MS`), closes on X, Esc or a click outside; nothing is read until opened. Period dropdown (`FEE_PERIOD_OPTIONS`), ring = this month's collection vs `feeTargetOfMonth`, Receipts tile, one card with "View Dues Report" / "View Collection Report" |
| `src/utils/dashboardStats.ts` | Aggregation queries: `collectionTotal` (sum + count, fallback on missing index), `schoolAttendanceOn`, `sectionsAttendanceOn`, `transportPerMonth`, `tcCountsOf`, `studentCountsOf` (6 counts: all / male / female enrollments of a session minus `isDeleted`), `classSectionCountsOf` (classes and section names (A, B ...) with an `isDeleted == false` enrollment: one count per class and per section name), `peopleCountsOf` (6 counts per role: users + staffAttendance of a date), `newAdmissionsOf` (`isNewAdmission == true`); equality filters only, no composite index |
| `src/utils/feeTarget.ts` | `feeTargetOfMonth` (pure): monthly fee x students + that month's exam fees + transport |
| `src/hooks/useDashboardStats.ts` | `useCollectionTotal`, `useAttendanceTotals`, `useTransportPerMonth`, `useMarkedSectionsOn`, `useTcCounts`, `useAdmissionStats`, `usePeopleStats` |
| `src/utils/attendanceService.ts` | `saveDailyAttendance` also stores present/absent/leave counts (used by the sums) |

## Data / indexes

Sums with a filter need composite indexes: `firestore.indexes.dev.json` / `.prod.json`
(feePayments status+date+amount, dailyAttendance date + each count, feeAccounts session +
transport.amount). Missing index -> `failed-precondition` -> fallback to reading documents.

## Motion

- Cards rise in one after another (2 s each, 1 s apart) and lift on hover with a cves line on top: `.dash-grid > section`
  in `src/index.css` (the floating fee card is not a grid `<section>`, so it is left alone).
- Numbers count up (`CountUp`); rings and bars fill with `useCountUp(ready ? 1 : 0)` (`COUNT_UP_MS`, 2 s).
- Greeting banner: drifting blobs (`.dash-blob`), time-of-day icon (Sun / CloudSun / Moon,
  `.dash-float`) (greeting checked every `DASHBOARD_CLOCK_MS`).
- `prefers-reduced-motion`: no rise, lift, drift or count-up.

## Change X -> look here

- Card layout / greeting: `Dashboard.tsx`; header on the dashboard: `Welcome.tsx`.
- Name in the greeting: `user.fullName`, built in `MyContextProvider` (`buildUser`) from
  `fullName` or else `firstName` + `lastName` (teachers have no `fullName`).
- Fee card animation / outside click: `FeeTodayCard` (bottom of the file).
- Target formula: `feeTarget.ts`.
