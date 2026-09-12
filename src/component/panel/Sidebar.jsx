import React, { useState, useContext } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { myContext } from "../context/MyContextProvider";
import { BsX, BsChevronDown, BsChevronUp } from "react-icons/bs";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaIdCard,
  FaFileAlt,
  FaSignOutAlt,
  FaAddressCard,
} from "react-icons/fa";

const MENU = [
  {
    label: "Student",
    icon: <FaUserGraduate className="text-green-400" />,
    subLinks: [
      { label: "Add Student", path: "/welcome/student/add" },
      { label: "Student List", path: "/welcome/student/list" },
    ],
  },
  {
    label: "Teacher",
    icon: <FaChalkboardTeacher className="text-blue-400" />,
    subLinks: [
      { label: "Add Teacher", path: "/welcome/teacher/add" },
      { label: "Teachers List", path: "/welcome/teacher/list" },
    ],
  },
  {
    label: "ID Card",
    icon: <FaAddressCard className="text-teal-400" />,
    subLinks: [
      { label: "Students", path: "/welcome/id-card/students" },
      { label: "Teachers", path: "/welcome/id-card/teachers" },
      { label: "Staff", path: "/welcome/id-card/staff" },
      { label: "Admin", path: "/welcome/id-card/admin" },
    ],
  },
  {
    label: "Admit Card",
    icon: <FaIdCard className="text-amber-400" />,
    path: "/welcome/admit-card",
  },
  {
    label: "Result",
    icon: <FaFileAlt className="text-pink-400" />,
    path: "/welcome/result",
  },
];

function activeGroup(pathname) {
  if (pathname.startsWith("/welcome/student")) return "Student";
  if (pathname.startsWith("/welcome/teacher")) return "Teacher";
  if (pathname.startsWith("/welcome/id-card")) return "ID Card";
  return "";
}

function Sidebar({ open, onClose }) {
  const { user, logout } = useContext(myContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(activeGroup(location.pathname));

  const toggleGroup = (label) =>
    setExpanded((prev) => (prev === label ? "" : label));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = (user?.name || user?.email || "U").trim()[0]?.toUpperCase() || "U";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:z-auto md:h-screen md:shrink-0`}
    >
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <div className="min-w-0">
          <h2 className="font-bold text-lg text-amber-400 truncate">CVES Panel</h2>
          <p className="text-xs text-gray-400 truncate">
            Children's Valley English School
          </p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-gray-300 hover:text-white text-2xl"
          aria-label="Close menu"
        >
          <BsX />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {MENU.map((item) =>
          item.subLinks ? (
            <div key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-semibold transition-colors
                  ${expanded === item.label ? "bg-gray-800 text-white" : "hover:bg-gray-800 text-gray-100"}`}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </span>
                {expanded === item.label ? (
                  <BsChevronUp />
                ) : (
                  <BsChevronDown />
                )}
              </button>
              {expanded === item.label && (
                <div className="ml-5 mt-1 space-y-1 border-l-2 border-gray-700 pl-3">
                  {item.subLinks.map((link) => (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive
                            ? "bg-amber-600 text-white font-semibold"
                            : "text-gray-300 hover:text-white hover:bg-gray-800"
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-amber-600 text-white"
                    : "text-gray-100 hover:bg-gray-800"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 shrink-0 rounded-full bg-amber-500 text-gray-900 flex items-center justify-center font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {user?.name || "Admin User"}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2 text-sm font-bold transition-colors"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;