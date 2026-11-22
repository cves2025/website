/**
 * Dashboard card: students of the current session (male / female ring) and
 * the new admissions of the last ADMISSION_DASHBOARD_SESSIONS sessions as
 * horizontal bars (cves colours), with links - laid out like the TC card.
 * Counts only (getCountFromServer), never the enrollments.
 * Shown to admins and to teachers with student.read.
 */
import { useContext, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import {
  ADD_STUDENT_PATH,
  ADMISSION_DASHBOARD_SESSIONS,
  STUDENT_LIST_PATH,
} from "../../../constants";
import { Spinner } from "../../../custom-components/Loader";
import Tooltip from "../../../custom-components/Tooltip";
import { useAdmissionStats } from "../../../hooks/useDashboardStats";
import { PERMISSIONS } from "../../../permissions";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import type { StudentCounts } from "../../../utils/dashboardStats";
import { myContext } from "../../context/MyContextProvider";

// cves colours: indigo for male, pink for female.
const MALE = "#393186";
const FEMALE = "#e7087e";
const TRACK = "#e8ecf7";

/** Ring split male / female (others = the rest of the track), total in the middle. */
function GenderRing({ counts, loading }: { counts: StudentCounts; loading: boolean }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const total = counts.students;
  let offset = 0;

  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label="Students by gender">
        <circle cx="50" cy="50" r={radius} fill="none" stroke={TRACK} strokeWidth="14" />
        {!loading &&
          total > 0 &&
          [
            { value: counts.male, color: MALE },
            { value: counts.female, color: FEMALE },
          ].map((part) => {
            const length = (part.value / total) * circumference;
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
        <Spinner size="sm" label="Loading student counts" />
      ) : (
        <span className="relative text-center text-[17px] font-semibold leading-tight text-gray-800 tabular-nums">
          {total}
          <span className="block text-[11px] font-normal text-gray-500">in all</span>
        </span>
      )}
    </div>
  );
}

function AdmissionCard({ className }: { className: string }) {
  // Newest first: the current session leads.
  const sessions = useMemo(
    () => generateAcademicYears().slice(0, ADMISSION_DASHBOARD_SESSIONS).map((item) => item.value),
    []
  );
  const { stats, loading, error } = useAdmissionStats(sessions);
  const { current, newAdmissions } = stats;
  const most = Math.max(1, ...sessions.map((item) => newAdmissions[item] ?? 0));
  const small = (value: number) => (loading ? <Spinner size="xs" label="" /> : value);

  return (
    <section
      className={`flex flex-col rounded-3xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(17,24,39,0.22)] md:p-7 ${className}`}
    >
      <h3 className="text-lg font-bold text-gray-900">Students</h3>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <GenderRing counts={current} loading={loading} />
        <div className="min-w-0 text-center sm:text-left">
          <div className="flex h-11 items-center justify-center text-4xl font-extrabold leading-tight tracking-tight text-gray-900 tabular-nums sm:justify-start">
            {loading ? (
              <Spinner size="md" label="Loading student counts" />
            ) : error ? (
              <span className="text-base font-semibold text-red-600">{error}</span>
            ) : (
              current.students
            )}
          </div>
          <p className="flex min-h-5 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-gray-600 sm:justify-start">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: MALE }} />
              {small(current.male)} Male
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: FEMALE }} />
              {small(current.female)} Female
            </span>
          </p>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
        {/* New admissions session-wise (horizontal bars, cves colours), oldest on top. */}
        <div className="rounded-xl bg-[#f7e8ee] px-4 py-2.5">
          <p className="mb-1 text-sm text-gray-600 font-bold">New admissions</p>
          <div className="flex flex-col gap-0.5" role="list">
            {[...sessions].reverse().map((item) => {
              const value = newAdmissions[item] ?? 0;
              const latest = item === sessions[0];
              return (
                <Tooltip key={item} content={`${item}: ${value} new admissions`} className="block">
                  <div
                    role="listitem"
                    className={`grid grid-cols-[3.75rem_minmax(0,1fr)_2rem] items-center gap-2 py-0.5 text-xs ${
                      latest ? "font-bold text-navy" : "text-gray-700"
                    }`}
                  >
                    <span className="tabular-nums">{item}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-white/80">
                      <span
                        className={`block h-full rounded-full transition-[width] duration-500 ${
                          latest ? "bg-cves" : "bg-primaryGreen/50"
                        }`}
                        style={{ width: loading ? 0 : `${(value / most) * 100}%` }}
                      />
                    </span>
                    <span className="text-right tabular-nums">{loading ? "" : value}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Links, as on the TC and Fee Collection cards. */}
        <div className="flex flex-col justify-center divide-y divide-[#f3cfd6] rounded-xl bg-[#fce7e7] px-4 py-1">
          {[
            { to: STUDENT_LIST_PATH, label: "Student List" },
            { to: ADD_STUDENT_PATH, label: "Add Student" },
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

/** Dashboard card for users who may see students (nothing is read otherwise). */
function AdmissionDashboardCard({ className = "" }: { className?: string }) {
  const { user, can } = useContext(myContext);
  const allowed = user?.scope?.kind === "all" || can(PERMISSIONS.STUDENT_READ);
  return allowed ? <AdmissionCard className={className} /> : null;
}

export default AdmissionDashboardCard;
