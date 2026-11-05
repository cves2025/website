import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import useStudentSearch from "../../../hooks/useStudentSearch";
import type { StudentSearchResult } from "../../../hooks/useStudentSearch";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { inputClass, labelClass } from "../attendance/attendanceShared";

interface StudentSearchProps {
  session: string;
  onPick: (student: StudentSearchResult) => void;
}

/**
 * Finds a student of the session by enrollment number or name; picking one
 * fills the class, section and student of the filter.
 */
function StudentSearch({ session, onPick }: StudentSearchProps) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const { results, loading, error, ready } = useStudentSearch(session, term);

  // A new session starts a new search.
  useEffect(() => setTerm(""), [session]);
  useEffect(() => setActive(0), [results]);

  const pick = (student: StudentSearchResult) => {
    onPick(student);
    setTerm("");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && open && results[active]) {
      event.preventDefault();
      pick(results[active]);
    }
  };

  const showList = open && ready;

  return (
    // The list opens in a portal, so a scrolling side column never clips it.
    <Popover open={showList} onOpenChange={setOpen}>
      <div>
        <label htmlFor="collectSearch" className={labelClass}>
          Search student
        </label>
        <PopoverAnchor asChild>
          <div ref={boxRef} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="collectSearch"
              type="search"
              autoComplete="off"
              role="combobox"
              aria-expanded={showList}
              aria-controls="collectSearchList"
              className={`${inputClass} pl-9 pr-8`}
              placeholder="Enrollment no. or name"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
            />
            {loading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
            ) : (
              term && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
          // Typing stays in the input; clicks on the input don't close the list.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (boxRef.current?.contains(event.target as Node))
              event.preventDefault();
          }}
        >
          <ul
            id="collectSearchList"
            role="listbox"
            className="max-h-72 overflow-y-auto p-1"
          >
            {error ? (
              <li className="px-3 py-2 text-sm text-red-600">{error}</li>
            ) : loading && results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">Searching...</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">
                No student found in {session}.
              </li>
            ) : (
              results.map((student, index) => (
                <li
                  key={student.studentId}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => {
                    // Picks before the input loses focus.
                    event.preventDefault();
                    pick(student);
                  }}
                  className={`cursor-pointer rounded px-3 py-2 ${index === active ? "bg-indigo-50" : ""}`}
                >
                  <p className="text-sm font-semibold text-gray-800">
                    {student.studentName}
                    {student.enrollment && (
                      <span className="ml-1 font-normal text-gray-500">
                        ({student.enrollment})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {toOrdinalLabel(student.className)}-{student.section}
                    {student.fatherName && ` · ${student.fatherName}`}
                  </p>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </div>
    </Popover>
  );
}

export default StudentSearch;
