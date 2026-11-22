/**
 * Dashboard card: teachers and staff (total, active, male / female bar) and
 * who is on leave today, with links - laid out like the TC and Students cards.
 * No session-wise data. Counts only (getCountFromServer, usePeopleStats):
 * 12 counts. Admins only (staffAttendance is read by admins).
 */
import { useContext, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { STAFF_ATTENDANCE_PATH, TEACHERS_PATH } from "../../../constants";
import { Spinner } from "../../../custom-components/Loader";
import Tooltip from "../../../custom-components/Tooltip";
import { usePeopleStats } from "../../../hooks/useDashboardStats";
import type { PeopleCounts } from "../../../utils/dashboardStats";
import { todayKey } from "../../../utils/holidayCalendar";
import { myContext } from "../../context/MyContextProvider";

// cves colours, as on the Students card: indigo for male, pink for female.
const MALE = "#393186";
const FEMALE = "#e7087e";

function GenderBar({ counts, loading }: { counts: PeopleCounts; loading: boolean }) {
  const total = Math.max(1, counts.male + counts.female);
  return (
    <Tooltip content={`${counts.male} male, ${counts.female} female`} side="top" className="w-full">
      <span className="mt-2 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-[#f2dfe8]" role="img" aria-label={`${counts.male} male, ${counts.female} female`}>
        {!loading && counts.male > 0 && (
          <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${(counts.male / total) * 100}%`, background: MALE }} />
        )}
        {!loading && counts.female > 0 && (
          <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${(counts.female / total) * 100}%`, background: FEMALE }} />
        )}
      </span>
    </Tooltip>
  );
}

/** One group (Teachers or Staff): total, active, male / female. */
function Group({ label, counts, loading }: { label: string; counts: PeopleCounts; loading: boolean }) {
  const small = (value: number) => (loading ? <Spinner size="xs" label="" /> : value);
  return (
    <div className="min-w-0">
      <p className="text-sm text-gray-600">{label}</p>
      <div className="flex h-11 items-center text-4xl font-extrabold leading-tight tracking-tight text-gray-900 tabular-nums">
        {loading ? <Spinner size="md" label={`Loading ${label.toLowerCase()}`} /> : counts.total}
      </div>
      <p className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900 tabular-nums">{small(counts.active)}</span> active
      </p>
      <GenderBar counts={counts} loading={loading} />
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: MALE }} />
          {small(counts.male)} Male
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: FEMALE }} />
          {small(counts.female)} Female
        </span>
      </p>
    </div>
  );
}

function PeopleCard({ className }: { className: string }) {
  const today = useMemo(() => todayKey(), []);
  const { stats, loading, error } = usePeopleStats(today);
  const leaveRows = [
    { label: "Teachers", counts: stats.teachers },
    { label: "Staff", counts: stats.staff },
  ];

  return (
    <section
      className={`flex flex-col rounded-3xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(17,24,39,0.22)] md:p-7 ${className}`}
    >
      <h3 className="text-lg font-bold text-gray-900">Teachers &amp; Staff</h3>

      {error ? (
        <p className="mt-4 text-base font-semibold text-red-600">{error}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-6">
          <Group label="Teachers" counts={stats.teachers} loading={loading} />
          <Group label="Staff" counts={stats.staff} loading={loading} />
        </div>
      )}

      <div className="mt-auto grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
        {/* On leave today (full day, half day). */}
        <div className="rounded-xl bg-[#f7e8ee] px-4 py-2.5">
          <p className="mb-1 text-sm text-gray-600">On leave today</p>
          <div className="flex flex-col gap-0.5">
            {leaveRows.map(({ label, counts }) => (
              <div key={label} className="flex items-center justify-between gap-2 py-0.5 text-xs text-gray-700">
                <span>{label}</span>
                <span className="font-bold tabular-nums text-[#ad1a6f]">
                  {loading ? "" : counts.onLeave}
                  {!loading && counts.halfDayLeave > 0 && (
                    <span className="ml-1 font-normal text-gray-500">+ {counts.halfDayLeave} half day</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Links, as on the TC and Students cards. */}
        <div className="flex flex-col justify-center divide-y divide-[#f3cfd6] rounded-xl bg-[#fce7e7] px-4 py-1">
          {[
            { to: TEACHERS_PATH, label: "Open Teachers & Staff" },
            { to: STAFF_ATTENDANCE_PATH, label: "Staff Attendance" },
          ].map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className="group flex items-center justify-between gap-2 py-1.5 text-sm font-semibold text-gray-800 transition hover:text-[#ad1a6f]"
            >
              {link.label}
              <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
            </NavLink>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Dashboard card for admins (nothing is read otherwise). */
function PeopleDashboardCard({ className = "" }: { className?: string }) {
  const { user } = useContext(myContext);
  return user?.scope?.kind === "all" ? <PeopleCard className={className} /> : null;
}

export default PeopleDashboardCard;
