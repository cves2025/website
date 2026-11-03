import { ChangeEvent, ComponentProps, useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DropdownProps } from "react-day-picker";
import SelectDropdown from "./SelectDropdown";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** What a typeable DatePicker reports for text that is not a valid date. */
export const INVALID_DATE = "invalid";

interface DatePickerProps {
  /** Date as "yyyy-MM-dd" (same format as <input type="date">), or "". */
  value: string;
  /**
   * Receives "yyyy-MM-dd" or "". A `typeable` picker also sends
   * INVALID_DATE while the typed text is not a valid date inside min / max.
   */
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** Classes for the trigger box. */
  className?: string;
  /** Earliest selectable date, "yyyy-MM-dd". */
  min?: string;
  /** Latest selectable date, "yyyy-MM-dd". */
  max?: string;
  /** The date can also be typed as DD/MM/YYYY. */
  typeable?: boolean;
  /** Month / year dropdowns in the calendar header (for far-away dates such as a birth date). */
  yearDropdown?: boolean;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
}

/** "yyyy-MM-dd" -> local Date (no timezone shift), or undefined. */
function parseDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** "DD/MM/YYYY" -> local Date, only for a real calendar day. */
function parseTyped(text: string): Date | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return undefined;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}

/** Keeps digits only and puts the slashes in: "0101" -> "01/01". */
function maskTyped(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Month / year dropdown of the calendar, in the app's own dropdown style. */
function CalendarDropdown({
  options = [],
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: DropdownProps) {
  return (
    <SelectDropdown
      value={String(value ?? "")}
      onValueChange={(next) =>
        // DayPicker listens for a <select> change event; only target.value is read.
        onChange?.({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)
      }
      options={options.map((option) => ({
        label: option.label,
        value: String(option.value),
        disabled: option.disabled,
      }))}
      disabled={disabled}
      aria-label={ariaLabel}
      // Above the prev / next nav bar, which spans the whole caption row.
      className="relative z-10 h-8 gap-1 py-1"
      contentClassName="max-h-64"
    />
  );
}

/** Calendar day in the app's pink (hover + selected). */
function PinkDayButton(props: ComponentProps<typeof CalendarDayButton>) {
  return (
    <CalendarDayButton
      {...props}
      className="hover:bg-pink-50 hover:text-primaryPink data-[selected-single=true]:bg-primaryPink data-[selected-single=true]:text-white"
    />
  );
}

/**
 * App-wide date picker: shadcn/ui Popover + Calendar, pink selected day.
 * Works with plain "yyyy-MM-dd" strings so it can replace
 * <input type="date"> without changing how dates are stored.
 */
function DatePicker({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  className,
  min,
  max,
  typeable = false,
  yearDropdown = false,
  onBlur,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const minDate = min ? parseDate(min) : undefined;
  const maxDate = max ? parseDate(max) : undefined;
  // With nothing selected the calendar opens on today's month, kept inside
  // min / max.
  const today = new Date();
  const openMonth =
    selected ??
    (maxDate && today > maxDate
      ? maxDate
      : minDate && today < minDate
        ? minDate
        : today);

  const [typed, setTyped] = useState(selected ? format(selected, "dd/MM/yyyy") : "");

  // A new value from outside (calendar pick, form reset) replaces the text;
  // INVALID_DATE keeps what the user is typing.
  useEffect(() => {
    if (value === INVALID_DATE) return;
    const date = parseDate(value);
    setTyped(date ? format(date, "dd/MM/yyyy") : "");
  }, [value]);

  const inRange = (date: Date) =>
    (!minDate || date >= minDate) && (!maxDate || date <= maxDate);

  const handleTyped = (text: string) => {
    const masked = maskTyped(text);
    setTyped(masked);
    if (masked === "") {
      onChange("");
      return;
    }
    const date = parseTyped(masked);
    onChange(date && inRange(date) ? format(date, "yyyy-MM-dd") : INVALID_DATE);
  };

  const calendar = (
    <PopoverContent
      align={typeable ? "end" : "start"}
      className="w-auto border-primaryPink bg-white p-0"
    >
      <Calendar
        mode="single"
        // Always 6 week rows, so the height (and the prev / next buttons)
        // stay put while moving between months.
        fixedWeeks
        selected={selected}
        defaultMonth={openMonth}
        captionLayout={yearDropdown ? "dropdown" : "label"}
        // The year dropdown lists the years between min and max.
        startMonth={yearDropdown ? minDate : undefined}
        endMonth={yearDropdown ? maxDate : undefined}
        disabled={[
          ...(minDate ? [{ before: minDate }] : []),
          ...(maxDate ? [{ after: maxDate }] : []),
        ]}
        onSelect={(date) => {
          onChange(date ? format(date, "yyyy-MM-dd") : "");
          setOpen(false);
        }}
        components={{ DayButton: PinkDayButton, Dropdown: CalendarDropdown }}
      />
    </PopoverContent>
  );

  if (typeable) {
    const invalid = aria["aria-invalid"] === true;
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            "flex w-full items-center rounded-md border bg-white shadow-sm transition-colors focus-within:ring-2",
            invalid
              ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/40"
              : "border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500/50",
            disabled && "bg-gray-100",
            className
          )}
        >
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={typed}
            disabled={disabled}
            placeholder={placeholder ?? "DD/MM/YYYY"}
            onChange={(event) => handleTyped(event.target.value)}
            onBlur={onBlur}
            className="min-w-0 flex-1 rounded-md bg-transparent px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed"
            {...aria}
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Open calendar"
              title="Open calendar"
              className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </div>
        {calendar}
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          data-empty={!selected}
          className={cn(
            "h-auto w-full justify-between gap-2 border-gray-300 bg-white px-3 py-2 text-left text-sm font-normal text-gray-800 shadow-sm hover:bg-white focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:bg-gray-100 data-[empty=true]:text-gray-400",
            className
          )}
          {...aria}
        >
          {selected ? format(selected, "dd MMM yyyy") : (placeholder ?? "Select date")}
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {calendar}
    </Popover>
  );
}

export default DatePicker;
