import { useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { myContext } from "../component/context/MyContextProvider";
import { canAccessPath } from "../permissions";
import Unauthorized from "../component/panel/Unauthorized";

function RequireRoutePermission() {
  const { user } = useContext(myContext);
  const { pathname } = useLocation();

  if (!user || !canAccessPath(pathname, user.permissions)) {
    return <Unauthorized />;
  }
  return <Outlet />;
}

export default RequireRoutePermission;