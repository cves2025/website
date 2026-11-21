import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

import CircleCheckbox from "../../../custom-components/CircleCheckbox";
import DatePicker from "../../../custom-components/DatePicker";
import Modal from "../../../custom-components/Modal";
import TimePicker from "../../../custom-components/TimePicker";
import Tooltip from "../../../custom-components/Tooltip";
import {
  CLASSES,
  CVES_BUTTON,
  STAFF_DUTY_LATE_AFTER,
} from "../../../constants";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import {
  fromDateKey,
  holidayAudience,
  sessionDateRange,
  staffDutyTimesText,
} from "../../../utils/holidayCalendar";
import type {
  DateRange,
  Holiday,
  HolidayAudience,
  StaffDuty,
  StaffHolidayPart,
} from "../../../utils/type";
import { inputClass, labelClass } from "./attendanceShared";

interface DutyRow {
  from: string;
  /** "" = same as From. */
  to: string;
  lateAfter: string;
  halfDayAfter: string;
  earlyLeaveBefore: string;
}

interface HolidayForm {
  name: string;
  from: string;
  /** "" = same as From. */
  to: string;
  audience: HolidayAudience;
  allClasses: boolean;
  classes: string[];
  /** Days the teachers come (everyone: called; students: another time). */
  duties: DutyRow[];
}

const AUDIENCES: { value: HolidayAudience; label: string; hint: string }[] = [
  {
    value: "everyone",
    label: "Whole school",
    hint: "Students and teachers & staff are off.",
  },
  {
    value: "students",
    label: "Students only",
    hint: "Teachers & staff come to school.",
  },
  {
    value: "staff",
    label: "Teachers & staff only",
    hint: "School is open for the students.",
  },
];

const emptyDuty = (): DutyRow => ({
  from: "",
  to: "",
  lateAfter: STAFF_DUTY_LATE_AFTER,
  halfDayAfter: "",
  earlyLeaveBefore: "",
});

function formOf(
  holiday: Holiday | null,
  part: StaffHolidayPart | null,
): HolidayForm {
  if (!holiday) {
    return {
      name: "",
      from: "",
      to: "",
      audience: "everyone",
      allClasses: true,
      classes: [],
      duties: [],
    };
  }
  return {
    name: holiday.name,
    from: holiday.from,
    to: holiday.to === holiday.from ? "" : holiday.to,
    audience: holidayAudience(holiday, part),
    allClasses: holiday.classes.length === 0,
    classes: holiday.classes,
    duties: (part?.duties ?? []).map((duty) => ({
      ...duty,
      to: duty.to === duty.from ? "" : duty.to,
    })),
  };
}

type DateName = "from" | "to" | `duties.${number}.from` | `duties.${number}.to`;
type TimeName =
  | `duties.${number}.lateAfter`
  | `duties.${number}.halfDayAfter`
  | `duties.${number}.earlyLeaveBefore`;
type FieldName = "name" | "classes" | DateName | TimeName;

/** The element id of a field (scrolled to and focused when it is wrong). */
const fieldId = (name: FieldName) =>
  name === "name" ? "holidayName" : `holiday-${name.replace(/\./g, "-")}`;

const ERROR_BORDER = "border-red-500 ring-1 ring-red-500";
const ERROR_TEXT = "mt-1 text-xs font-medium text-red-600";

const minutesOf = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const inside = (range: DateRange, outer: DateRange) =>
  outer.from <= range.from && range.to <= outer.to;

const shortDate = (key: string) => format(fromDateKey(key), "d MMM yyyy");
const shortRange = (range: DateRange) =>
  range.from === range.to
    ? shortDate(range.from)
    : `${shortDate(range.from)} – ${shortDate(range.to)}`;

/**
 * Add / edit a holiday (Holiday Calendar): name, dates, who it is for (whole
 * school / students only / teachers & staff only), the classes, and the days
 * the teachers come with their times. A summary at the bottom says in plain
 * words what happens to the students and the teachers. Not admin: students
 * only, no teachers' days (firestore.rules).
 */
function HolidayFormModal({
  holiday,
  part,
  session,
  isAdmin,
  saving,
  onClose,
  onSave,
}: {
  /** null = a new holiday. */
  holiday: Holiday | null;
  part: StaffHolidayPart | null;
  session: string;
  isAdmin: boolean;
  saving: boolean;
  onClose: () => void;
  /** A valid holiday and its teachers' part (null = none). */
  onSave: (holiday: Holiday, part: StaffHolidayPart | null) => void;
}) {
  const range = sessionDateRange(session);
  const {
    control,
    getValues,
    setError,
    clearErrors,
    formState: { isDirty },
  } = useForm<HolidayForm>({ defaultValues: formOf(holiday, part) });
  const duties = useFieldArray({ control, name: "duties" });
  const form = useWatch({ control }) as HolidayForm;
  const audience: HolidayAudience = isAdmin ? form.audience : "students";
  const days = form.from ? { from: form.from, to: form.to || form.from } : null;

  /**
   * A wrong field: its error under it, red border, scrolled into view and
   * focused (rule for every form).
   */
  const fail = (name: FieldName, message: string) => {
    setError(name, { message });
    const element = document.getElementById(fieldId(name));
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  };

  const submit = () => {
    const data = getValues();
    clearErrors();
    const name = data.name.trim();
    const holidayDays = { from: data.from, to: data.to || data.from };
    const who: HolidayAudience = isAdmin ? data.audience : "students";
    if (!name) return fail("name", "Holiday name is required.");
    if (!data.from) return fail("from", "From date is required.");
    if (holidayDays.to < holidayDays.from)
      return fail("to", "The end date cannot be before the start date.");
    if (!inside(holidayDays, range))
      return fail("from", `Dates must be inside session ${session}.`);
    if (who === "students" && !data.allClasses && data.classes.length === 0) {
      return fail("classes", "Select the classes on holiday.");
    }

    const rows: StaffDuty[] = [];
    if (isAdmin && who !== "staff") {
      for (const [index, row] of data.duties.entries()) {
        const at = `duties.${index}` as const;
        if (!row.from) return fail(`${at}.from`, "From date is required.");
        const duty = { from: row.from, to: row.to || row.from };
        if (duty.to < duty.from || !inside(duty, holidayDays)) {
          return fail(
            row.to ? `${at}.to` : `${at}.from`,
            "Must be inside the holiday's dates.",
          );
        }
        if (rows.some((item) => item.from <= duty.to && duty.from <= item.to)) {
          return fail(`${at}.from`, "These days are already in another row.");
        }
        if (!row.lateAfter)
          return fail(`${at}.lateAfter`, "Late after is required.");
        if (
          row.halfDayAfter &&
          minutesOf(row.halfDayAfter) <= minutesOf(row.lateAfter)
        ) {
          return fail(`${at}.halfDayAfter`, "Must be later than Late after.");
        }
        rows.push({
          ...duty,
          lateAfter: row.lateAfter,
          halfDayAfter: row.halfDayAfter,
          earlyLeaveBefore: row.earlyLeaveBefore,
        });
      }
      rows.sort((a, b) => a.from.localeCompare(b.from));
    }

    const off = who !== "students";
    onSave(
      {
        id: holiday?.id || `${Date.now()}`,
        name,
        ...holidayDays,
        classes:
          who === "students" && !data.allClasses
            ? CLASSES.filter((item) => data.classes.includes(item))
            : [],
        students: who !== "staff",
      },
      off || rows.length > 0
        ? { name, ...holidayDays, off, duties: rows }
        : null,
    );
  };

  /** The days of a filled row ("" until From is chosen). */
  const rowRange = (row: DutyRow): DateRange | null =>
    row.from ? { from: row.from, to: row.to || row.from } : null;
  const filledRows = (form.duties ?? []).flatMap((row) => {
    const rowDays = rowRange(row);
    return rowDays && row.lateAfter ? [{ ...row, ...rowDays }] : [];
  });

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      title={holiday ? "Edit Holiday" : "Add Holiday"}
      description={`Session ${session}. Attendance is not taken on the days off; weekly off days stay off.`}
      cancelText="Cancel"
      submitText={holiday ? "Update Holiday" : "Add Holiday"}
      submitClassName={CVES_BUTTON}
      submitDisabled={!isDirty}
      loading={saving}
      onSubmit={submit}
      modalClassName="max-w-3xl"
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="holidayName" className={labelClass}>
                  Name <span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  {...field}
                  id="holidayName"
                  className={`${inputClass} ${fieldState.error ? ERROR_BORDER : ""}`}
                  aria-invalid={Boolean(fieldState.error)}
                  placeholder="e.g. Summer Vacation"
                  onChange={(event) => {
                    field.onChange(event);
                    clearErrors("name");
                  }}
                />
                {fieldState.error && (
                  <p className={ERROR_TEXT}>{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
          <DateControl
            control={control}
            clear={clearErrors}
            name="from"
            label="From"
            required
            min={range.from}
            max={range.to}
          />
          <DateControl
            control={control}
            clear={clearErrors}
            name="to"
            label="To"
            placeholder="Same as From"
            min={form.from || range.from}
            max={range.to}
          />
        </div>

        {isAdmin && (
          <Controller
            control={control}
            name="audience"
            render={({ field }) => (
              <div>
                <p className={labelClass}>Who is on holiday?</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {AUDIENCES.map((item) => (
                    <div
                      key={item.value}
                      className={`rounded-md border p-3 ${field.value === item.value ? "border-primaryBlue bg-gray-50" : "border-gray-200"}`}
                    >
                      <CircleCheckbox
                        id={`holidayAudience-${item.value}`}
                        label={item.label}
                        checked={field.value === item.value}
                        onCheckedChange={(checked) =>
                          checked && field.onChange(item.value)
                        }
                      />
                      <p className="mt-1 pl-7 text-xs text-gray-500">
                        {item.hint}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          />
        )}

        {audience === "students" && (
          <Controller
            control={control}
            name="allClasses"
            render={({ field }) => (
              <div>
                <p className={labelClass}>Classes on holiday</p>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <CircleCheckbox
                    id="holidayAllClasses"
                    label="All classes"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      checked && field.onChange(true)
                    }
                  />
                  <CircleCheckbox
                    id="holidaySomeClasses"
                    label="Specific classes"
                    checked={!field.value}
                    onCheckedChange={(checked) =>
                      checked && field.onChange(false)
                    }
                  />
                </div>
                {!field.value && (
                  <Controller
                    control={control}
                    name="classes"
                    render={({ field: classes, fieldState }) => (
                      <div>
                        <div
                          id={fieldId("classes")}
                          tabIndex={-1}
                          className={`mt-3 grid grid-cols-3 gap-3 rounded-md border p-3 outline-none sm:grid-cols-6 ${fieldState.error ? ERROR_BORDER : "border-gray-200"}`}
                        >
                          {CLASSES.map((className) => (
                            <CircleCheckbox
                              key={className}
                              id={`holidayClass-${className}`}
                              label={toOrdinalLabel(className)}
                              checked={classes.value.includes(className)}
                              onCheckedChange={(checked) => {
                                classes.onChange(
                                  checked
                                    ? [...classes.value, className]
                                    : classes.value.filter(
                                        (item) => item !== className,
                                      ),
                                );
                                clearErrors("classes");
                              }}
                            />
                          ))}
                        </div>
                        {fieldState.error && (
                          <p className={ERROR_TEXT}>
                            {fieldState.error.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                )}
              </div>
            )}
          />
        )}

        {isAdmin && audience !== "staff" && (
          <div className="rounded-md border border-gray-200 p-3">
            <p className="text-sm font-semibold text-gray-800">
              {audience === "everyone"
                ? "Days the teachers come (optional)"
                : "Teachers' time on these days"}
            </p>
            <p className="mb-3 text-xs text-gray-500">
              {audience === "everyone"
                ? "Teachers & staff are off on all the holiday's days. Add the days they are called (e.g. copy checking) with their time."
                : "Teachers & staff come at the usual time of Attendance Settings. Add the days they have another time (e.g. 09:00 instead of 07:15)."}
            </p>
            {duties.fields.length > 0 && (
              <div className="mb-3 flex flex-col gap-3">
                {duties.fields.map((row, index) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 items-end gap-3 rounded-md bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
                  >
                    <DateControl
                      control={control}
                      clear={clearErrors}
                      name={`duties.${index}.from`}
                      label="From"
                      required
                      min={form.from || range.from}
                      max={form.to || form.from || range.to}
                    />
                    <DateControl
                      control={control}
                      clear={clearErrors}
                      name={`duties.${index}.to`}
                      label="To"
                      placeholder="Same as From"
                      min={
                        form.duties?.[index]?.from || form.from || range.from
                      }
                      max={form.to || form.from || range.to}
                    />
                    <TimeControl
                      control={control}
                      clear={clearErrors}
                      name={`duties.${index}.lateAfter`}
                      label="Late after"
                      required
                    />
                    <TimeControl
                      control={control}
                      clear={clearErrors}
                      name={`duties.${index}.halfDayAfter`}
                      label="Half Day after"
                    />
                    <TimeControl
                      control={control}
                      clear={clearErrors}
                      name={`duties.${index}.earlyLeaveBefore`}
                      label="Leaving before = Half Day"
                    />
                    <Tooltip content="Remove these days">
                      <button
                        type="button"
                        onClick={() => duties.remove(index)}
                        aria-label={`Remove row ${index + 1}`}
                        className="rounded-full p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => duties.append(emptyDuty())}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              {audience === "everyone"
                ? "Add days teachers come"
                : "Add days with another time"}
            </button>
          </div>
        )}

        {days && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
            <p className="mb-2 font-semibold text-gray-800">What will happen</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="font-medium text-gray-600">Students</dt>
              <dd className="text-gray-800">
                {audience === "staff"
                  ? "School is open."
                  : audience === "students" && !form.allClasses
                    ? `Holiday ${shortRange(days)} for classes ${(form.classes ?? []).map(toOrdinalLabel).join(", ") || "(choose)"}.`
                    : `Holiday ${shortRange(days)} (all classes).`}
              </dd>
              <dt className="font-medium text-gray-600">
                Teachers &amp; staff
              </dt>
              <dd className="text-gray-800">
                {audience === "students" ? (
                  <>
                    Come to school {shortRange(days)}
                    {filledRows.length === 0
                      ? " at the usual time."
                      : "; the usual time on the other days."}
                  </>
                ) : (
                  <>
                    Off {shortRange(days)}
                    {filledRows.length > 0 ? ", except the days below." : "."}
                  </>
                )}
                {filledRows.map((row) => (
                  <span key={row.from} className="block text-amber-800">
                    Come on {shortRange(row)}: {staffDutyTimesText(row)}
                  </span>
                ))}
              </dd>
            </dl>
          </div>
        )}
      </div>
    </Modal>
  );
}

type FormControl = ReturnType<typeof useForm<HolidayForm>>["control"];
function DateControl({
  control,
  clear,
  name,
  label,
  required = false,
  placeholder,
  min,
  max,
}: {
  control: FormControl;
  clear: (name: FieldName) => void;
  name: DateName;
  label: string;
  required?: boolean;
  placeholder?: string;
  min: string;
  max: string;
}) {
  const id = fieldId(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div>
          <label htmlFor={id} className={labelClass}>
            {label}
            {required ? (
              <span className="ml-0.5 text-red-500">*</span>
            ) : (
              <span className="font-normal text-gray-400"> (optional)</span>
            )}
          </label>
          <DatePicker
            id={id}
            placeholder={placeholder}
            min={min}
            max={max}
            value={field.value}
            aria-invalid={Boolean(fieldState.error)}
            className={fieldState.error ? ERROR_BORDER : ""}
            onChange={(value) => {
              field.onChange(value);
              clear(name);
            }}
          />
          {fieldState.error && (
            <p className={ERROR_TEXT}>{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}

function TimeControl({
  control,
  clear,
  name,
  label,
  required = false,
}: {
  control: FormControl;
  clear: (name: FieldName) => void;
  name: TimeName;
  label: string;
  required?: boolean;
}) {
  const id = fieldId(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div>
          <label htmlFor={id} className={labelClass}>
            {label}
            {required ? (
              <span className="ml-0.5 text-red-500">*</span>
            ) : (
              <span className="font-normal text-gray-400"> (optional)</span>
            )}
          </label>
          <div className="flex items-center gap-1">
            <TimePicker
              id={id}
              value={field.value}
              aria-invalid={Boolean(fieldState.error)}
              onChange={(value) => {
                field.onChange(value);
                clear(name);
              }}
              className={`flex-1 ${fieldState.error ? ERROR_BORDER : ""}`}
            />
            {!required && field.value && (
              <Tooltip content="Clear">
                <button
                  type="button"
                  onClick={() => field.onChange("")}
                  aria-label={`Clear ${label}`}
                  className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
          </div>
          {fieldState.error && (
            <p className={ERROR_TEXT}>{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}

export default HolidayFormModal;
