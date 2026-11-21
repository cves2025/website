# Staff attendance (teachers check in from the app)

Admin pages: `/welcome/staff-attendance` (one day), `/welcome/staff-attendance/holidays`,
`/welcome/staff-attendance/settings`. All need `STAFF_ATTENDANCE_MANAGE` (`staffAttendance.manage`),
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

## Files

| File | What it does |
|---|---|
| `src/component/panel/staffAttendance/StaffAttendanceToday.tsx` | Day view: date, counts, every teacher (+ staff when allowed) with status, in / out, distance, phone; Mark (status, times, reason; `MarkDialog`), Reset phone (`ResetDialog`), selfie (`SelfieDialog`); refused check-ins and admin changes of the day |
| `src/component/panel/staffAttendance/StaffAttendanceSettings.tsx` | Settings (react-hook-form; Save after a change + password): location (lat / lng, this computer's location, Maps link), radius, Wi-Fi check + routers, QR (coming soon, disabled), check-out, Late / Half Day / leaving-early times, lates per half day, selfie, non-teaching staff |
| `src/component/panel/attendance/HolidayCalendar.tsx` with `staff` | Staff Holidays: the students' holiday page on `staffHolidays/{session}` (no class choice) |
| `src/utils/staffAttendanceService.ts` | Settings load / save, day records, log, phones, selfie; `markStaffAttendance`, `resetStaffDevice` (server) |
| `src/hooks/useStaffAttendance.ts` | `useStaffAttendanceSettings`, `useStaffDay(date)`, `useStaffPeople(includeStaff)`, `useStaffSelfie` |
| `src/utils/attendanceService.ts` / `src/hooks/useHolidayCalendar.ts` | `loadHolidayCalendar` / `saveHolidayCalendar` / `useHolidayCalendar` take a collection (students' or staff) |
| `src/constants.ts` | `COLLECTION.STAFF_*`, `STAFF_ATTENDANCE_SETTINGS_DOC`, `STAFF_RADIUS_OPTIONS`, `STAFF_STATUS_META`, `STAFF_MARK_STATUS_OPTIONS`, `STAFF_REFUSED_LABELS`, `STAFF_LATE_TO_HALF_DAY_OPTIONS` |
| `src/utils/type.ts` | `StaffAttendanceSettings`, `StaffAttendanceRecord`, `StaffCheck`, `StaffLogEntry`, `StaffDevice`, `StaffPerson` |

## Data

| Collection | What | Who writes |
|---|---|---|
| `staffAttendanceSettings/general` | settings above; `wifiNetworks: [{ bssid, name }]` | admin (client) |
| `staffHolidays/{session}` | `{ session, weeklyOff, holidays }` like `holidayCalendar` | admin (client) |
| `staffAttendance/{date}_{uid}` | `uid, name, personType, date, status, checkIn, checkOut, earlyLeave, manual, manualReason, manualByName` | server only |
| `staffAttendanceLog/{auto}` | `type: refused / edit / deviceReset`, code, message, reason, before / after, by | server only |
| `staffDevices/{uid}` | `deviceId, model, os, boundAt` | server only |
| `staffSelfies/{date}_{uid}_{in or out}` | `image` (small JPEG data URL) | server only |

Non-teaching staff have no login: when `includeStaff` is ON they are listed and the admin marks them.
"Not marked" = no record (absent days are not written unless the admin marks them).

## Phases

Phase 1 (this): settings, staff holidays, check-in / out, day view, manual marks, phone reset.
Next: leave (types, yearly quota, request / approve, balance), month register + Excel + "X late =
1 half day" (`lateToHalfDay` is saved already), QR check (`qrCheck`, kept OFF).

## Change X -> look here

- A new check: server handler first (it decides), then the app (`../mobile/src/features/staffAttendance/useStaffCheck.ts`).
- A new setting: `StaffAttendanceSettings` type, `toStaffSettings` + default here, the mobile mirror
  (`mobile/src/services/staffAttendanceService.ts`), `loadSettings` in the server.
- Rules: `firestore.rules` > staff attendance (see security-rules.md).
