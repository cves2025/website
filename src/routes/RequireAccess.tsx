import { useContext, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { myContext } from "../component/context/MyContextProvider";
import Loader from "../custom-components/Loader";
import NoAccess from "../component/panel/NoAccess";

function RequireAccess() {
  const { user, authReady, profileReady, logout } = useContext(myContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authReady && !user) {
      const from = `${location.pathname}${location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(from)}`, { replace: true });
    }
  }, [authReady, user, location.pathname, location.search, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!authReady) return <Loader label="Checking your session..." />;
  if (!user) return <Loader label="Redirecting to login..." />;
  if (!profileReady) return <Loader label="Loading your profile..." />;
  if (user.accessState !== "ok") {
    return <NoAccess state={user.accessState} onLogout={handleLogout} />;
  }

  return <Outlet />;
}

export default RequireAccess;