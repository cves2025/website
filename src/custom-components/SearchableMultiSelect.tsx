import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaCheck, FaChevronDown, FaSearch, FaTimes } from "react-icons/fa";

export interface SearchableOption {
  /** Value stored in the parent state. */
  value: string;
  /** Main text of the row. */
  label: string;
  /** Small grey tag on the right of the row (e.g. the academic session). */
  hint?: string;
  /** Extra text the search box also matches (e.g. father's name, roll no). */
  keywords?: string;
  disabled?: boolean;
}

export interface SearchableMultiSelectProps {
  options: SearchableOption[];
  /** Selected values (controlled component). */
  values: string[];
  /** Called with the next selection after every change. */
  onChange: (values: string[]) => void;
  label?: string;
  /** Text shown inside the box when nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Text shown when the search has no match. */
  emptyMessage?: string;
  /** Allow more than one value (default true). */
  multiple?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  /** Chips shown before collapsing the rest into "+N". */
  maxChips?: number;
  helpText?: string;
  /** Extra content rendered under the box (e.g. a warning). */
  footer?: ReactNode;
  id?: string;
  required?: boolean;
  className?: string;
  wrapperClassName?: string;
}

/** Fallback text shown in the dropdown when nothing matches the search. */
function defaultEmptyMessage(query: string): string {
  return query.trim() ? `No match for "${query.trim()}"` : "No option available";
}

/**
 * Reusable searchable (multi) select, controlled through `values` / `onChange`
 * so it can be dropped into any page - with or without react-hook-form.
 *
 * - The box above is the trigger; the search field inside the dropdown filters
 *   by label, hint and keywords, and each row toggles on click.
 * - Multi-select (default) keeps the dropdown open and shows the picked values
 *   as removable chips; `multiple={false}` behaves like a normal dropdown.
 * - "Select shown" only affects the rows matching the current search.
 * - Escape or a click outside closes the dropdown.
 */
function SearchableMultiSelect({
  options,
  values,
  onChange,
  label,
  placeholder = "Select",
  searchPlaceholder = "Type to search...",
  emptyMessage,
  multiple = true,
  disabled = false,
  loading = false,
  loadingLabel = "Loading...",
  maxChips = 4,
  helpText,
  footer,
  id,
  required = false,
  className = "",
  wrapperClassName = "",
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  /* Opens below the trigger by default, but flips above it when the drop-down
     no longer fits below (e.g. a select near the bottom edge of the screen
     or inside a modal). The panel is measured right after it mounts, before
     paint, so it never visibly jumps. */
  const [openUp, setOpenUp] = useState(false);

  const measureDirection = useCallback(() => {
    const button = buttonRef.current;
    const panel = panelRef.current;
    if (!button || !panel) return;

    const buttonRect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const panelHeight = panel.offsetHeight;

    if (panelHeight <= spaceBelow) {
      setOpenUp(false);
    } else if (panelHeight <= spaceAbove) {
      setOpenUp(true);
    } else {
      setOpenUp(spaceAbove > spaceBelow);
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measureDirection();
  }, [open, measureDirection]);

  /* Re-measure while open so the panel stays on the right side if the window
     is resized or the page scrolls under it. */
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measureDirection);
    window.addEventListener("scroll", measureDirection, true);
    return () => {
      window.removeEventListener("resize", measureDirection);
      window.removeEventListener("scroll", measureDirection, true);
    };
  }, [open, measureDirection]);

  const selectedSet = useMemo(() => new Set(values), [values]);

  /** Selected values resolved back to their option (for the chips). */
  const selectedOptions = useMemo(
    () =>
      values
        .map((value) => options.find((option) => option.value === value))
        .filter((option): option is SearchableOption => Boolean(option)),
    [values, options]
  );

  /* Close the dropdown when the user clicks / taps outside of it. */
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  /* Escape closes the dropdown from anywhere on the page. */
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  /* The search box takes focus as soon as the dropdown opens. */
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      `${option.label} ${option.hint ?? ""} ${option.keywords ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [options, normalizedQuery]);

  const allFilteredSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every(
      (option) => option.disabled || selectedSet.has(option.value)
    );

  const toggleOption = (option: SearchableOption) => {
    if (option.disabled) return;
    const next = selectedSet.has(option.value)
      ? values.filter((value) => value !== option.value)
      : multiple
        ? [...values, option.value]
        : [option.value];
    onChange(next);
    if (!multiple) {
      setOpen(false);
      setQuery("");
    }
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredValues = new Set(filteredOptions.map((o) => o.value));
      onChange(values.filter((value) => !filteredValues.has(value)));
      return;
    }
    onChange(
      Array.from(
        new Set([
          ...values,
          ...filteredOptions.filter((o) => !o.disabled).map((o) => o.value),
        ])
      )
    );
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  const hiddenChipCount = Math.max(selectedOptions.length - maxChips, 0);

  return (
    <div
      ref={containerRef}
      className={`flex w-full flex-col gap-1.5 ${wrapperClassName}`}
    >
      {label && (
        <span className="block text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      )}

      <div className="relative">
        {/* Selected chips + placeholder; also the open / close button */}
        <button
          type="button"
          id={id}
          ref={buttonRef}
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex min-h-[42px] w-full items-start justify-between gap-2 rounded-md border bg-white px-2.5 py-2 text-left text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 ${
            open
              ? "border-blue-500 ring-2 ring-blue-500/40"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/50"
          } ${className}`}
        >
          <span className="flex flex-1 flex-wrap items-center gap-1">
            {selectedOptions.length === 0 ? (
              <span className="px-1 py-0.5 text-gray-400">
                {loading ? loadingLabel : placeholder}
              </span>
            ) : (
              <>
                {selectedOptions.slice(0, maxChips).map((option) => (
                  <span
                    key={option.value}
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800"
                  >
                    <span className="truncate">{option.label}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      title={`Remove ${option.label}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeValue(option.value);
                      }}
                      className="text-blue-700 hover:text-red-600"
                    >
                      <FaTimes className="text-[10px]" />
                    </span>
                  </span>
                ))}
                {hiddenChipCount > 0 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                    +{hiddenChipCount} more
                  </span>
                )}
              </>
            )}
          </span>
          <span className="mt-0.5 flex shrink-0 items-center gap-2 text-gray-400">
            {selectedOptions.length > 0 && (
              <span className="rounded bg-gray-100 px-1.5 text-xs font-bold text-gray-600">
                {selectedOptions.length}
              </span>
            )}
            <FaChevronDown
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {open && (
          <div
            ref={panelRef}
            className={`absolute left-0 right-0 z-30 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg ${
              openUp ? "bottom-full mb-1" : "mt-1"
            }`}
          >
            {/* Search box */}
            <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
              <FaSearch className="text-xs text-gray-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full border-0 bg-transparent p-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
              />
              {query && (
                <button
                  type="button"
                  title="Clear search"
                  onClick={() => setQuery("")}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>

            {/* Options */}
            <div className="max-h-64 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-gray-500">
                  {emptyMessage || defaultEmptyMessage(query)}
                </p>
              ) : (
                filteredOptions.map((option) => {
                  const checked = selectedSet.has(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        option.disabled
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-blue-50"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {checked && <FaCheck className="text-[9px]" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-gray-800">
                          {option.label}
                        </span>
                        {option.hint && (
                          <span className="block truncate text-xs text-gray-500">
                            {option.hint}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
              <span>
                {values.length} of {options.length} selected
                {normalizedQuery ? ` · ${filteredOptions.length} match` : ""}
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  className="rounded border border-gray-300 bg-white px-2 py-1 font-bold text-gray-700 hover:bg-gray-100"
                >
                  {allFilteredSelected ? "Unselect shown" : "Select shown"}
                </button>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  disabled={values.length === 0}
                  className="rounded border border-gray-300 bg-white px-2 py-1 font-bold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              </span>
            </div>
          </div>
        )}
      </div>

      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
      {footer}
    </div>
  );
}

export default SearchableMultiSelect;