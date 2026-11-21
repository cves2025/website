# Staff attendance (teachers check in from the app)

Admin pages: `/welcome/staff-attendance` (one day), `/welcome/staff-attendance/leaves`,
`/welcome/staff-attendance/holidays`, `/welcome/staff-attendance/settings`. All need `STAFF_ATTENDANCE_MANAGE` (`staffAttendance.manage`),
which a teacher can never get. Teachers check in / out **only from the mobile app**
(`../mobile`, My Attendance).

Goal: a teacher cannot cheat. The app collects, the **server decides** and is the only writer.

## How a check-in is checked (server)

`../server/router/staffAttendanceHandler.js`, `POST /api/staff-attendance/check`:

| Check | Refused with |
|---|---|
| A teacher (`users.role == "teacher"`, active) | `NOT_STAFF` |
| School location saved | `NOT_SET_UP` |
| Not a staff holiday / weekly off (`staffHolidays/{session}`) | `HOLIDAY` |
| Not an emulator, not rooted (expo-device) | `EMULATOR`, `ROOTED` (logged) |
| GPS not mocked (Android / iOS flag), accuracy <= 100 m | `MOCK_LOCATION` (logged), `WEAK_GPS` |
| Inside the radius around the school point (haversine) | `OUTSIDE` (logged) |
| School Wi-Fi (BSSID) when the Wi-Fi check is ON | `WIFI` (logged) |
| Selfie (JPEG data URL) when ON | `SELFIE` |
| The phone linked to the teacher (`staffDevices/{uid}`, linked on the first check-in) | `DEVICE` (logged) |
| Once a day; check-out after check-in; check-out ON | `ALREADY_IN`, `NOT_IN`, `ALREADY_OUT`, `NO_CHECK_OUT` |

The time is the server's, in India time; status at check-in: after `lateAfter` = Late, after
`halfDayAfter` = Half Day; a check-out before `earlyLeaveBefore` makes Present / Late a Half Day.
The app also asks for the phone's fingerprint / screen lock before it sends (phone owner).

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
- Cancel: the teacher a waiting leave; the admin waiting or approved (reason), which removes its
  leave days again (days the admin changed since are kept). Every decision is logged (`type: "leave"`).

## Files

| File | What it does |
|---|---|
| `src/component/panel/staffAttendance/StaffAttendanceToday.tsx` | Day view: date, counts, every teacher (+ staff when allowed) with status, in / out, distance, phone; Mark (status, times, reason; `MarkDialog`), Reset phone (`ResetDialog`), selfie (`SelfieDialog`); refused check-ins and admin changes of the day |
| `src/component/panel/staffAttendance/StaffAttendanceSettings.tsx` | Settings (react-hook-form; Save after a change + password): location (lat / lng, this computer's location, Maps link), radius, Wi-Fi check + routers, QR (coming soon, disabled), check-out, Late / Half Day / leaving-early times, lates per half day, selfie, non-teaching staff |
| `src/component/panel/staffAttendance/StaffLeaves.tsx` | Leave: session / status / person filters, requests (Approve, Reject + reason, Cancel + reason), Add Leave for someone, balance table per type |
| `src/component/panel/attendance/HolidayCalendar.tsx` with `staff` | Staff Holidays: the students' holiday page on `staffHolidays/{session}` (no class choice) |
| `src/utils/staffAttendanceService.ts` | Settings load / save (with `leaveTypes`, `leaveTypeId`), day records, log, phones, selfie, `loadStaffLeaves`, `leaveUsage`; server calls `markStaffAttendance`, `resetStaffDevice`, `addStaffLeave`, `decideStaffLeave`, `cancelStaffLeave` |
| `src/hooks/useStaffAttendance.ts` | `useStaffAttendanceSettings`, `useStaffDay(date)`, `useStaffPeople(includeStaff)`, `useStaffSelfie`, `useStaffLeaves(session)` |
| `src/utils/attendanceService.ts` / `src/hooks/useHolidayCalendar.ts` | `loadHolidayCalendar` / `saveHolidayCalendar` / `useHolidayCalendar` take a collection (students' or staff) |
| `src/constants.ts` | `COLLECTION.STAFF_*`, `STAFF_ATTENDANCE_SETTINGS_DOC`, `STAFF_RADIUS_OPTIONS`, `STAFF_STATUS_META`, `STAFF_MARK_STATUS_OPTIONS`, `STAFF_REFUSED_LABELS`, `STAFF_LATE_TO_HALF_DAY_OPTIONS`, `STAFF_LEAVE_STATUS_META`, `STAFF_LEAVE_FILTER_OPTIONS` |
| `src/utils/type.ts` | `StaffAttendanceSettings`, `StaffAttendanceRecord`, `StaffCheck`, `StaffLogEntry`, `StaffDevice`, `StaffPerson`, `StaffLeaveType`, `StaffLeave` |

## Data

| Collection | What | Who writes |
|---|---|---|
| `staffAttendanceSettings/general` | settings above; `wifiNetworks: [{ bssid, name }]` | admin (client) |
| `staffHolidays/{session}` | `{ session, weeklyOff, holidays }` like `holidayCalendar` | admin (client) |
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
Next: month register + Excel + "X late = 1 half day" (`lateToHalfDay` is saved already), QR check
(`qrCheck`, kept OFF).

## Change X -> look here

- A new check: server handler first (it decides), then the app (`../mobile/src/features/staffAttendance/useStaffCheck.ts`).
- A new setting: `StaffAttendanceSettings` type, `toStaffSettings` + default here, the mobile mirror
  (`mobile/src/services/staffAttendanceService.ts`), `loadSettings` in the server.
- Rules: `firestore.rules` > staff attendance (see security-rules.md).
