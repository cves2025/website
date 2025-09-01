import React from "react";
import { NavLink } from "react-router-dom";

function Breadcrumb({testName, endLocation}) {
  return (
    <div>
      <nav
        className="text-sm text-gray-600 dark:text-gray-300 mb-4"
        aria-label="Breadcrumb"
      >
        <ol className="flex flex-wrap items-center space-x-2">
          <li>
            <NavLink
              to="/dashboard"
              className="hover:underline text-blue-600 dark:text-blue-400"
            >
              Home
            </NavLink>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li>
            <NavLink
              to="/examDashboard"
              className="hover:underline text-blue-600 dark:text-blue-400"
            >
              {testName}
            </NavLink>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="text-gray-800 dark:text-white font-medium">
            {endLocation}
          </li>
        </ol>
      </nav>
    </div>
  );
}

export default Breadcrumb;
