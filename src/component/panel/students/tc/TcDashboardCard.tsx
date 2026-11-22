/**
 * Dashboard card: Transfer Certificates of a session (issued, cancelled,
 * drafts still to issue) and the issued ones of the last sessions as bars.
 * Same look as the Fee Collection card (magenta ring, pink tiles).
 * Only counts are read (getCountFromServer), never the TC documents.
 * Shown to admins and to teachers with tc.view / tc.issue.
 */
import { useContext, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { ArrowRight } from "lucide-react";

import { TC_DASHBOARD_SESSIONS, TC_PATH, TC_REGISTER_CLASS } from "../../../../constants";
import CustomSelect from "../../../../custom-components/CustomSelect";
import CountUp from "../../../../custom-components/CountUp";
import { Spinner } from "../../../../custom-components/Loader";
import { useCountUp } from "../../../../hooks/useCountUp";
import { useTcCounts } from "../../../../hooks/useDashboardStats";
import { PERMISSIONS } from "../../../../permissions";
import { generateAcademicYears } from "../../../../utils/generateAcademicYears";
import type { TcCounts } from "../../../../utils/dashboardStats";
import { myContext } from "../../../context/MyContextProvider";

// Colours of the Fee Collection card.
const RING = "#ad1a6f";
const TRACK = "#f2dfe8";
const CANCELLED = "#e31e25";
const DRAFT = "#e9a8c6";

/** Ring split by status (issued / cancelled / draft) with the issued count in the middle. */
function StatusRing({ counts, loading }: { counts: TcCounts; loading: boolean }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const total = counts.issued + counts.cancelled + counts.draft;
  const parts = [
    { value: counts.issued, color: RING },
    { value: counts.cancelled, color: CANCELLED },
    { value: counts.draft, color: DRAFT },
  ];
  // Fills from empty together with the numbers.
  const filled = useCountUp(loading ? 0 : 1);
  let offset = 0;

  return (
    <div className="relative grid h-32 w-32 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label="TCs by status">
        <circle cx="50" cy="50" r={radius} fill="none" stroke={TRACK} strokeWidth="14" />
        {!loading &&
          total > 0 &&
          parts.map((part) => {
            const length = (part.value / total) * circumference * filled;
            const arc = (
              <circle
                key={part.color}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={part.color}
                strokeWidth="14"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
              />
            );
            offset += length;
            return part.value > 0 ? arc : null;
          })}
      </svg>
      {loading ? (
        <Spinner size="sm" label="Loading TC counts" />
      ) : (
        <span className="relative text-center text-[17px] font-semibold leading-tight text-gray-800">
          <CountUp value={total} />
          <span className="block text-[11px] font-normal text-gray-500">in all</span>
        </span>
      )}
    </div>
  );
}

function TcCard({ className }: { className: string }) {
  // Newest first: the current session leads.
  const sessions = useMemo(
    () => generateAcademicYears().slice(0, TC_DASHBOARD_SESSIONS).map((item) => item.value),
    []
  );
  const { control, setValue } = useForm<{ session: string }>({ defaultValues: { session: sessions[0] ?? "" } });
  const session = useWatch({ control, name: "session" });
  const { counts, loading, error } = useTcCounts(sessions);

  const current = counts[session] ?? { issued: 0, cancelled: 0, draft: 0 };
  const most = Math.max(1, ...sessions.map((item) => counts[item]?.issued ?? 0));
  const small = (value: number) => (loading ? <Spinner size="xs" label="" /> : <CountUp value={value} />);

  return (
    <section
      className={`flex flex-col rounded-3xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(17,24,39,0.22)] md:p-7 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="mr-auto text-lg font-bold text-gray-900">Transfer Certificates</h3>
        <div className="w-36">
          <CustomSelect
            control={control}
            name="session"
            placeholder={null}
            options={sessions.map((value) => ({ value, label: value }))}
            className="py-1.5"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <StatusRing counts={current} loading={loading} />
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-sm text-gray-600">Issued in {session}</p>
          <div className="flex h-11 items-center justify-center text-4xl font-extrabold leading-tight tracking-tight text-gray-900 tabular-nums sm:justify-start">
            {loading ? (
              <Spinner size="md" label="Loading TC counts" />
            ) : error ? (
              <span className="text-base font-semibold text-red-600">{error}</span>
            ) : (
              <CountUp value={current.issued} />
            )}
          </div>
          <p className="flex min-h-5 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-gray-600 sm:justify-start">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CANCELLED }} />
              {small(current.cancelled)} cancelled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: DRAFT }} />
              {small(current.draft)} {current.draft === 1 ? "draft" : "drafts"} to issue
            </span>
          </p>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
        {/* Session-wise issued TCs; a row picks its session. */}
        <div className="rounded-xl bg-[#f7e8ee] px-4 py-2.5">
          <p className="mb-1 text-sm text-gray-600">Issued session-wise</p>
          <div className="flex flex-col gap-0.5">
            {sessions.map((item) => {
              const issued = counts[item]?.issued ?? 0;
              const selected = item === session;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setValue("session", item)}
                  className={`grid grid-cols-[3.75rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-md py-0.5 text-left text-xs transition hover:text-[#ad1a6f] ${
                    selected ? "font-bold text-[#ad1a6f]" : "text-gray-700"
                  }`}
                >
                  <span className="tabular-nums">{item}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/80">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: loading ? 0 : `${(issued / most) * 100}%`, background: selected ? RING : DRAFT }}
                    />
                  </span>
                  <span className="text-right tabular-nums">{loading ? "" : issued}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Links, as on the Fee Collection card. */}
        <div className="flex flex-col justify-center divide-y divide-[#f3cfd6] rounded-xl bg-[#fce7e7] px-4 py-1">
          {[
            { to: `${TC_PATH}?${new URLSearchParams({ session, class: TC_REGISTER_CLASS })}`, label: "Open TC Register" },
            { to: TC_PATH, label: "Open TC Page" },
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

/** Dashboard card for users who may see TCs (nothing is read otherwise). */
function TcDashboardCard({ className = "" }: { className?: string }) {
  const { user, can } = useContext(myContext);
  const allowed = user?.scope?.kind === "all" || can(PERMISSIONS.TC_VIEW) || can(PERMISSIONS.TC_ISSUE);
  return allowed ? <TcCard className={className} /> : null;
}

export default TcDashboardCard;
