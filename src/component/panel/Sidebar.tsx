import { useState, useContext, ReactElement } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { myContext } from "../context/MyContextProvider";
import {
  BsX,
  BsChevronDown,
  BsChevronUp,
  BsChevronLeft,
  BsChevronRight,
} from "react-icons/bs";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaIdCard,
  FaFileAlt,
  FaSignOutAlt,
  FaAddressCard,
} from "react-icons/fa";
import { AiOutlineDashboard } from "react-icons/ai";

type MenuItem =
  | {
      label: string;
      icon: ReactElement;
      color: string;
      subLinks: { label: string; path: string }[];
    }
  | { label: string; icon: ReactElement; color: string; path: string; end?: boolean };

const MENU: MenuItem[] = [
  {
    label: "Dashboard",
    icon: <AiOutlineDashboard />,
    color: "text-pink-400 bg-pink-400/10",
    path: "/welcome",
    end: true,
  },
  {
    label: "Student",
    icon: <FaUserGraduate />,
    color: "text-emerald-400 bg-emerald-400/10",
    subLinks: [
      { label: "Add Student", path: "/welcome/student/add" },
      { label: "Student List", path: "/welcome/student/list" },
      { label: "Subject", path: "/welcome/student/subject" },
    ],
  },
  {
    label: "Teacher",
    icon: <FaChalkboardTeacher />,
    color: "text-sky-400 bg-sky-400/10",
    subLinks: [
      { label: "Add Teacher", path: "/welcome/teacher/add" },
      { label: "Teachers List", path: "/welcome/teacher/list" },
    ],
  },
  {
    label: "ID Card",
    icon: <FaAddressCard />,
    color: "text-teal-400 bg-teal-400/10",
    subLinks: [
      { label: "Students", path: "/welcome/id-card/students" },
      { label: "Teachers", path: "/welcome/id-card/teachers" },
      { label: "Staff", path: "/welcome/id-card/staff" },
      { label: "Admin", path: "/welcome/id-card/admin" },
    ],
  },
  {
    label: "Admit Card",
    icon: <FaIdCard />,
    color: "text-amber-400 bg-amber-400/10",
    path: "/welcome/admit-card",
  },
  {
    label: "Result",
    icon: <FaFileAlt />,
    color: "text-pink-400 bg-pink-400/10",
    path: "/welcome/result",
  },
];

function activeGroup(pathname: string): string {
  if (pathname.startsWith("/welcome/student")) return "Student";
  if (pathname.startsWith("/welcome/teacher")) return "Teacher";
  if (pathname.startsWith("/welcome/id-card")) return "ID Card";
  return "";
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useContext(myContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(activeGroup(location.pathname));
  const [collapsed, setCollapsed] = useState(false);

  // When collapsed, clicking a group icon navigates straight to its first sub-link
  // instead of expanding (since there's no room to show sub-links while collapsed).
  const handleGroupClick = (item: Extract<MenuItem, { subLinks: any }>) => {
    if (collapsed) {
      navigate(item.subLinks[0].path);
      onClose();
      return;
    }
    setExpanded((prev) => (prev === item.label ? "" : item.label));
  };

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
    setExpanded("");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials =
    (user?.name || user?.email || "U").trim()[0]?.toUpperCase() || "U";

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-gray-900 to-gray-950 text-white flex flex-col shadow-2xl transform transition-all duration-300 ease-in-out border-r border-gray-800
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:z-auto md:h-screen md:shrink-0
          ${collapsed ? "md:w-20" : "md:w-72"}`}
      >
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3 top-8 z-50 w-6 h-6 items-center justify-center rounded-full bg-amber-500 text-gray-900 text-xs shadow-md hover:bg-amber-400 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <BsChevronRight /> : <BsChevronLeft />}
        </button>

        {/* Brand */}
        <div
          className={`flex items-center border-b border-gray-800 px-5 py-5 ${
            collapsed ? "md:justify-center md:px-0" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-500 flex items-center justify-center font-black text-gray-900 text-lg">
              C
            </div>
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <h2 className="font-bold text-base text-white truncate leading-tight">
                CVES Panel
              </h2>
              <p className="text-[11px] text-gray-400 truncate">
                Children's Valley English School
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg p-1.5 transition-colors text-xl"
            aria-label="Close menu"
          >
            <BsX />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {MENU.map((item) =>
            "subLinks" in item ? (
              <div key={item.label}>
                <button
                  onClick={() => handleGroupClick(item)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-lg text-sm font-semibold transition-all
                    ${collapsed ? "md:justify-center px-0 py-2.5" : "justify-between px-3 py-2.5"}
                    ${
                      expanded === item.label
                        ? "bg-gray-800/80 text-white"
                        : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                    }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-base shrink-0 ${item.color}`}
                    >
                      {item.icon}
                    </span>
                    <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                  </span>
                  <span
                    className={`text-xs transition-transform duration-200 ${
                      collapsed ? "md:hidden" : ""
                    }`}
                  >
                    {expanded === item.label ? (
                      <BsChevronUp />
                    ) : (
                      <BsChevronDown />
                    )}
                  </span>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    collapsed ? "md:hidden" : ""
                  } ${
                    expanded === item.label && !collapsed
                      ? "max-h-96 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="ml-4 space-y-0.5 border-l-2 border-gray-800 pl-4 py-0.5">
                    {item.subLinks.map((link) => (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? "bg-amber-500 text-gray-900 font-bold shadow-sm"
                              : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                          }`
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.end}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg text-sm font-semibold transition-all ${
                    collapsed ? "md:justify-center px-0 py-2.5" : "px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-amber-500 text-gray-900 shadow-sm"
                      : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-base shrink-0 ${
                        isActive ? "bg-gray-900/10" : item.color
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-gray-800 bg-gray-950/60">
          <div
            className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-800/50 transition-colors ${
              collapsed ? "md:justify-center" : ""
            }`}
          >
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-gray-900 flex items-center justify-center font-bold shadow-inner">
              {initials}
            </div>
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <p className="text-sm font-semibold truncate text-white">
                {user?.name || "Admin User"}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-red-600/90 hover:bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-bold transition-colors shadow-sm"
          >
            <FaSignOutAlt /> <span className={collapsed ? "md:hidden" : ""}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;