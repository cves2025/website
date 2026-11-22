import { useContext, useEffect, useState } from "react";
import { format } from "date-fns";
import { CloudSun, Moon, Sun } from "lucide-react";

import { myContext } from "../context/MyContextProvider";
import { DASHBOARD_CLOCK_MS, DASHBOARD_GRADIENT } from "../../constants";
import AttendanceTodayCard from "../panel/attendance/AttendanceTodayCard";
import MarksPendingCard from "../panel/marks/MarksPendingCard";
import FeeTodayCard from "../panel/fees/FeeTodayCard";
import TcDashboardCard from "../panel/students/tc/TcDashboardCard";
import AdmissionDashboardCard from "../panel/students/AdmissionDashboardCard";
import PeopleDashboardCard from "../panel/teacher/PeopleDashboardCard";

/** Greeting and its icon by the hour: morning (sun), afternoon (sun + cloud), evening (moon). */
const timeOfDay = (hour: number) =>
  hour < 12
    ? { text: "Good morning", Icon: Sun }
    : hour < 17
      ? { text: "Good afternoon", Icon: CloudSun }
      : { text: "Good evening", Icon: Moon };

/** The time now, refreshed every DASHBOARD_CLOCK_MS (the greeting and its icon follow it). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), DASHBOARD_CLOCK_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * Panel home: a full-width greeting banner (drifting light blobs, the time of
 * day icon) with the cards over it. The cards rise in one by one
 * and lift on hover (`dash-grid` in index.css); their numbers count up. The
 * fee collection stays hidden behind an icon on the right edge until opened.
 * Each card is shown (and read) only for users allowed to use it.
 */
function Dashboard() {
  const { user } = useContext(myContext);
  const now = useNow();
  const name = user?.fullName?.trim() || (user?.role === "admin" ? "Admin" : "there");
  const { text, Icon } = timeOfDay(now.getHours());

  return (
    // Full width: cancels <main>'s padding so the banner runs edge to edge.
    <div className="-m-4 min-h-[calc(100%+2rem)] bg-white md:-m-2 md:min-h-[calc(100%+1rem)]">
      <div className="bg-[#f8f1f5] pb-10">
        {/* Greeting banner */}
        {/* Continues the top bar above it (same gradient), which shows the school name.
            The blobs stay low, so the seam with the top bar stays clean. */}
        <div className={`${DASHBOARD_GRADIENT} relative overflow-hidden px-6 pb-28 pt-0 text-white md:px-12`}>
          <span aria-hidden="true" className="dash-blob -right-16 top-20 h-56 w-56 bg-white/20" />
          <span
            aria-hidden="true"
            className="dash-blob bottom-0 left-1/3 h-44 w-72 bg-[#e7087e]/30 [animation-delay:-7s]"
          />

          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="dash-float grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                <Icon className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
                  {text}, {name}
                </h1>
                <p className="mt-0.5 text-base leading-snug text-white/90 md:text-lg">{format(now, "EEEE, d MMMM yyyy")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards over the banner, all the same height; they rise in and lift on hover. */}
        <div className="dash-grid -mt-20 grid grid-cols-1 items-stretch gap-6 px-6 md:px-12 lg:grid-cols-2 xl:grid-cols-3">
          <AttendanceTodayCard />
          <MarksPendingCard />
          <TcDashboardCard />
          <AdmissionDashboardCard />
          <PeopleDashboardCard />
          <FeeTodayCard />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
