import { useContext } from "react";
import { format } from "date-fns";

import { myContext } from "../context/MyContextProvider";
import { DASHBOARD_GRADIENT } from "../../constants";
import AttendanceTodayCard from "../panel/attendance/AttendanceTodayCard";
import FeeTodayCard from "../panel/fees/FeeTodayCard";

const greeting = (hour: number) =>
  hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

/**
 * Panel home: a full-width greeting banner with today's attendance and the
 * fee collection on top of it. Each card is shown (and read) only for users
 * allowed to use it.
 */
function Dashboard() {
  const { user } = useContext(myContext);
  const now = new Date();
  const name = user?.fullName?.trim() || (user?.role === "admin" ? "Admin" : "there");

  return (
    // Full width: cancels <main>'s padding so the banner runs edge to edge.
    <div className="-m-4 min-h-[calc(100%+2rem)] bg-white md:-m-2 md:min-h-[calc(100%+1rem)]">
      <div className="bg-[#f8f1f5] pb-10">
        {/* Greeting banner */}
        {/* Continues the top bar above it (same gradient), which shows the school name. */}
        <div className={`${DASHBOARD_GRADIENT} px-6 pb-28 pt-0 text-white md:px-12`}>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {greeting(now.getHours())}, {name}
          </h1>
          <p className="mt-0.5 text-base leading-snug text-white/90 md:text-lg">{format(now, "EEEE, d MMMM yyyy")}</p>
        </div>

        {/* Cards over the banner, all the same height */}
        <div className="-mt-20 grid grid-cols-1 items-stretch gap-6 px-6 md:px-12 xl:grid-cols-2">
          <AttendanceTodayCard />
          <FeeTodayCard />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
