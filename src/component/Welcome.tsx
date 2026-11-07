import { useEffect, useState, useContext } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./panel/Sidebar";
import { myContext } from "./context/MyContextProvider";
import Loader from "../custom-components/Loader";
import { BsList } from "react-icons/bs";
import { FaGlobe } from "react-icons/fa";
import WhatsNewModal from "../features/whats-new/WhatsNewModal";
import { useWhatsNew } from "../features/whats-new/useWhatsNew";
import { IndianRupee } from "lucide-react";
import { DASHBOARD_GRADIENT, FEE_COLLECT_PATH } from "../constants";
import { PERMISSIONS } from "../permissions";

function Welcome() {
  const { user, authReady, can } = useContext(myContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const whatsNew = useWhatsNew();
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
          {user.role === "admin" ? (
            // Admins see the school name, styled like the AddStudent /
            // result card letterhead.
            // On the dashboard the coloured name sits on a white box, so it
            // stays readable on the gradient.
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
          ) : (
            <h1 className={`text-lg md:text-xl font-bold truncate ${onDashboard ? "text-white" : "text-gray-800"}`}>
              Welcome{user?.fullName ? `, ${user.fullName}` : ""}!
            </h1>
          )}
          {can(PERMISSIONS.FEE_MANAGE) && (
            // Collect Fee from any page, with the cursor in the student search.
            // On that page already, the picked student stays.
            <button
              type="button"
              title="Collect Fee"
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
              className={`ml-auto grid shrink-0 place-items-center rounded-full text-white shadow-sm transition-colors ${
                onDashboard
                  ? "h-7 w-7 bg-white/15 ring-1 ring-inset ring-white/40 hover:bg-white/25"
                  : "h-9 w-9 bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <IndianRupee className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
          {user.role === "admin" && (
            <Link
              to="/"
              title="Go to Website"
              className={`${can(PERMISSIONS.FEE_MANAGE) ? "" : "ml-auto "}flex shrink-0 items-center gap-2 rounded-full px-3 text-sm font-bold text-white shadow-sm transition-colors sm:px-4 ${
                onDashboard
                  ? "bg-white/15 py-1 ring-1 ring-inset ring-white/40 hover:bg-white/25"
                  : "bg-blue-600 py-2 hover:bg-blue-700"
              }`}
            >
              <FaGlobe className="h-4 w-4" />
              {/* Icon only on small phones, so the school name keeps its room. */}
              <span className="hidden sm:inline">Go to Website</span>
            </Link>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-2 overflow-y-auto print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>

      {/* Globally mounted release announcement (once per user per release). */}
      <WhatsNewModal open={whatsNew.open} onClose={whatsNew.onClose} />
    </div>
  );
}

export default Welcome;