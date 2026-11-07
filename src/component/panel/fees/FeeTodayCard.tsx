import { useContext, useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight, IndianRupee, X } from "lucide-react";
import { startOfMonth, startOfWeek, subDays } from "date-fns";

import { useForm } from "react-hook-form";
import CustomSelect from "../../../custom-components/CustomSelect";
import {
  FEE_COLLECTION_REPORT_PATH,
  FEE_DUES_REPORT_PATH,
  FEE_PANEL_MS,
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
function FeeSummary({
  className,
  onClose,
}: {
  className: string;
  onClose?: () => void;
}) {
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
        <h3 className="mr-auto text-lg font-bold text-gray-900">Fee Collection</h3>
        <div className="w-36">
          <CustomSelect
            control={control}
            name="period"
            placeholder={null}
            options={[...FEE_PERIOD_OPTIONS]}
            className="py-1.5"
          />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close fee collection"
            className="-mr-2 ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        )}
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
          {/* One card with both report links. */}
          <div className="flex flex-col justify-center divide-y divide-[#f3cfd6] rounded-xl bg-[#fce7e7] px-4 py-1">
            {[
              { to: FEE_DUES_REPORT_PATH, label: "View Dues Report" },
              { to: FEE_COLLECTION_REPORT_PATH, label: "View Collection Report" },
            ].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="group flex items-center justify-between gap-2 py-1.5 text-sm font-semibold text-gray-800 transition hover:text-[#ad1a6f]"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
              </NavLink>
            ))}
          </div>
        </div>
      </>
    </section>
  );
}

/**
 * Dashboard: a fee icon stuck to the right edge of the screen, so the
 * collection is not on view for anyone looking at the screen. Clicking it
 * slides the card in; the cross (or Esc) hides it again. Only for users who
 * manage fees, and nothing is read until the card is opened.
 */
function FeeTodayCard() {
  const { can } = useContext(myContext);
  // `mounted`: the card is in the page (its data is read only then);
  // `shown`: it has grown out of the icon. Closing shrinks it back into the
  // icon first and removes it once the animation is over.
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  const open = () => setMounted(true);
  const close = () => setShown(false);

  useEffect(() => {
    if (mounted && !shown) {
      // Opening: one frame at the icon's size, then grow.
      const frame = requestAnimationFrame(() =>
        requestAnimationFrame(() => setShown(true)),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted || shown) return;
    // Closing: remove the card after it has shrunk back.
    const timer = window.setTimeout(() => setMounted(false), FEE_PANEL_MS);
    return () => window.clearTimeout(timer);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shown) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown]);

  if (!can(PERMISSIONS.FEE_MANAGE)) return null;

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Show fee collection"
        title="Fee collection"
        tabIndex={mounted ? -1 : 0}
        className={`fixed right-0 top-1/2 z-30 grid h-12 w-11 -translate-y-1/2 place-items-center rounded-l-xl bg-cves text-white shadow-lg transition-all duration-300 hover:w-14 hover:brightness-110 print:hidden ${
          mounted ? "pointer-events-none scale-75 opacity-0" : "opacity-100"
        }`}
      >
        <IndianRupee className="h-5 w-5" strokeWidth={2.5} />
      </button>
      {mounted && (
        // A click anywhere outside the card hides it. (A click that only
        // closes the period dropdown does not reach it.)
        <div
          aria-hidden
          onClick={close}
          style={{ transitionDuration: `${FEE_PANEL_MS}ms` }}
          className={`fixed inset-0 z-40 bg-black/20 transition-opacity print:hidden ${
            shown ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      )}
      {mounted && (
        // Grows out of the icon (right edge, middle) and shrinks back into it.
        <div
          // The space around the card counts as outside too.
          onClick={(event) => event.target === event.currentTarget && close()}
          style={{ transitionDuration: `${FEE_PANEL_MS}ms` }}
          className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-md origin-right items-center p-3 transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] print:hidden ${
            shown
              ? "translate-x-0 scale-100 opacity-100"
              : "pointer-events-none translate-x-[40%] scale-[0.15] opacity-0"
          }`}
        >
          <FeeSummary
            className="max-h-full w-full overflow-y-auto shadow-[0_20px_60px_-12px_rgba(17,24,39,0.45)]"
            onClose={close}
          />
        </div>
      )}
    </>
  );
}

export default FeeTodayCard;
