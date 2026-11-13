import { useEffect, useState, useContext } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./panel/Sidebar";
import { myContext } from "./context/MyContextProvider";
import Loader from "../custom-components/Loader";
import { BsList } from "react-icons/bs";
import { FaGlobe } from "react-icons/fa";
import WhatsNewModal from "../features/whats-new/WhatsNewModal";
import { useWhatsNew } from "../features/whats-new/useWhatsNew";
import { IndianRupee, Lock } from "lucide-react";
import { DASHBOARD_GRADIENT, FEE_COLLECT_PATH, IDLE_LOCKED_KEY } from "../constants";
import { useIdleLock } from "../hooks/useIdleLock";
import IdleLockScreen from "./IdleLockScreen";
import Tooltip from "../custom-components/Tooltip";
import { PERMISSIONS } from "../permissions";

function Welcome() {
  const { user, authReady, can, logout } = useContext(myContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const whatsNew = useWhatsNew();
  // Admins: the panel locks after 5 minutes without activity (header timer).
  const idle = useIdleLock(user?.uid ?? null, user?.role === "admin");
  const minutes = Math.floor(idle.remainingMs / 60000);
  const seconds = Math.floor((idle.remainingMs % 60000) / 1000);
  const logOutFromLock = async () => {
    try {
      window.localStorage.removeItem(IDLE_LOCKED_KEY);
    } catch {
      // ignore
    }
    await logout();
    navigate("/login", { replace: true });
  };
  const onDashboard = location.pathname.replace(/\/+$/, "") === "/welcome";

  // Only redirect once Firebase has restored the session, and remember where
  // the user was so they land back on the same page after logging in.
  useEffect(() => {
    if (authReady && !user) {
      const from = `${location.pathname}${location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(from)}`, { replace: true });
    }
  }, [authReady, user, location.pathname, location.search, navigate]);

  if (!authReady) {
    return <Loader label="Checking your session..." />;
  }

  if (!user) {
    return <Loader label="Redirecting to login..." />;
  }

  return (
    // -m-0.5 cancels the m-0.5 wrapper in App.tsx; without it the panel is
    // 100vh + 4px tall and the whole page scrolls by a few pixels.
    <div className="-m-0.5 flex h-screen overflow-hidden bg-gray-100 print:m-0 print:block print:h-auto print:overflow-visible print:bg-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar. On the dashboard it is part of the greeting banner: the
            same gradient (DASHBOARD_GRADIENT) with white text. */}
        <header
          className={`sticky top-0 z-20 flex items-center gap-3 px-4 print:hidden ${
            onDashboard ? `${DASHBOARD_GRADIENT} pb-0 pt-3 text-white md:px-12` : "bg-white py-3 shadow-sm"
          }`}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className={`md:hidden ${onDashboard ? "text-white/90 hover:text-white" : "text-gray-700 hover:text-gray-900"}`}
            aria-label="Open menu"
          >
            <BsList className="w-7 h-7" />
          </button>
          {/* Everyone (admin and teacher) sees the school name, styled like the
              AddStudent / result card letterhead. On the dashboard the
              coloured name sits on a white box, so it stays readable on the
              gradient. */}
          <h1
              className={`min-w-0 truncate font-bold text-gray-800 ${
                onDashboard
                  ? "rounded-md bg-white px-2 py-0.5 text-xs shadow-sm md:text-sm"
                  : "text-base md:text-xl"
              }`}
            >
              <span className="font-cancun font-extrabold tracking-tight">
                <span className="text-green-700">CHILDREN&apos;S </span>
                <span className="text-indigo-800">VALLEY </span>
                <span className="text-red-600">ENGLISH </span>
                <span className="text-pink-600">SCHOOL</span>
              </span>
            </h1>
          {can(PERMISSIONS.FEE_MANAGE) && (
            // Collect Fee from any page, with the cursor in the student search.
            // On that page already, the picked student stays.
            <Tooltip content="Collect Fee" className="ml-auto shrink-0">
            <button
              type="button"
              aria-label="Collect Fee"
              onClick={() =>
                navigate(
                  {
                    pathname: FEE_COLLECT_PATH,
                    search: location.pathname === FEE_COLLECT_PATH ? location.search : "",
                  },
                  { state: { focusSearch: Date.now() } }
                )
              }
              className={`grid shrink-0 place-items-center rounded-full text-white shadow-sm transition-colors ${
                onDashboard
                  ? "h-7 w-7 bg-white/15 ring-1 ring-inset ring-white/40 hover:bg-white/25"
                  : "h-9 w-9 bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <IndianRupee className="h-4 w-4" strokeWidth={2.5} />
            </button>
            </Tooltip>
          )}
          {user.role === "admin" && (
            // Time left before the idle lock; click to lock now.
            <Tooltip
              content={
                <>
                  <b className="block">Screen lock in {minutes}:{String(seconds).padStart(2, "0")}</b>
                  Locks after 5 minutes without activity. Click to lock now.
                </>
              }
              className={`${can(PERMISSIONS.FEE_MANAGE) ? "" : "ml-auto "}shrink-0`}
            >
            <button
              type="button"
              onClick={idle.lock}
              aria-label={`Screen locks in ${minutes} minutes ${seconds} seconds. Lock now.`}
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-bold tabular-nums shadow-sm transition-colors ${
                idle.remainingMs <= 60000
                  ? "bg-amber-400 text-gray-900 hover:bg-amber-300"
                  : onDashboard
                    ? "bg-white/15 text-white ring-1 ring-inset ring-white/40 hover:bg-white/25"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${onDashboard ? "py-1" : "py-2"}`}
            >
              <Lock className="h-3.5 w-3.5" />
              {minutes}:{String(seconds).padStart(2, "0")}
            </button>
            </Tooltip>
          )}
          {/* Go to Website: for everyone. */}
          <Tooltip
            content="Open the school website"
            className={`${can(PERMISSIONS.FEE_MANAGE) || user.role === "admin" ? "" : "ml-auto "}shrink-0`}
          >
          <Link
              to="/"
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 text-sm font-bold text-white shadow-sm transition-colors sm:px-4 ${
                onDashboard
                  ? "bg-white/15 py-1 ring-1 ring-inset ring-white/40 hover:bg-white/25"
                  : "bg-blue-600 py-2 hover:bg-blue-700"
              }`}
            >
              <FaGlobe className="h-4 w-4" />
              {/* Icon only on small phones, so the school name keeps its room. */}
              <span className="hidden sm:inline">Go to Website</span>
            </Link>
          </Tooltip>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-2 overflow-y-auto print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>

      {/* Globally mounted release announcement (once per user per release). */}
      <WhatsNewModal open={whatsNew.open} onClose={whatsNew.onClose} />

      {/* Idle lock: blocks the panel until the password is entered again. */}
      {idle.locked && (
        <IdleLockScreen
          email={user.email ?? ""}
          name={user.fullName ?? ""}
          onUnlock={idle.unlock}
          onLogout={() => void logOutFromLock()}
        />
      )}
    </div>
  );
}

export default Welcome;