import { useContext, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { startOfMonth, startOfWeek, subDays } from "date-fns";

import { useForm } from "react-hook-form";
import CustomSelect from "../../../custom-components/CustomSelect";
import {
  FEE_DUES_REPORT_PATH,
  FEE_PERIOD_OPTIONS,
  type FeePeriod,
} from "../../../constants";

import { myContext } from "../../context/MyContextProvider";
import { PERMISSIONS } from "../../../permissions";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toDateKey } from "../../../utils/holidayCalendar";
import { formatRupees } from "../../../utils/feeStructure";
import { feeTargetOfMonth } from "../../../utils/feeTarget";
import {
  useCollectionTotal,
  useTransportPerMonth,
} from "../../../hooks/useDashboardStats";
import useFeeStructure from "../../../hooks/useFeeStructure";
import { useAllClassesLengthOfStudents } from "../../../hooks/useAllClassesLengthOfStudents";
import { Spinner } from "../../../custom-components/Loader";

const session = generateAcademicYears()[0]?.value ?? "";

/** Ring showing how much of the target is collected. */
function ProgressRing({
  percent,
  loading = false,
}: {
  percent: number | null;
  loading?: boolean;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled =
    percent === null || loading
      ? 0
      : (Math.min(percent, 100) / 100) * circumference;
  if (loading) {
    // The empty ring with a spinner in the middle while the numbers load.
    return (
      <div className="relative grid h-32 w-32 shrink-0 place-items-center">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#f2dfe8"
            strokeWidth="14"
          />
        </svg>
        <Spinner size="sm" label="Loading collection" />
      </div>
    );
  }
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-32 w-32 shrink-0"
      role="img"
      aria-label="Collected of target"
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#f2dfe8"
        strokeWidth="14"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#ad1a6f"
        strokeWidth="14"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="17"
        fontWeight="600"
        fill="#1f2937"
      >
        {percent === null ? "—" : `${percent}%`}
      </text>
    </svg>
  );
}

/** First and last day ("yyyy-MM-dd") of each period, as of today. */
function periodRanges(
  now: Date,
): Record<FeePeriod, { from: string; to: string }> {
  const today = toDateKey(now);
  const yesterday = toDateKey(subDays(now, 1));
  return {
    today: { from: today, to: today },
    yesterday: { from: yesterday, to: yesterday },
    week: { from: toDateKey(startOfWeek(now, { weekStartsOn: 1 })), to: today },
    month: { from: toDateKey(startOfMonth(now)), to: today },
  };
}

/**
 * The chosen period's collection (today by default; aggregation: sum + count
 * of the receipts), and in the ring how much of this month's target - worked
 * out from the fee structure and the student counts - is collected so far.
 */
function FeeSummary({ className }: { className: string }) {
  // The period dropdown (Today by default, also after a reload).
  const { control, watch } = useForm<{ period: FeePeriod }>({ defaultValues: { period: "today" } });
  const period = watch("period");
  const ranges = useMemo(() => periodRanges(new Date()), []);
  const range = ranges[period];
  const collected = useCollectionTotal(range.from, range.to);
  // The ring always shows this month; the same number when the period is the month.
  const monthCollected = useCollectionTotal(ranges.month.from, ranges.month.to, period !== "month");
  const monthTotal = period === "month" ? collected : monthCollected;

  // Inputs of the target, read once: structure, settings, student counts
  // (count aggregation per class) and transport (sum aggregation).
  const { structure, loading: structureLoading } = useFeeStructure(session);
  const { classes, loading: countsLoading } = useAllClassesLengthOfStudents({
    academicYear: session,
  });
  const { transportMonthly, loading: transportLoading } =
    useTransportPerMonth(session);
  const targetLoading =
    structureLoading || countsLoading || transportLoading;

  const target = useMemo(() => {
    if (targetLoading) return null;
    const studentsByClass = Object.fromEntries(
      classes.map((item) => [item.className, item.totalStudents]),
    );
    return feeTargetOfMonth(
      { structure, studentsByClass, transportMonthly },
      new Date().getMonth() + 1,
    );
  }, [targetLoading, classes, structure, transportMonthly]);

  const percent = target ? Math.round((monthTotal.total / target) * 100) : null;
  const periodLabel =
    FEE_PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "";

  return (
    <section
      className={`flex flex-col rounded-3xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(17,24,39,0.22)] md:p-7 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">Fee Collection</h3>
        <div className="w-36">
          <CustomSelect
            control={control}
            name="period"
            placeholder={null}
            options={[...FEE_PERIOD_OPTIONS]}
            className="py-1.5"
          />
        </div>
      </div>

      {/* Always laid out; each number shows a spinner until it arrives. */}
      <>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
          <ProgressRing
            percent={percent}
            loading={monthTotal.loading || target === null}
          />
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-sm text-gray-600">
              Collected {periodLabel.toLowerCase()}
            </p>
            <div className="flex h-11 items-center justify-center text-4xl font-extrabold leading-tight tracking-tight text-gray-900 tabular-nums sm:justify-start">
              {collected.loading ? (
                <Spinner size="md" label="Loading collection" />
              ) : collected.error ? (
                <span className="text-base font-semibold text-red-600">
                  {collected.error}
                </span>
              ) : (
                formatRupees(collected.total)
              )}
            </div>
            <p className="flex min-h-5 items-center justify-center gap-2 text-sm text-gray-600 sm:justify-start">
              {target === null ? (
                <>
                  Target <Spinner size="xs" label="Loading target" />
                </>
              ) : target === 0 ? (
                "No monthly target: add the fees on the Fee Structure page"
              ) : (
                // This month: collected so far of what the month should bring in.
                `${formatRupees(monthTotal.total)} of ${formatRupees(target)} this month`
              )}
            </p>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
          <div className="rounded-xl bg-[#f7e8ee] px-4 py-2.5">
            <div className="flex h-8 items-center text-2xl font-bold text-gray-900 tabular-nums">
              {collected.loading ? (
                <Spinner size="sm" label="" />
              ) : (
                collected.receipts
              )}
            </div>
            <p className="text-sm text-gray-600">
              Receipts {periodLabel.toLowerCase()}
            </p>
          </div>
          <NavLink
            to={FEE_DUES_REPORT_PATH}
            className="group flex items-center justify-between gap-2 rounded-xl bg-[#fce7e7] px-4 py-2.5 transition hover:bg-[#f9dada]"
          >
            <span>
              <span className="block text-2xl font-bold text-gray-900">
                Dues
              </span>
              <span className="block text-sm text-gray-600">
                Open the Dues Report
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-gray-700 transition group-hover:translate-x-0.5" />
          </NavLink>
        </div>
      </>
    </section>
  );
}

/** Dashboard card, only for users who manage fees (nothing is read otherwise). */
function FeeTodayCard({ className = "" }: { className?: string }) {
  const { can } = useContext(myContext);
  return can(PERMISSIONS.FEE_MANAGE) ? (
    <FeeSummary className={className} />
  ) : null;
}

export default FeeTodayCard;
