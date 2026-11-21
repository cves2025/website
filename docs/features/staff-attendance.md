# Staff attendance (teachers check in from the app)

Admin pages: `/welcome/staff-attendance` (one day), `/welcome/staff-attendance/register` (month),
`/welcome/staff-attendance/leaves`,
`/welcome/staff-attendance/settings`; the office screen `/staff-qr`. The teachers' days off are in the
one Holiday Calendar (`/welcome/attendance/holidays`, see Holidays below; the old
`/welcome/staff-attendance/holidays` link goes there). All need `STAFF_ATTENDANCE_MANAGE` (`staffAttendance.manage`),
which a teacher can never get. Teachers check in / out **only from the mobile app**
(`../mobile`, My Attendance).

Goal: a teacher cannot cheat. The app collects, the **server decides** and is the only writer.

## How a check-in is checked (server)

`../server/router/staffAttendanceHandler.js`, `POST /api/staff-attendance/check`:

| Check | Refused with |
|---|---|
| A teacher (`users.role == "teacher"`, active) | `NOT_STAFF` |
| School location saved | `NOT_SET_UP` |
| Not a teachers' day off / weekly off (field `staff` of `holidayCalendar/{session}`) | `HOLIDAY` |
| Not an emulator, not rooted (expo-device) | `EMULATOR`, `ROOTED` (logged) |
| GPS not mocked (Android / iOS flag), accuracy <= 100 m | `MOCK_LOCATION` (logged), `WEAK_GPS` |
| Inside the radius around the school point (haversine) | `OUTSIDE` (logged) |
| School Wi-Fi (BSSID) when the Wi-Fi check is ON | `WIFI` (logged) |
| The office QR when the QR check is ON (signed token of now or the 20 s before) | `QR` (logged) |
| Selfie (JPEG data URL) when ON | `SELFIE` |
| The phone linked to the teacher (`staffDevices/{uid}`, linked on the first check-in) | `DEVICE` (logged) |
| Once a day; check-out after check-in; check-out ON | `ALREADY_IN`, `NOT_IN`, `ALREADY_OUT`, `NO_CHECK_OUT` |

The time is the server's, in India time; status at check-in: after `lateAfter` = Late, after
`halfDayAfter` = Half Day; a check-out before `earlyLeaveBefore` makes Present / Late a Half Day.
On a day the teachers come during a holiday (a duty row), that day's three times from the calendar
replace the settings (`dutyOn` + `timesOn`); `GET /today` returns them as `rules.duty`.

The app also asks for the phone's fingerprint / screen lock before it sends (phone owner).

## Holidays: one calendar with the students

`holidayCalendar/{session}` holds both (page `component/panel/attendance/HolidayCalendar.tsx` +
`HolidayFormModal.tsx`, app `features/holidays`). The **weekly off is everyone's** and only the
admin changes it.

A holiday is for one of three (`holidayAudience`):

| Who is on holiday | Students | Teachers & staff | Days the teachers come (rows: dates + Late after / Half Day after / Leaving before) |
|---|---|---|---|
| Whole school | holiday (all classes) | off | optional: the days they are called (e.g. copy checking) |
| Students only | holiday (all or some classes) | come, usual time | optional: the days with another time (09:00 instead of 07:15) |
| Teachers & staff only (`students: false`) | school open | off | - |

- `weeklyOff`, `holidays[]` (`{ id, name, from, to, classes, students }`): the students' side
  (`holidayOn` skips `students: false`).
- Field `staff` (only the admin writes it, firestore.rules; a teacher with `holiday.manage` saves
  only `holidays` with merge and cannot edit / delete a holiday that has a teachers' part):
  `{ holidays: { <holidayId>: { name, from, to, off, duties: [{ from, to, lateAfter, halfDayAfter, earlyLeaveBefore }] } } }`.
  A teachers' day off = inside an `off` part and not in its duties; a duty day uses its times.
  No part = the teachers come at the usual time (old student holidays: edit them to Whole school).
- The modal shows "What will happen" in plain words; the table: Holiday, Dates (days), Students,
  Teachers & staff, Days teachers come & time. Saved / deleted / weekly off changed: push + bell to
  the teachers (`POST /api/staff-holidays/notify`, text made by the server from the saved calendar).
- Teachers' view: `staffCalendarOf` (days off as holidays, split around the duty days),
  `staffHolidayOn`, `staffDutyOn`; hook `useStaffCalendar(session)` (register, day view; app My
  Attendance / day screen). Server mirror: `loadStaffCalendar`, `holidayIn`, `dutyOn`.

## Office QR

`/staff-qr` (`OfficeQr.tsx`, admin; **outside** `/welcome`, so no sidebar and no idle lock): keep it open
on an office computer / tablet. Every 20 s it asks `GET /api/staff-attendance/qr` (admin) for the
token `CVES-QR:{slot}.{signature}` (HMAC of environment + 20-second slot, key made from the server's
`PIN_PEPPER`; nothing stored). The app scans it at check-in / out when `qrCheck` is ON (Attendance
Settings, website or app); the server takes the code of now or of the slot before. A forwarded photo
is useless within seconds, and it still needs the GPS, phone and Wi-Fi checks.

## Leave (phase 2)

`../server/router/staffLeaveHandler.js`: `/api/staff-leave/request`, `/decide` (admin), `/cancel`.

- Leave types and days per session are in the settings (`leaveTypes: [{ id, name, quota }]`, quota 0 =
  no limit). The teacher app gets them from `/api/staff-attendance/today` (the settings are admin-only).
- A teacher asks in the app (type, from / to or one half day, reason). The days are the working days
  of the staff calendar in between (holidays / weekly offs not counted); one session only, at most
  62 days, no overlap with a waiting / approved leave, inside the quota (approved + waiting).
- The admin approves / rejects (reason needed to reject) on the website or the app, or adds a leave
  for someone (approved at once; non-teaching staff too). Approving writes the leave days into
  `staffAttendance` (`status: "leave"`, `leaveId`, `leaveType`); a day already checked in is refused.
- Half-day leave: the day is "Half Day" with `halfDayLeave: true`; the teacher still checks in for
  the other half (the status stays Half Day, leaving early does not change it).
- Cancel: **only the admin** cancels (waiting or approved; approved = its leave days are removed
  again, days the admin changed since are kept). A teacher asks for it with a reason
  (`cancelRequested`, `cancelRequestReason`; admins get a notification); the admin cancels it or
  keeps it (`/api/staff-leave/cancel-decline`, reason; the teacher is told). "Cancel requests" filter
  on the website and in the app. Every step is logged (`type: "leave"`).

## Monthly register (phase 3)

`utils/staffRegister.ts` (mirror: `mobile/src/utils/staffRegister.ts`): per day P / L / HD / A / LV / H.
A record wins (also on a holiday); a past working day without a record is **A**; today and later
without a record are empty. Totals: working days, present, late, half day, leave, absent, "X lates =
1 half day" (`lateToHalfDay`), no check-out, days worked = P + L + HD / 2 - late half days / 2.
Download Excel: sheet "Register" (codes + totals, legend) and "Times" (in - out per day).

## Notifications

`../server/services/notify.js` saves `notifications/{uid}/items` (the bell: website header
`NotificationBell.tsx` + app Notifications screen, both live) and pushes to the user's phones (FCM,
`pushTokens/{uid}`, registered by the app). Admins: leave request / cancelled by the teacher, and
check-ins refused for fake GPS, outside, Wi-Fi, another phone, rooted, emulator, QR (one per teacher
and reason in 30 minutes). Teacher: leave approved / rejected / cancelled / added, attendance changed
by the admin, phone reset. The teacher's app shows the day, the month and the leave live
(`onSnapshot`), so an admin change on the website shows at once.

## Refused check-ins list

`RefusedCheckIns.tsx` (website) / `RefusedCheckInsCard.tsx` (app): a period dropdown next to the title (Today, Yesterday,
Last 7 days, This month, Last month, Dates), counts by reason, then the list. Query: `type == "refused"`,
`date` between, `orderBy(date desc)`, at most `STAFF_LOG_LIMIT` (300). **Index** `staffAttendanceLog (type ASC,
date DESC)` in `firestore.indexes.dev.json` / `.prod.json` (deploy the indexes). Range: `utils/staffLogRange.ts`
(mirror: `staffLogRange` in `mobile/src/utils/staffAttendance.ts`).

## Files

| File | What it does |
|---|---|
| `src/component/panel/staffAttendance/StaffAttendanceToday.tsx` | Day view: date, counts, every teacher (+ staff when allowed) with status, in / out, distance, phone; Mark (status, times, reason; `MarkDialog`), Reset phone (`ResetDialog`), selfie (`SelfieDialog`); refused check-ins and admin changes of the day |
| `src/component/panel/staffAttendance/StaffAttendanceSettings.tsx` | Settings (react-hook-form; Save after a change + password): location (lat / lng, this computer's location, Maps link), radius, Wi-Fi check + routers, QR (coming soon, disabled), check-out, Late / Half Day / leaving-early times, lates per half day, selfie, non-teaching staff |
| `src/component/NotificationBell.tsx`, `src/hooks/useNotifications.ts`, `src/utils/notificationService.ts` | Header bell: live list, unread count, open the page (`webLink`), mark read / all read |
| `src/component/panel/staffAttendance/OfficeQr.tsx` | Office QR page (`OFFICE_QR_PATH`): big QR, countdown bar, full screen, warning when the QR check is OFF |
| `src/component/panel/staffAttendance/StaffRegister.tsx` | Register: month, legend, grid (sticky name, tooltip with times / holiday / leave type), totals, Download Excel |
| `src/utils/staffRegister.ts`, `src/utils/staffRegisterExcel.ts` | `registerDays`, `summarizeRegister`; `exportStaffRegisterExcel` (xlsx) |
| `src/component/panel/staffAttendance/StaffLeaves.tsx` | Leave: session / status / person filters, requests (Approve, Reject + reason, Cancel + reason), Add Leave for someone, balance table per type |
| `src/component/panel/attendance/HolidayCalendar.tsx` | The one Holiday Calendar: weekly off (admin), table of holidays (students / teachers & staff / days teachers come & time), edit / delete; notifies the teachers |
| `src/component/panel/attendance/HolidayFormModal.tsx` | Add / edit modal (RHF, Save off until dirty): who is on holiday, classes, rows of days teachers come with times, "What will happen" |
| `src/utils/holidayCalendar.ts` | `holidayOn` (students), `staffCalendarOf`, `staffDutyOn`, `staffHolidayOn`, `staffPartOf`, `withStaffPart`, `holidayAudience`, `studentsSummary`, `staffSummary`, `staffDutyTimesText` |
| `../server/router/staffHolidayHandler.js` | `POST /api/staff-holidays/notify` (admin): push + bell to the teachers (and staff when included) |
| `src/utils/staffAttendanceService.ts` | Settings load / save (with `leaveTypes`, `leaveTypeId`), day records, log, phones, selfie, `loadStaffLeaves`, `leaveUsage`; server calls `markStaffAttendance`, `resetStaffDevice`, `addStaffLeave`, `decideStaffLeave`, `cancelStaffLeave`, `loadStaffMonth` (date range of a month), `loadOfficeQr` |
| `src/hooks/useStaffAttendance.ts` | `useStaffAttendanceSettings`, `useStaffDay(date)`, `useStaffPeople(includeStaff)`, `useStaffSelfie`, `useStaffLeaves(session)`, `useStaffMonth(month)`, `useOfficeQr` (reloads when the code changes) |
| `src/utils/attendanceService.ts` / `src/hooks/useHolidayCalendar.ts` | `loadHolidayCalendar` (with `staff`), `saveHolidayCalendar(calendar, uid, { withStaff })` (admin: whole document; others: merge without `staff`); `useHolidayCalendar`, `useStaffCalendar` |
| `src/constants.ts` | `COLLECTION.STAFF_*`, `STAFF_ATTENDANCE_SETTINGS_DOC`, `STAFF_RADIUS_OPTIONS`, `STAFF_STATUS_META`, `STAFF_MARK_STATUS_OPTIONS`, `STAFF_REFUSED_LABELS`, `STAFF_LATE_TO_HALF_DAY_OPTIONS`, `STAFF_LEAVE_STATUS_META`, `STAFF_LEAVE_FILTER_OPTIONS`, `STAFF_REGISTER_CODES`, `STAFF_DUTY_LATE_AFTER` |
| `src/utils/type.ts` | `StaffAttendanceSettings`, `StaffAttendanceRecord`, `StaffCheck`, `StaffLogEntry`, `StaffDevice`, `StaffPerson`, `StaffLeaveType`, `StaffLeave` |

## Data

| Collection | What | Who writes |
|---|---|---|
| `staffAttendanceSettings/general` | settings above; `wifiNetworks: [{ bssid, name }]` | admin (client) |
| `holidayCalendar/{session}` field `staff` | teachers' part of each holiday: off or not, days they come with times (see Holidays) | admin (client) |
| `staffAttendance/{date}_{uid}` | `uid, name, personType, date, status, checkIn, checkOut, earlyLeave, manual, manualReason, manualByName` | server only |
| `staffAttendanceLog/{auto}` | `type: refused / edit / deviceReset`, code, message, reason, before / after, by | server only |
| `staffDevices/{uid}` | `deviceId, model, os, boundAt` | server only |
| `staffSelfies/{date}_{uid}_{in or out}` | `image` (small JPEG data URL) | server only |
| `staffLeaves/{auto}` | `uid, name, typeId, typeName, session, from, to, halfDay, days, dates[], reason, status, byAdmin, decidedByName, decisionNote, cancelReason` | server only |

Non-teaching staff have no login: when `includeStaff` is ON they are listed and the admin marks them.
"Not marked" = no record (absent days are not written unless the admin marks them).

## Phases

Phase 1: settings, staff holidays, check-in / out, day view, manual marks, phone reset.
Phase 2: leave (types, quota per session, request / approve / cancel, balance).
Phase 3: month register + Excel + "X late = 1 half day"; the teacher's month summary in the app.
QR check: Office QR page + scan in the app (`qrCheck`, admin ON / OFF).

## Change X -> look here

- A new check: server handler first (it decides), then the app (`../mobile/src/features/staffAttendance/useStaffCheck.ts`).
- A new setting: `StaffAttendanceSettings` type, `toStaffSettings` + default here, the mobile mirror
  (`mobile/src/services/staffAttendanceService.ts`), `loadSettings` in the server.
- Rules: `firestore.rules` > staff attendance (see security-rules.md).
