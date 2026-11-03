import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SelectDropdownOption {
  /** Text shown to the user in the dropdown (e.g. "Male"). */
  label: string;
  /** Actual value (e.g. "male"). May be "" (e.g. an "All Classes" option). */
  value: string;
  /** Extra text the search box also matches (only used when `searchable`). */
  keywords?: string;
  /** Shown but not selectable (plain dropdown only). */
  disabled?: boolean;
}

interface SelectDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectDropdownOption[];
  /** Shown while no option is selected (default "Select"). */
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Classes for the trigger (the closed dropdown box). */
  className?: string;
  /** Extra classes for the opened list. */
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
  /** Show a search box on top of the list (single select, filters as you type). */
  searchable?: boolean;
  /** Placeholder of the search box (default "Search..."). */
  searchPlaceholder?: string;
  /** Shown in the list when the search has no match. */
  emptyMessage?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}

// Default trigger look, shared by every dropdown in the app: same height
// (38px), border and focus ring as the text inputs. Pass className to adjust.
const TRIGGER_CLASS =
  "h-auto border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 disabled:bg-gray-100 data-[placeholder]:text-gray-400";

// Radix Select items cannot use "" as a value, so an option with value ""
// is mapped to this sentinel internally; callers always see "".
const EMPTY_VALUE = "__empty__";

const toSelectValue = (value: string) => (value === "" ? EMPTY_VALUE : value);
const fromSelectValue = (value: string) => (value === EMPTY_VALUE ? "" : value);

// Same box as the shadcn SelectTrigger, so both variants look identical.
const SEARCHABLE_TRIGGER_CLASS =
  "flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border shadow-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const OPTION_CLASS =
  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none";

type SearchableDropdownProps = Omit<SelectDropdownProps, "searchable">;

/**
 * The `searchable` variant: a popover with a search box above the options.
 * Typing filters by label + keywords; ArrowUp / ArrowDown move the highlight,
 * Enter picks it, Escape or a click outside closes the list.
 */
const SearchableDropdown = forwardRef<HTMLButtonElement, SearchableDropdownProps>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "Select",
      id,
      name,
      disabled,
      className,
      contentClassName,
      onOpenChange,
      searchPlaceholder = "Search...",
      emptyMessage,
      ...aria
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    const selected = options.find((opt) => opt.value === value);
    // With no "" option, "" means "nothing selected" → show the placeholder.
    const showPlaceholder = !selected;

    const filtered = useMemo(() => {
      const needle = search.trim().toLowerCase();
      if (!needle) return options;
      return options.filter((opt) =>
        `${opt.label} ${opt.keywords ?? ""}`.toLowerCase().includes(needle)
      );
    }, [options, search]);

    const changeOpen = (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
      if (next) {
        setSearch("");
        const index = options.findIndex((opt) => opt.value === value);
        setActiveIndex(index === -1 ? 0 : index);
      }
    };

    const pick = (next: string) => {
      onValueChange(next);
      changeOpen(false);
    };

    // Keep the highlighted row in view while moving with the arrow keys.
    useEffect(() => {
      if (!open) return;
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }, [open, activeIndex]);

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (filtered.length === 0) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex(
          (current) => (current + step + filtered.length) % filtered.length
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        const option = filtered[activeIndex];
        if (option) pick(option.value);
      }
    };

    return (
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            id={id}
            name={name}
            ref={ref}
            role="combobox"
            aria-expanded={open}
            data-placeholder={showPlaceholder ? "" : undefined}
            className={cn(SEARCHABLE_TRIGGER_CLASS, TRIGGER_CLASS, className)}
            {...aria}
          >
            <span className="truncate">
              {showPlaceholder ? placeholder : selected.label}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            "w-[--radix-popover-trigger-width] min-w-[12rem] border-primaryPink bg-white p-0 text-slate-900",
            contentClassName
          )}
        >
          <div className="flex items-center gap-2 border-b border-gray-200 px-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <div ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-gray-500">
                {emptyMessage ??
                  (search.trim()
                    ? `No match for "${search.trim()}"`
                    : "No option available")}
              </p>
            ) : (
              filtered.map((opt, index) => {
                const isSelected = opt.value === value && Boolean(selected);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => pick(opt.value)}
                    className={cn(
                      OPTION_CLASS,
                      isSelected
                        ? "bg-primaryPink font-semibold text-white"
                        : index === activeIndex && "bg-primaryPink/80 text-white"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);
SearchableDropdown.displayName = "SearchableDropdown";

/**
 * App-wide dropdown built on the shadcn/ui Select — white list with a pink
 * border, pink background on hover and on the selected option.
 */
const SelectDropdown = forwardRef<HTMLButtonElement, SelectDropdownProps>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "Select",
      id,
      name,
      disabled,
      className,
      contentClassName,
      onOpenChange,
      searchable,
      searchPlaceholder,
      emptyMessage,
      ...aria
    },
    ref
  ) => {
    if (searchable) {
      return (
        <SearchableDropdown
          ref={ref}
          value={value}
          onValueChange={onValueChange}
          options={options}
          placeholder={placeholder}
          id={id}
          name={name}
          disabled={disabled}
          className={className}
          contentClassName={contentClassName}
          onOpenChange={onOpenChange}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          {...aria}
        />
      );
    }

    const hasEmptyOption = options.some((opt) => opt.value === "");
    // With no "" option, "" means "nothing selected" → show the placeholder.
    const selectValue =
      value === "" && !hasEmptyOption ? "" : toSelectValue(value);

    return (
      <Select
        name={name}
        value={selectValue}
        onValueChange={(next) => onValueChange(fromSelectValue(next))}
        onOpenChange={onOpenChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          ref={ref}
          className={cn(TRIGGER_CLASS, className)}
          {...aria}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          className={cn(
            "border-primaryPink bg-white text-slate-900",
            contentClassName
          )}
        >
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={toSelectValue(opt.value)}
              disabled={opt.disabled}
              className="cursor-pointer focus:bg-primaryPink focus:text-white data-[state=checked]:bg-primaryPink data-[state=checked]:font-semibold data-[state=checked]:text-white"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);
SelectDropdown.displayName = "SelectDropdown";

export default SelectDropdown;
