import { useEffect, useState, useContext } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./panel/Sidebar";
import { myContext } from "./context/MyContextProvider";
import Loader from "../custom-components/Loader";
import { BsList } from "react-icons/bs";

function Welcome() {
  const { user, authReady } = useContext(myContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex h-screen overflow-hidden bg-gray-100 print:block print:h-auto print:overflow-visible print:bg-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white shadow-sm flex items-center gap-3 px-4 py-3 print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-700 hover:text-gray-900"
            aria-label="Open menu"
          >
            <BsList className="w-7 h-7" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">
            Welcome{user?.name ? `, ${user.name}` : ""}!
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Welcome;