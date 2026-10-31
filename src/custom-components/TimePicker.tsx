import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  /** Time as 24-hour "HH:mm" (same format as <input type="time">), or "". */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** Gap between the minute options (default 5). */
  minuteStep?: number;
  /** Classes for the trigger box. */
  className?: string;
  "aria-invalid"?: boolean;
}

type Period = "AM" | "PM";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

/** "HH:mm" -> 12-hour parts, or null when empty / invalid. */
function parseTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (hour24 > 23 || minute > 59) return null;
  return {
    hour: hour24 % 12 || 12,
    minute,
    period: (hour24 >= 12 ? "PM" : "AM") as Period,
  };
}

function toValue(hour: number, minute: number, period: Period): string {
  const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * App-wide time picker: a shadcn/ui Popover with Hour / Minute / AM-PM
 * columns, pink selected values. shadcn has no time picker of its own; this
 * follows the same look as DatePicker and SelectDropdown. Works with plain
 * 24-hour "HH:mm" strings so it can replace <input type="time">.
 */
function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  id,
  disabled,
  minuteStep = 5,
  className,
  ...aria
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value);
  const listRef = useRef<HTMLDivElement>(null);

  const minutes = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => i * minuteStep
  );
  // Keep an existing off-step minute (e.g. 09:07) selectable.
  if (parsed && !minutes.includes(parsed.minute)) {
    minutes.push(parsed.minute);
    minutes.sort((a, b) => a - b);
  }

  // Bring the selected hour / minute into view when the picker opens.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelectorAll<HTMLElement>("[data-selected=true]")
        .forEach((el) => el.scrollIntoView({ block: "center" }));
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const update = (part: Partial<{ hour: number; minute: number; period: Period }>) => {
    const base = parsed ?? { hour: 9, minute: 0, period: "AM" as Period };
    const next = { ...base, ...part };
    onChange(toValue(next.hour, next.minute, next.period));
  };

  const optionClass = (selected: boolean) =>
    cn(
      "w-full rounded-md px-2 py-1.5 text-center text-sm transition-colors focus:outline-none",
      selected
        ? "bg-primaryPink font-semibold text-white"
        : "hover:bg-pink-50 hover:text-primaryPink focus-visible:bg-pink-50"
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          data-empty={!parsed}
          className={cn(
            "h-auto w-full justify-between gap-2 border-gray-300 bg-white px-3 py-2 text-left text-sm font-normal text-gray-800 shadow-sm hover:bg-white focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:bg-gray-100 data-[empty=true]:text-gray-400",
            className
          )}
          {...aria}
        >
          {parsed
            ? `${pad(parsed.hour)}:${pad(parsed.minute)} ${parsed.period}`
            : placeholder}
          <Clock className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto border-primaryPink bg-white p-2"
      >
        <div ref={listRef} className="flex gap-1">
          {[
            { title: "Hour", items: HOURS, current: parsed?.hour, key: "hour" as const },
            { title: "Min", items: minutes, current: parsed?.minute, key: "minute" as const },
          ].map((column) => (
            <div key={column.key} className="w-14">
              <p className="pb-1 text-center text-xs font-semibold text-gray-500">
                {column.title}
              </p>
              <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                {column.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    data-selected={column.current === item}
                    onClick={() => update({ [column.key]: item })}
                    className={optionClass(column.current === item)}
                  >
                    {pad(item)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="w-14">
            <p className="pb-1 text-center text-xs font-semibold text-gray-500">
              &nbsp;
            </p>
            <div className="flex flex-col gap-0.5">
              {(["AM", "PM"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => update({ period })}
                  className={optionClass(parsed?.period === period)}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TimePicker;
