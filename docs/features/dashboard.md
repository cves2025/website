# Dashboard

Route `/welcome` (index; `component/admin/Dashboard.tsx`). On the dashboard the top bar in
`component/Welcome.tsx` shares the banner gradient (`DASHBOARD_GRADIENT`, `onDashboard`).

## Files

| File | What it does |
|---|---|
| `src/component/admin/Dashboard.tsx` | Greeting banner + cards grid (attendance card; the fee card is a floating icon) |
| `src/component/panel/attendance/AttendanceTodayCard.tsx` | Today's attendance: admin = whole school by aggregation; teacher = own sections. `PendingDropdown` ("Not marked (N)", CustomSelect, animated cves ring, "Teacher - 5th A" -> opens Mark Attendance; marked list read lazily on open) |
| `src/component/panel/fees/FeeTodayCard.tsx` | Fee icon fixed on the right edge; the card grows out of it / shrinks back (`FEE_PANEL_MS`), closes on X, Esc or a click outside; nothing is read until opened. Period dropdown (`FEE_PERIOD_OPTIONS`), ring = this month's collection vs `feeTargetOfMonth`, Receipts tile, one card with "View Dues Report" / "View Collection Report" |
| `src/utils/dashboardStats.ts` | Aggregation queries: `collectionTotal` (sum + count, fallback on missing index), `schoolAttendanceOn`, `sectionsAttendanceOn`, `transportPerMonth` |
| `src/utils/feeTarget.ts` | `feeTargetOfMonth` (pure): monthly fee x students + that month's exam fees + transport |
| `src/hooks/useDashboardStats.ts` | `useCollectionTotal`, `useAttendanceTotals`, `useTransportPerMonth`, `useMarkedSectionsOn` |
| `src/utils/attendanceService.ts` | `saveDailyAttendance` also stores present/absent/leave counts (used by the sums) |

## Data / indexes

Sums with a filter need composite indexes: `firestore.indexes.dev.json` / `.prod.json`
(feePayments status+date+amount, dailyAttendance date + each count, feeAccounts session +
transport.amount). Missing index -> `failed-precondition` -> fallback to reading documents.

## Change X -> look here

- Card layout / greeting: `Dashboard.tsx`; header on the dashboard: `Welcome.tsx`.
- Fee card animation / outside click: `FeeTodayCard` (bottom of the file).
- Target formula: `feeTarget.ts`.
