import { ComponentProps, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  /** Date as "yyyy-MM-dd" (same format as <input type="date">), or "". */
  value: string;
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
  "aria-invalid"?: boolean;
}

/** "yyyy-MM-dd" -> local Date (no timezone shift), or undefined. */
function parseDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
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
  placeholder = "Select date",
  id,
  disabled,
  className,
  min,
  max,
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
          {selected ? format(selected, "dd MMM yyyy") : placeholder}
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto border-primaryPink bg-white p-0"
      >
        <Calendar
          mode="single"
          // Always 6 week rows, so the height (and the prev / next buttons)
          // stay put while moving between months.
          fixedWeeks
          selected={selected}
          defaultMonth={openMonth}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          components={{ DayButton: PinkDayButton }}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
