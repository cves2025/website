/**
 * Staff Attendance > Leave (admin): the leave requests of a session
 * (teachers ask in the mobile app), approve / reject (reason), cancel an
 * approved leave (its leave days are removed), add a leave for someone
 * (approved at once), and every person's balance per leave type.
 * All changes go through the server (`/api/staff-leave/*`).
 */
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Plus } from "lucide-react";

import {
  CVES_BUTTON,
  STAFF_LEAVE_FILTER_OPTIONS,
  STAFF_LEAVE_STATUS_META,
} from "../../../constants";
import CircleCheckbox from "../../../custom-components/CircleCheckbox";
import CustomSelect from "../../../custom-components/CustomSelect";
import CustomTextarea from "../../../custom-components/CustomTextarea";
import DatePicker from "../../../custom-components/DatePicker";
import Loader from "../../../custom-components/Loader";
import Modal from "../../../custom-components/Modal";
import PageHeader from "../../../custom-components/PageHeader";
import { useStaffAttendanceSettings, useStaffLeaves, useStaffPeople } from "../../../hooks/useStaffAttendance";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { fromDateKey, sessionDateRange } from "../../../utils/holidayCalendar";
import {
  addStaffLeave,
  cancelStaffLeave,
  decideStaffLeave,
  leaveUsage,
} from "../../../utils/staffAttendanceService";
import type { StaffLeave, StaffLeaveType, StaffPerson } from "../../../utils/type";

const sessions = generateAcademicYears();

const dateText = (key: string) => format(fromDateKey(key), "d MMM yyyy");
const rangeText = (leave: StaffLeave) =>
  leave.halfDay
    ? `${dateText(leave.from)} (half day)`
    : leave.from === leave.to
      ? dateText(leave.from)
      : `${dateText(leave.from)} – ${dateText(leave.to)}`;
const daysText = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;

type Action = { kind: "reject" | "cancel"; leave: StaffLeave } | null;

function StaffLeaves() {
  const filters = useForm<{ session: string; show: string; person: string }>({
    defaultValues: { session: sessions[0]?.value ?? "", show: "pending", person: "" },
  });
  const session = useWatch({ control: filters.control, name: "session" });
  const show = useWatch({ control: filters.control, name: "show" });
  const personFilter = useWatch({ control: filters.control, name: "person" });

  const { settings } = useStaffAttendanceSettings();
  const { people } = useStaffPeople(settings.includeStaff);
  const { leaves, loading, error, reload } = useStaffLeaves(session);
  const [adding, setAdding] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [busyId, setBusyId] = useState("");

  const usage = useMemo(() => leaveUsage(leaves), [leaves]);
  const shown = leaves.filter(
    (leave) => (show === "all" || leave.status === show) && (!personFilter || leave.uid === personFilter)
  );
  const waiting = leaves.filter((leave) => leave.status === "pending").length;
  const personOptions = [{ value: "", label: "Everyone" }, ...people.map((item) => ({ value: item.uid, label: item.name }))];

  const approve = async (leave: StaffLeave) => {
    setBusyId(leave.id);
    try {
      await decideStaffLeave(leave.id, "approved", "");
      toast.success(`${leave.name}: leave approved.`);
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not approve.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Leave"
        titleStyle="text-primaryBlue"
        description="Teachers ask for leave in the mobile app. Approve or reject here; approved days show as Leave."
        descriptionStyle="text-gray-500"
        button={
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={settings.leaveTypes.length === 0}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${CVES_BUTTON}`}
          >
            <Plus className="h-4 w-4" /> Add Leave
          </button>
        }
      />

      {settings.leaveTypes.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          No leave types yet. Add them in Attendance Settings (e.g. Casual Leave 12 days, Unpaid no limit).
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3">
        <CustomSelect control={filters.control} name="session" label="Session" placeholder={null} options={sessions} />
        <CustomSelect
          control={filters.control}
          name="show"
          label={`Show${waiting ? ` (${waiting} waiting)` : ""}`}
          placeholder={null}
          options={STAFF_LEAVE_FILTER_OPTIONS}
        />
        <CustomSelect
          control={filters.control}
          name="person"
          label="Person"
          placeholder={null}
          options={personOptions}
          searchable
        />
      </div>

      {loading ? (
        <Loader label="Loading leave..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <>
          <section className="rounded-lg border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 p-4 font-bold text-gray-800">Requests ({shown.length})</h2>
            {shown.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {shown.map((leave) => {
                  const meta = STAFF_LEAVE_STATUS_META[leave.status];
                  return (
                    <li key={leave.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">
                          {leave.name}{" "}
                          <span className={`ml-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.chip}`}>
                            {meta.label}
                          </span>
                        </p>
                        <p className="text-sm text-gray-700">
                          {leave.typeName} · {rangeText(leave)} · {daysText(leave.days)}
                        </p>
                        <p className="text-sm text-gray-500">{leave.reason}</p>
                        {(leave.decidedByName || leave.cancelReason) && (
                          <p className="text-xs text-gray-500">
                            {leave.status === "cancelled"
                              ? `Cancelled${leave.cancelReason ? `: ${leave.cancelReason}` : ""}`
                              : `${leave.byAdmin ? "Added" : meta.label} by ${leave.decidedByName}${leave.decisionNote ? `: ${leave.decisionNote}` : ""}`}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {leave.status === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === leave.id}
                              onClick={() => void approve(leave)}
                              className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${CVES_BUTTON}`}
                            >
                              {busyId === leave.id ? "Saving..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setAction({ kind: "reject", leave })}
                              className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(leave.status === "pending" || leave.status === "approved") && (
                          <button
                            type="button"
                            onClick={() => setAction({ kind: "cancel", leave })}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {settings.leaveTypes.length > 0 && (
            <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <h2 className="border-b border-gray-100 p-4 font-bold text-gray-800">Balance of {session}</h2>
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-navy text-left text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    {settings.leaveTypes.map((type) => (
                      <th key={type.id} className="px-4 py-3">
                        {type.name}
                        <span className="ml-1 font-normal normal-case opacity-80">
                          ({type.quota ? `${type.quota}` : "no limit"})
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {people.map((person) => (
                    <tr key={person.uid}>
                      <td className="px-4 py-2 font-semibold text-gray-800">{person.name}</td>
                      {settings.leaveTypes.map((type) => {
                        const used = usage[person.uid]?.[type.id] ?? 0;
                        return (
                          <td key={type.id} className="px-4 py-2 text-gray-700">
                            {type.quota ? `${used} used · ${Math.max(type.quota - used, 0)} left` : `${used} used`}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="p-3 text-xs text-gray-500">Used counts approved and waiting leave.</p>
            </section>
          )}
        </>
      )}

      {adding && (
        <AddLeaveDialog
          people={people}
          types={settings.leaveTypes}
          session={session}
          onClose={(saved) => {
            setAdding(false);
            if (saved) reload();
          }}
        />
      )}
      {action && (
        <ReasonDialog
          action={action}
          onClose={(saved) => {
            setAction(null);
            if (saved) reload();
          }}
        />
      )}
    </div>
  );
}

/** Reject (why) or cancel (why; needed for an approved leave). */
function ReasonDialog({ action, onClose }: { action: NonNullable<Action>; onClose: (saved: boolean) => void }) {
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit } = useForm<{ reason: string }>({ defaultValues: { reason: "" } });
  const reason = useWatch({ control, name: "reason" });
  const { leave, kind } = action;
  const needsReason = kind === "reject" || leave.status === "approved";

  const save = handleSubmit(async (data) => {
    setSaving(true);
    try {
      if (kind === "reject") await decideStaffLeave(leave.id, "rejected", data.reason.trim());
      else await cancelStaffLeave(leave.id, data.reason.trim());
      toast.success(kind === "reject" ? "Leave rejected." : "Leave cancelled.");
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
      title={kind === "reject" ? "Reject Leave" : "Cancel Leave"}
      description={`${leave.name} · ${leave.typeName} · ${rangeText(leave)}${
        kind === "cancel" && leave.status === "approved" ? ". Its leave days are removed from attendance." : ""
      }`}
      submitText={kind === "reject" ? "Reject" : "Cancel Leave"}
      cancelText="Close"
      submitClassName={CVES_BUTTON}
      loading={saving}
      submitDisabled={needsReason && !reason.trim()}
      onSubmit={() => void save()}
    >
      <CustomTextarea control={control} name="reason" label="Reason" required={needsReason} rows={2} />
    </Modal>
  );
}

interface AddForm {
  uid: string;
  typeId: string;
  from: string;
  to: string;
  halfDay: boolean;
  reason: string;
}

/** The admin adds a leave for someone (approved at once). */
function AddLeaveDialog({
  people,
  types,
  session,
  onClose,
}: {
  people: StaffPerson[];
  types: StaffLeaveType[];
  session: string;
  onClose: (saved: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const range = sessionDateRange(session);
  const { control, handleSubmit, setValue } = useForm<AddForm>({
    defaultValues: { uid: "", typeId: types[0]?.id ?? "", from: "", to: "", halfDay: false, reason: "" },
  });
  const values = useWatch({ control });
  const ready = Boolean(values.uid && values.typeId && values.from && values.reason?.trim());

  const save = handleSubmit(async (data) => {
    setSaving(true);
    try {
      await addStaffLeave({
        uid: data.uid,
        typeId: data.typeId,
        from: data.from,
        to: data.halfDay ? data.from : data.to || data.from,
        halfDay: data.halfDay,
        reason: data.reason.trim(),
      });
      toast.success("Leave added.");
      onClose(true);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not add the leave.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Modal
      isOpen
      onClose={() => !saving && onClose(false)}
      title="Add Leave"
      description={`Approved at once. Session ${session}; holidays and weekly offs are not counted.`}
      submitText="Add Leave"
      submitClassName={CVES_BUTTON}
      loading={saving}
      submitDisabled={!ready}
      onSubmit={() => void save()}
      modalClassName="max-w-lg"
    >
      <div className="flex flex-col gap-3">
        <CustomSelect
          control={control}
          name="uid"
          label="Person"
          placeholder="Select person"
          options={people.map((item) => ({ value: item.uid, label: item.name }))}
          searchable
        />
        <CustomSelect
          control={control}
          name="typeId"
          label="Leave type"
          placeholder={null}
          options={types.map((item) => ({ value: item.id, label: item.name }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="leaveFrom" className="mb-1.5 block text-sm font-semibold text-gray-700">
              From <span className="ml-0.5 text-red-500">*</span>
            </label>
            <DatePicker
              id="leaveFrom"
              min={range.from}
              max={range.to}
              value={values.from ?? ""}
              onChange={(value) => {
                setValue("from", value, { shouldDirty: true });
                if (values.to && values.to < value) setValue("to", "");
              }}
            />
          </div>
          {!values.halfDay && (
            <div>
              <label htmlFor="leaveTo" className="mb-1.5 block text-sm font-semibold text-gray-700">
                To <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <DatePicker
                id="leaveTo"
                placeholder="Same as From"
                min={values.from || range.from}
                max={range.to}
                value={values.to ?? ""}
                onChange={(value) => setValue("to", value, { shouldDirty: true })}
              />
            </div>
          )}
        </div>
        <CircleCheckbox
          id="leaveHalfDay"
          label="Half day (one day only)"
          checked={Boolean(values.halfDay)}
          onCheckedChange={(checked) => setValue("halfDay", checked, { shouldDirty: true })}
        />
        <CustomTextarea control={control} name="reason" label="Reason" required rows={2} />
      </div>
    </Modal>
  );
}

export default StaffLeaves;
