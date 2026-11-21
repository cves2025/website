import { useContext, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

import Button from "../../../custom-components/Button";
import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import CircleCheckbox from "../../../custom-components/CircleCheckbox";
import Loader from "../../../custom-components/Loader";
import Modal from "../../../custom-components/Modal";
import Tooltip from "../../../custom-components/Tooltip";
import { myContext } from "../../context/MyContextProvider";
import { CVES_BUTTON } from "../../../constants";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import useHolidayCalendar from "../../../hooks/useHolidayCalendar";
import { saveHolidayCalendar } from "../../../utils/attendanceService";
import { notifyStaffHoliday } from "../../../utils/staffAttendanceService";
import {
  WEEKDAY_LABELS,
  datesBetween,
  fromDateKey,
  holidayAudience,
  sortHolidays,
  staffDutyTimesText,
  staffPartOf,
  staffSummary,
  studentsSummary,
  withStaffPart,
} from "../../../utils/holidayCalendar";
import type {
  DateRange,
  Holiday,
  HolidayCalendar as Calendar,
  StaffHolidayPart,
} from "../../../utils/type";
import HolidayFormModal from "./HolidayFormModal";
import { labelClass } from "./attendanceShared";

const sessions = generateAcademicYears();

const dateLabel = (key: string) => format(fromDateKey(key), "d MMM yyyy");
const rangeLabel = (range: DateRange) =>
  range.from === range.to
    ? dateLabel(range.from)
    : `${dateLabel(range.from)} – ${dateLabel(range.to)}`;
const shortRange = (range: DateRange) =>
  range.from === range.to
    ? format(fromDateKey(range.from), "d MMM")
    : `${format(fromDateKey(range.from), "d MMM")} – ${format(fromDateKey(range.to), "d MMM")}`;

const PILL =
  "inline-block rounded-full border px-2 py-0.5 text-xs font-semibold";
const PILL_OFF = `${PILL} border-amber-200 bg-amber-50 text-amber-800`;
const PILL_OPEN = `${PILL} border-green-200 bg-green-50 text-green-700`;

/** What the form shows: closed, a new holiday, or one being edited. */
type FormState = { open: false } | { open: true; holiday: Holiday | null };

/**
 * Weekly off and holidays of a session: one calendar of students and
 * teachers. A holiday is for the whole school, the students only or the
 * teachers & staff only; the admin adds the days the teachers come (called
 * during a holiday, or another time than the usual one) with their times, so
 * nobody is marked late by the usual time. The table shows for every holiday
 * what the students and the teachers have, and the teachers' times.
 *
 * The weekly off and the teachers' part (field `staff`) only the admin
 * changes (firestore.rules); a teacher with holiday.manage adds the
 * students' holidays. The teachers are told by push + bell
 * (POST /api/staff-holidays/notify).
 */
function HolidayCalendar() {
  const { user } = useContext(myContext);
  const isAdmin = user?.role === "admin";
  const [session, setSession] = useState(sessions[0]?.value ?? "");
  const { calendar, setCalendar, loading, error } = useHolidayCalendar(session);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ open: false });
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  const persist = async (next: Calendar, message: string) => {
    if (!user) return false;
    setSaving(true);
    try {
      await saveHolidayCalendar(next, user.uid, { withStaff: isAdmin });
      setCalendar({ ...next, holidays: sortHolidays(next.holidays) });
      toast.success(message);
      return true;
    } catch (cause) {
      console.error("Failed to save holiday calendar:", cause);
      toast.error("Could not save. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Push + bell to the teachers; a failure does not undo the save. */
  const tellTeachers = (body: Parameters<typeof notifyStaffHoliday>[0]) => {
    notifyStaffHoliday(body).catch((cause) => {
      console.error("Staff holiday notify failed:", cause);
      // "Failed to fetch" = the server is not running / not reachable.
      const reason =
        cause instanceof TypeError
          ? "the server could not be reached"
          : cause instanceof Error
            ? cause.message
            : "unknown error";
      toast.error(`Saved, but the teachers could not be notified (${reason}).`);
    });
  };

  const toggleWeeklyOff = async (day: number) => {
    const weeklyOff = calendar.weeklyOff.includes(day)
      ? calendar.weeklyOff.filter((value) => value !== day)
      : [...calendar.weeklyOff, day];
    if (await persist({ ...calendar, weeklyOff }, "Weekly off updated.")) {
      tellTeachers({ session, weeklyOff: true });
    }
  };

  const saveHoliday = async (
    holiday: Holiday,
    part: StaffHolidayPart | null,
  ) => {
    const exists = calendar.holidays.some((item) => item.id === holiday.id);
    const holidays = exists
      ? calendar.holidays.map((item) =>
          item.id === holiday.id ? holiday : item,
        )
      : [...calendar.holidays, holiday];
    const before = staffPartOf(calendar, holiday.id);
    const next: Calendar = {
      ...calendar,
      holidays,
      staff: isAdmin
        ? withStaffPart(calendar, holiday.id, part)
        : calendar.staff,
    };
    const ok = await persist(
      next,
      exists ? "Holiday updated." : "Holiday added.",
    );
    if (!ok) return;
    setForm({ open: false });
    if (
      isAdmin &&
      (before || part) &&
      JSON.stringify(before) !== JSON.stringify(part)
    ) {
      tellTeachers({ session, holidayId: holiday.id, name: holiday.name });
    }
  };

  const handleConfirmDelete = async () => {
    const holiday = holidayToDelete;
    if (!holiday) return;
    const part = staffPartOf(calendar, holiday.id);
    const ok = await persist(
      {
        ...calendar,
        holidays: calendar.holidays.filter((item) => item.id !== holiday.id),
        staff: part
          ? withStaffPart(calendar, holiday.id, null)
          : calendar.staff,
      },
      "Holiday deleted.",
    );
    if (!ok) return;
    if (part)
      tellTeachers({ session, holidayId: holiday.id, name: holiday.name });
    setHolidayToDelete(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Holiday Calendar"
        titleStyle="text-primaryBlue"
        description="Weekly off and holidays of the session for students and teachers & staff. Attendance is not taken on the days off."
        descriptionStyle="text-gray-500"
        button={
          <Button
            buttonName="+ Add Holiday"
            variant="cves"
            size="md"
            buttonStyle="rounded-full"
            disabled={saving || loading || Boolean(error)}
            onClick={() => setForm({ open: true, holiday: null })}
          />
        }
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:max-w-xs">
        <label htmlFor="holidaySession" className={labelClass}>
          Session
        </label>
        <SelectDropdown
          id="holidaySession"
          value={session}
          onValueChange={(value) => {
            setSession(value);
            setForm({ open: false });
          }}
          options={sessions}
        />
      </div>

      {loading ? (
        <Loader label="Loading holidays..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-1 font-bold text-gray-800">Weekly off</h2>
            <p className="mb-3 text-sm text-gray-500">
              The whole school (students and teachers &amp; staff) is closed on
              these days every week.
              {!isAdmin && " Only the admin changes it."}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {WEEKDAY_LABELS.map((label, day) => (
                <CircleCheckbox
                  key={label}
                  id={`weeklyOff-${day}`}
                  label={label}
                  checked={calendar.weeklyOff.includes(day)}
                  disabled={saving || !isAdmin}
                  onCheckedChange={() => void toggleWeeklyOff(day)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 p-4 font-bold text-gray-800">
              Holidays of {session} ({calendar.holidays.length})
            </h2>
            {calendar.holidays.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">
                No holidays added yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Holiday</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Students</th>
                      <th className="px-4 py-3">Teachers &amp; staff</th>
                      <th className="px-4 py-3">
                        Days teachers come &amp; time
                      </th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calendar.holidays.map((holiday) => {
                      const part = staffPartOf(calendar, holiday.id);
                      const audience = holidayAudience(holiday, part);
                      const locked = !isAdmin && part !== null;
                      const dayCount = datesBetween(
                        holiday.from,
                        holiday.to,
                      ).length;
                      return (
                        <tr key={holiday.id} className="align-top">
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {holiday.name}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                            {rangeLabel(holiday)}
                            <span className="block text-xs text-gray-500">
                              {dayCount} {dayCount === 1 ? "day" : "days"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                audience === "staff" ? PILL_OPEN : PILL_OFF
                              }
                            >
                              {studentsSummary(holiday, toOrdinalLabel)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                audience === "students" ? PILL_OPEN : PILL_OFF
                              }
                            >
                              {staffSummary(holiday, part)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {part && part.duties.length > 0 ? (
                              <ul className="flex flex-col gap-1">
                                {part.duties.map((duty) => (
                                  <li key={duty.from}>
                                    <span className="font-medium text-gray-800">
                                      {shortRange(duty)}:
                                    </span>{" "}
                                    {staffDutyTimesText(duty)}
                                  </li>
                                ))}
                                {audience === "students" && (
                                  <li className="text-xs text-gray-500">
                                    Other days: the usual time
                                  </li>
                                )}
                              </ul>
                            ) : audience === "students" ? (
                              "Usual time"
                            ) : (
                              <span className="text-gray-400">Not called</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Tooltip
                                content={
                                  locked
                                    ? "Only the admin changes holidays of the teachers"
                                    : "Edit holiday"
                                }
                              >
                                <button
                                  type="button"
                                  disabled={saving || locked}
                                  onClick={() =>
                                    setForm({ open: true, holiday })
                                  }
                                  aria-label={`Edit ${holiday.name}`}
                                  className="rounded-full p-2 text-primaryBlue transition-colors hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  locked
                                    ? "Only the admin changes holidays of the teachers"
                                    : "Delete holiday"
                                }
                              >
                                <button
                                  type="button"
                                  disabled={saving || locked}
                                  onClick={() => setHolidayToDelete(holiday)}
                                  aria-label={`Delete ${holiday.name}`}
                                  className="rounded-full p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {form.open && (
        <HolidayFormModal
          key={form.holiday?.id ?? "new"}
          holiday={form.holiday}
          part={form.holiday ? staffPartOf(calendar, form.holiday.id) : null}
          session={session}
          isAdmin={isAdmin}
          saving={saving}
          onClose={() => setForm({ open: false })}
          onSave={(holiday, part) => void saveHoliday(holiday, part)}
        />
      )}

      <Modal
        isOpen={holidayToDelete !== null}
        onClose={() => {
          if (!saving) setHolidayToDelete(null);
        }}
        title="Delete Holiday"
        description={
          holidayToDelete
            ? `Are you sure you want to delete "${holidayToDelete.name}" (${rangeLabel(holidayToDelete)})? Attendance can be marked on these days again.`
            : "Are you sure you want to delete this holiday?"
        }
        cancelText="Cancel"
        submitText="Delete"
        submitClassName={CVES_BUTTON}
        loading={saving}
        onSubmit={() => void handleConfirmDelete()}
      />
    </div>
  );
}

export default HolidayCalendar;
