import { useContext, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

import PageHeader from "../../../custom-components/PageHeader";
import SelectDropdown from "../../../custom-components/SelectDropdown";
import DatePicker from "../../../custom-components/DatePicker";
import CircleCheckbox from "../../../custom-components/CircleCheckbox";
import Loader from "../../../custom-components/Loader";
import Modal from "../../../custom-components/Modal";
import { myContext } from "../../context/MyContextProvider";
import { CLASSES, CVES_BUTTON } from "../../../constants";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import useHolidayCalendar from "../../../hooks/useHolidayCalendar";
import { saveHolidayCalendar } from "../../../utils/attendanceService";
import {
  WEEKDAY_LABELS,
  fromDateKey,
  sessionDateRange,
  sortHolidays,
} from "../../../utils/holidayCalendar";
import type { Holiday, HolidayCalendar as Calendar } from "../../../utils/type";
import { inputClass, labelClass } from "./attendanceShared";

const sessions = generateAcademicYears();

interface HolidayForm {
  id: string;
  name: string;
  from: string;
  to: string;
  allClasses: boolean;
  classes: string[];
}

const emptyForm = (): HolidayForm => ({
  id: "",
  name: "",
  from: "",
  to: "",
  allClasses: true,
  classes: [],
});

interface FormErrors {
  name?: string;
  from?: string;
}

const ERROR_BORDER =
  "border-red-400 focus:border-red-500 focus:ring-red-500/40 focus-visible:border-red-500 focus-visible:ring-red-500/40";
const ERROR_TEXT = "mt-1 text-xs font-medium text-red-600";

const dateLabel =(key: string) => format(fromDateKey(key), "d MMM yyyy");

const rangeLabel = (holiday: Holiday) =>
  holiday.from === holiday.to
    ? dateLabel(holiday.from)
    : `${dateLabel(holiday.from)} – ${dateLabel(holiday.to)}`;

/**
 * Weekly off days and holidays of a session (admin only). A holiday can be
 * for the whole school or for some classes only (e.g. winter vacation of the
 * small classes). Attendance cannot be marked on these days and the report
 * does not count them.
 */
function HolidayCalendar() {
  const { user } = useContext(myContext);
  const [session, setSession] = useState(sessions[0]?.value ?? "");
  const { calendar, setCalendar, loading, error } = useHolidayCalendar(session);
  const [form, setForm] = useState<HolidayForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const range = sessionDateRange(session);

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
  };

  const persist = async (next: Calendar, message: string) => {
    if (!user) return false;
    setSaving(true);
    try {
      await saveHolidayCalendar(next, user.uid);
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

  const toggleWeeklyOff = (day: number) => {
    const weeklyOff = calendar.weeklyOff.includes(day)
      ? calendar.weeklyOff.filter((value) => value !== day)
      : [...calendar.weeklyOff, day];
    void persist({ ...calendar, weeklyOff }, "Weekly off updated.");
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const to = form.to || form.from;
    const nextErrors: FormErrors = {
      name: name ? undefined : "Holiday name is required.",
      from: form.from ? undefined : "From date is required.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.from) {
      // Focus the first field with an error.
      document
        .getElementById(nextErrors.name ? "holidayName" : "holidayFrom")
        ?.focus();
      return;
    }
    if (to < form.from) {
      toast.error("The end date cannot be before the start date.");
      return;
    }
    if (form.from < range.from || to > range.to) {
      toast.error(`Dates must be inside session ${session}.`);
      return;
    }
    if (!form.allClasses && form.classes.length === 0) {
      toast.error("Select the classes on holiday.");
      return;
    }
    const holiday: Holiday = {
      id: form.id || `${Date.now()}`,
      name,
      from: form.from,
      to,
      classes: form.allClasses
        ? []
        : CLASSES.filter((className) => form.classes.includes(className)),
    };
    const holidays = form.id
      ? calendar.holidays.map((item) => (item.id === form.id ? holiday : item))
      : [...calendar.holidays, holiday];
    const ok = await persist(
      { ...calendar, holidays },
      form.id ? "Holiday updated." : "Holiday added."
    );
    if (ok) resetForm();
  };

  const handleEdit = (holiday: Holiday) => {
    setErrors({});
    setForm({
      id: holiday.id,
      name: holiday.name,
      from: holiday.from,
      to: holiday.to,
      allClasses: holiday.classes.length === 0,
      classes: holiday.classes,
    });
  };

  const handleConfirmDelete = async () => {
    const holiday = holidayToDelete;
    if (!holiday) return;
    const ok = await persist(
      {
        ...calendar,
        holidays: calendar.holidays.filter((item) => item.id !== holiday.id),
      },
      "Holiday deleted."
    );
    if (!ok) return;
    if (form.id === holiday.id) resetForm();
    setHolidayToDelete(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Holiday Calendar"
        titleStyle="text-primaryBlue"
        description="Weekly off days and holidays of the session. Attendance is not taken on these days."
        descriptionStyle="text-gray-500"
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
            resetForm();
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
              School is closed on these days every week.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {WEEKDAY_LABELS.map((label, day) => (
                <CircleCheckbox
                  key={label}
                  id={`weeklyOff-${day}`}
                  label={label}
                  checked={calendar.weeklyOff.includes(day)}
                  disabled={saving}
                  onCheckedChange={() => toggleWeeklyOff(day)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-bold text-gray-800">
              {form.id ? "Edit holiday" : "Add holiday"}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="holidayName" className={labelClass}>
                  Name <span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  id="holidayName"
                  className={`${inputClass} ${errors.name ? ERROR_BORDER : ""}`}
                  placeholder="e.g. Diwali, Winter Vacation"
                  value={form.name}
                  aria-invalid={Boolean(errors.name)}
                  onChange={(event) => {
                    setForm({ ...form, name: event.target.value });
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                />
                {errors.name && <p className={ERROR_TEXT}>{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="holidayFrom" className={labelClass}>
                  From <span className="ml-0.5 text-red-500">*</span>
                </label>
                <DatePicker
                  id="holidayFrom"
                  min={range.from}
                  max={range.to}
                  value={form.from}
                  aria-invalid={Boolean(errors.from)}
                  className={errors.from ? ERROR_BORDER : ""}
                  onChange={(from) => {
                    setForm({
                      ...form,
                      from,
                      to: form.to && form.to < from ? "" : form.to,
                    });
                    if (errors.from) setErrors({ ...errors, from: undefined });
                  }}
                />
                {errors.from && <p className={ERROR_TEXT}>{errors.from}</p>}
              </div>
              <div>
                <label htmlFor="holidayTo" className={labelClass}>
                  To <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <DatePicker
                  id="holidayTo"
                  placeholder="Same as From"
                  min={form.from || range.from}
                  max={range.to}
                  value={form.to}
                  onChange={(to) => setForm({ ...form, to })}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <CircleCheckbox
                id="holidayWholeSchool"
                label="Whole school"
                checked={form.allClasses}
                onCheckedChange={(checked) =>
                  setForm({ ...form, allClasses: checked })
                }
              />
              <CircleCheckbox
                id="holidaySpecificClasses"
                label="Specific classes"
                checked={!form.allClasses}
                onCheckedChange={(checked) =>
                  setForm({ ...form, allClasses: !checked })
                }
              />
            </div>
            {!form.allClasses && (
              <div className="mt-3 rounded-md border border-gray-200 p-3">
                <p className={labelClass}>Classes on holiday</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {CLASSES.map((className) => (
                    <CircleCheckbox
                      key={className}
                      id={`holidayClass-${className}`}
                      label={toOrdinalLabel(className)}
                      checked={form.classes.includes(className)}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          classes: checked
                            ? [...form.classes, className]
                            : form.classes.filter((item) => item !== className),
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
                className={`rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:hover:brightness-100 ${CVES_BUTTON}`}
              >
                {form.id ? "Update Holiday" : "Add Holiday"}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="rounded-md border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
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
              <ul className="divide-y divide-gray-100">
                {calendar.holidays.map((holiday) => (
                  <li
                    key={holiday.id}
                    className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {holiday.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {rangeLabel(holiday)} ·{" "}
                        {holiday.classes.length === 0
                          ? "Whole school"
                          : `Classes ${holiday.classes.map(toOrdinalLabel).join(", ")}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleEdit(holiday)}
                        title="Edit holiday"
                        aria-label={`Edit ${holiday.name}`}
                        className="rounded-full p-2 text-primaryBlue transition-colors hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setHolidayToDelete(holiday)}
                        title="Delete holiday"
                        aria-label={`Delete ${holiday.name}`}
                        className="rounded-full p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
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
