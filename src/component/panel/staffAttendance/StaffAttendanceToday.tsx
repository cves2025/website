/**
 * Staff Attendance (admin): one day of every teacher (and non-teaching staff
 * when the setting allows): status, check-in / out times, distance, the
 * linked phone and the selfie. The admin marks or corrects a day (reason
 * required, logged) and resets a phone; refused check-ins (filter: today,
 * yesterday, last 7 days, months, dates) and the day's admin changes are
 * listed below, so tries to cheat are seen.
 */
import { useContext, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { Camera, Pencil, Smartphone } from "lucide-react";

import { CVES_BUTTON, STAFF_MARK_STATUS_OPTIONS, STAFF_STATUS_META } from "../../../constants";
import CustomSelect from "../../../custom-components/CustomSelect";
import CustomTextarea from "../../../custom-components/CustomTextarea";
import DatePicker from "../../../custom-components/DatePicker";
import Loader from "../../../custom-components/Loader";
import Modal from "../../../custom-components/Modal";
import PageHeader from "../../../custom-components/PageHeader";
import TimePicker from "../../../custom-components/TimePicker";
import Tooltip from "../../../custom-components/Tooltip";
import { useStaffCalendar } from "../../../hooks/useHolidayCalendar";
import {
  useStaffAttendanceSettings,
  useStaffDay,
  useStaffPeople,
  useStaffSelfie,
} from "../../../hooks/useStaffAttendance";
import {
  dayOffReason,
  sessionOfDate,
  staffDutyOn,
  staffDutyTimesText,
  todayKey,
} from "../../../utils/holidayCalendar";
import { markStaffAttendance, resetStaffDevice } from "../../../utils/staffAttendanceService";
import type { StaffAttendanceRecord, StaffAttendanceStatus, StaffCheck, StaffPerson } from "../../../utils/type";
import { myContext } from "../../context/MyContextProvider";
import RefusedCheckIns from "./RefusedCheckIns";

type StatusKey = keyof typeof STAFF_STATUS_META;

const timeText = (ms: number | null) =>
  ms ? new Date(ms).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";

/** "HH:mm" of a check, for the edit form. */
const hhmm = (check: StaffCheck | null) => {
  if (!check?.at) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(check.at));
  return parts.slice(0, 5);
};

function StatusChip({ status }: { status: StatusKey }) {
  const meta = STAFF_STATUS_META[status];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.chip}`}>
      {meta.label}
    </span>
  );
}

function CheckCell({ check }: { check: StaffCheck | null }) {
  if (!check?.at) return <span className="text-gray-400">-</span>;
  return (
    <div className="leading-5">
      <p className="font-semibold text-gray-800">{timeText(check.at)}</p>
      <p className="text-xs text-gray-500">
        {check.source === "admin"
          ? `By ${check.byName || "admin"}`
          : `App${check.distanceM !== null ? ` · ${check.distanceM} m` : ""}`}
      </p>
    </div>
  );
}

function StaffAttendanceToday() {
  const [date, setDate] = useState(todayKey());
  const { settings } = useStaffAttendanceSettings();
  const { people, loading: peopleLoading, error: peopleError } = useStaffPeople(settings.includeStaff);
  const day = useStaffDay(date);
  const { calendar, fullCalendar } = useStaffCalendar(sessionOfDate(date));
  const dayOff = dayOffReason(calendar, date, "");
  const duty = dayOff ? null : staffDutyOn(fullCalendar, date);

  const [marking, setMarking] = useState<StaffPerson | null>(null);
  const [resetting, setResetting] = useState<StaffPerson | null>(null);
  const [selfieOf, setSelfieOf] = useState<StaffAttendanceRecord | null>(null);

  const counts = useMemo(() => {
    const result: Record<StatusKey, number> = { present: 0, late: 0, halfDay: 0, absent: 0, leave: 0, none: 0 };
    people.forEach((person) => {
      result[day.records[person.uid]?.status ?? "none"] += 1;
    });
    return result;
  }, [people, day.records]);

  const changes = day.log.filter((entry) => entry.type !== "refused");
  const loading = peopleLoading || day.loading;

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Staff Attendance"
        titleStyle="text-primaryBlue"
        description="Teachers check in from the mobile app. Mark or correct a day here (the reason is kept)."
        descriptionStyle="text-gray-500"
      />

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <label htmlFor="staffDate" className="mb-1.5 block text-sm font-semibold text-gray-700">
            Date
          </label>
          <DatePicker id="staffDate" value={date} max={todayKey()} onChange={(value) => value && setDate(value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(counts) as StatusKey[]).map((key) => (
            <span
              key={key}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${STAFF_STATUS_META[key].chip}`}
            >
              {STAFF_STATUS_META[key].label}: {counts[key]}
            </span>
          ))}
        </div>
      </div>

      {dayOff && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          Staff holiday: {dayOff}. Check-in is closed on this day.
        </div>
      )}
      {duty && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          Teachers called ({duty.name}): {staffDutyTimesText(duty)}. These times are used today instead of the settings.
        </div>
      )}
      {!settings.location && !loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          The school location is not set, so teachers cannot check in yet. Set it in Attendance Settings.
        </div>
      )}

      {loading ? (
        <Loader label="Loading staff attendance..." />
      ) : peopleError || day.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{peopleError || day.error}</div>
      ) : (
        <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-navy text-left text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Check-in</th>
                {settings.checkOut && <th className="px-4 py-3">Check-out</th>}
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {people.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No teachers yet.
                  </td>
                </tr>
              ) : (
                people.map((person) => {
                  const record = day.records[person.uid];
                  const device = day.devices[person.uid];
                  const hasSelfie = Boolean(record?.checkIn?.selfie || record?.checkOut?.selfie);
                  return (
                    <tr key={person.uid} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{person.name}</p>
                        <p className="text-xs text-gray-500">
                          {[person.jobRole, person.employeeId, person.personType === "staff" ? "Staff" : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={record?.status ?? "none"} />
                        {record?.leaveType && <p className="mt-1 text-xs text-navy">{record.leaveType}</p>}
                        {record?.earlyLeave && <p className="mt-1 text-xs text-orange-700">Left early</p>}
                        {record?.manual && (
                          <Tooltip content={record.manualReason || "Marked by the admin"}>
                            <p className="mt-1 w-fit cursor-help text-xs text-gray-500 underline decoration-dotted">
                              By {record.manualByName || "admin"}
                            </p>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <CheckCell check={record?.checkIn ?? null} />
                      </td>
                      {settings.checkOut && (
                        <td className="px-4 py-3">
                          {record?.checkIn && !record.checkOut && date < todayKey() ? (
                            <span className="text-xs font-semibold text-amber-700">No check-out</span>
                          ) : (
                            <CheckCell check={record?.checkOut ?? null} />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {person.personType === "staff" ? "-" : device ? device.model || "Linked" : "Not linked"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {hasSelfie && record && (
                            <Tooltip content="See selfie">
                              <button
                                type="button"
                                onClick={() => setSelfieOf(record)}
                                aria-label={`Selfie of ${person.name}`}
                                className="rounded-full p-2 text-navy hover:bg-navy-soft"
                              >
                                <Camera className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip content="Mark / correct">
                            <button
                              type="button"
                              onClick={() => setMarking(person)}
                              aria-label={`Mark ${person.name}`}
                              className="rounded-full p-2 text-navy hover:bg-navy-soft"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          {device && (
                            <Tooltip content="Reset phone">
                              <button
                                type="button"
                                onClick={() => setResetting(person)}
                                aria-label={`Reset phone of ${person.name}`}
                                className="rounded-full p-2 text-red-600 hover:bg-red-50"
                              >
                                <Smartphone className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      )}

      <RefusedCheckIns />

      {!loading && changes.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white">
          <h2 className="border-b border-gray-100 p-4 font-bold text-gray-800">Admin changes ({changes.length})</h2>
          <ul className="divide-y divide-gray-100">
            {changes.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{entry.byName || "Admin"}</span>{" "}
                  {entry.type === "deviceReset" ? "reset the phone of" : "changed"}{" "}
                  <span className="font-semibold">{entry.name}</span>
                  {entry.reason ? `: ${entry.reason}` : ""}
                </p>
                <span className="text-sm text-gray-500">{timeText(entry.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {marking && (
        <MarkDialog
          person={marking}
          date={date}
          record={day.records[marking.uid] ?? null}
          checkOut={settings.checkOut}
          onClose={(saved) => {
            setMarking(null);
            if (saved) day.reload();
          }}
        />
      )}
      {resetting && (
        <ResetDialog
          person={resetting}
          onClose={(saved) => {
            setResetting(null);
            if (saved) day.reload();
          }}
        />
      )}
      {selfieOf && <SelfieDialog record={selfieOf} onClose={() => setSelfieOf(null)} />}
    </div>
  );
}

/* -------------------------------------------------------------- dialogs -- */

interface MarkForm {
  status: string;
  checkIn: string;
  checkOut: string;
  reason: string;
}

function MarkDialog({
  person,
  date,
  record,
  checkOut,
  onClose,
}: {
  person: StaffPerson;
  date: string;
  record: StaffAttendanceRecord | null;
  checkOut: boolean;
  onClose: (saved: boolean) => void;
}) {
  const { user } = useContext(myContext);
  const [saving, setSaving] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty },
  } = useForm<MarkForm>({
    defaultValues: {
      status: record?.status ?? "",
      checkIn: hhmm(record?.checkIn ?? null),
      checkOut: hhmm(record?.checkOut ?? null),
      reason: "",
    },
  });
  const status = useWatch({ control, name: "status" });
  const checkInValue = useWatch({ control, name: "checkIn" });
  const checkOutValue = useWatch({ control, name: "checkOut" });
  const reason = useWatch({ control, name: "reason" });
  const present = ["present", "late", "halfDay"].includes(status);

  const save = handleSubmit(async (data) => {
    if (!user) return;
    setSaving(true);
    try {
      await markStaffAttendance({
        uid: person.uid,
        date,
        status: data.status as StaffAttendanceStatus,
        checkIn: present ? data.checkIn : "",
        checkOut: present && checkOut ? data.checkOut : "",
        reason: data.reason.trim(),
      });
      toast.success(`${person.name}: saved.`);
      onClose(true);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Modal
      isOpen
      onClose={() => !saving && onClose(false)}
      title="Mark Attendance"
      description={`${person.name} · ${date}`}
      submitText="Save"
      submitClassName={CVES_BUTTON}
      loading={saving}
      submitDisabled={!isDirty || !status || !reason.trim()}
      onSubmit={() => void save()}
    >
      <div className="flex flex-col gap-3">
        <CustomSelect
          control={control}
          name="status"
          label="Status"
          placeholder="Select status"
          options={STAFF_MARK_STATUS_OPTIONS}
        />
        {present && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700" htmlFor="markIn">
                Check-in
              </label>
              <TimePicker
                id="markIn"
                value={checkInValue}
                onChange={(value) => setValue("checkIn", value, { shouldDirty: true })}
              />
            </div>
            {checkOut && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700" htmlFor="markOut">
                  Check-out
                </label>
                <TimePicker
                  id="markOut"
                  value={checkOutValue}
                  onChange={(value) => setValue("checkOut", value, { shouldDirty: true })}
                />
              </div>
            )}
          </div>
        )}
        <CustomTextarea
          control={control}
          name="reason"
          label="Reason"
          required
          rows={3}
          placeholder="e.g. Phone was not working; came at 8:10"
        />
      </div>
    </Modal>
  );
}

function ResetDialog({ person, onClose }: { person: StaffPerson; onClose: (saved: boolean) => void }) {
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit } = useForm<{ reason: string }>({ defaultValues: { reason: "" } });
  const reason = useWatch({ control, name: "reason" });

  const save = handleSubmit(async (data) => {
    setSaving(true);
    try {
      await resetStaffDevice(person.uid, data.reason.trim());
      toast.success("Phone reset. The next check-in links the new phone.");
      onClose(true);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not reset.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Modal
      isOpen
      onClose={() => !saving && onClose(false)}
      title="Reset Phone"
      description={`${person.name}'s attendance is linked to one phone. After a reset, the next check-in links the phone it is made from.`}
      submitText="Reset"
      submitClassName={CVES_BUTTON}
      loading={saving}
      submitDisabled={!reason.trim()}
      onSubmit={() => void save()}
    >
      <CustomTextarea control={control} name="reason" label="Reason" required rows={2} placeholder="e.g. New phone" />
    </Modal>
  );
}

function SelfieDialog({ record, onClose }: { record: StaffAttendanceRecord; onClose: () => void }) {
  const checkIn = useStaffSelfie(record.id, "in", Boolean(record.checkIn?.selfie));
  const checkOutSelfie = useStaffSelfie(record.id, "out", Boolean(record.checkOut?.selfie));
  const items = [
    { label: `Check-in ${timeText(record.checkIn?.at ?? null)}`, ...checkIn, on: record.checkIn?.selfie },
    { label: `Check-out ${timeText(record.checkOut?.at ?? null)}`, ...checkOutSelfie, on: record.checkOut?.selfie },
  ].filter((item) => item.on);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Selfie"
      description={record.name}
      hideSubmit
      cancelText="Close"
      onSubmit={onClose}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <figure key={item.label} className="flex flex-col items-center gap-2">
            {item.loading ? (
              <Loader label="Loading..." />
            ) : item.image ? (
              <img src={item.image} alt={item.label} className="w-full rounded-md border border-gray-200" />
            ) : (
              <p className="text-sm text-gray-500">{item.error || "No photo."}</p>
            )}
            <figcaption className="text-xs font-semibold text-gray-600">{item.label}</figcaption>
          </figure>
        ))}
      </div>
    </Modal>
  );
}

export default StaffAttendanceToday;
