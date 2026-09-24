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
  FaClipboardList,
  FaSignOutAlt,
  FaAddressCard,
} from "react-icons/fa";
import schoolLogo from "../../assets/image/schoolLogo.jpg";

type MenuItem =
  | {
      label: string;
      icon: ReactElement;
      accent: string;
      subLinks: { label: string; path: string; end?: boolean }[];
    }
  | { label: string; icon: ReactElement; accent: string; path: string; end?: boolean };

/** The logo in the brand block always returns to the dashboard. */
const DASHBOARD_PATH = "/welcome";

// The school's own four brand colors (see the login page wordmark), each
// permanently assigned to one section so color carries meaning, not decoration.
const BRAND = {
  green: "#1E9E5C",
  blue: "#3763E0",
  red: "#DC3D42",
  pink: "#D6408F",
};

const MENU: MenuItem[] = [
  {
    label: "Student",
    icon: <FaUserGraduate />,
    accent: BRAND.green,
    subLinks: [
      { label: "Add Student", path: "/welcome/student/add" },
      { label: "Student List", path: "/welcome/student/list" },
      { label: "Subject", path: "/welcome/student/subject" },
    ],
  },
  {
    label: "Teacher",
    icon: <FaChalkboardTeacher />,
    accent: BRAND.blue,
    subLinks: [
      { label: "Add Teacher", path: "/welcome/teacher/add" },
      { label: "Teachers List", path: "/welcome/teacher/list" },
    ],
  },
  {
    label: "ID Card",
    icon: <FaAddressCard />,
    accent: BRAND.pink,
    subLinks: [
      { label: "Students", path: "/welcome/id-card/students" },
      { label: "Teachers", path: "/welcome/id-card/teachers" },
      { label: "Staff", path: "/welcome/id-card/staff" },
      { label: "Admin", path: "/welcome/id-card/admin" },
    ],
  },
  {
    label: "Exam",
    icon: <FaClipboardList />,
    accent: BRAND.red,
    subLinks: [
      { label: "Exam", path: "/welcome/exam/list" },
      // { label: "Exam Schedule", path: "/welcome/admit-card/schedule" },
      { label: "Admit Card", path: "/welcome/admit-card", end: true },
      // { label: "Generate Admit Card", path: "/welcome/admit-card/generate" },
      { label: "Result", path: "/welcome/result" },
    ],
  },
];

function activeGroup(pathname: string): string {
  if (pathname.startsWith("/welcome/student")) return "Student";
  if (pathname.startsWith("/welcome/teacher")) return "Teacher";
  if (pathname.startsWith("/welcome/id-card")) return "ID Card";
  if (pathname.startsWith("/welcome/admit-card")) return "Exam";
  if (pathname.startsWith("/welcome/exam")) return "Exam";
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
  const handleGroupClick = (item: Extract<MenuItem, { subLinks: unknown[] }>) => {
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
        className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col shadow-2xl transform transition-all duration-300 ease-in-out border-r border-white/5
          bg-gradient-to-b from-[#12141C] to-[#181B26] text-white
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:z-30 md:h-screen md:shrink-0
          print:hidden
          ${collapsed ? "md:w-20" : "md:w-72"}`}
      >
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3 top-8 z-50 w-6 h-6 items-center justify-center rounded-full bg-[#20222E] border border-white/10 text-gray-300 text-xs shadow-md hover:text-white hover:border-[#3763E0] transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <BsChevronRight /> : <BsChevronLeft />}
        </button>

        {/* Brand */}
        <div className={collapsed ? "md:px-0" : ""}>
          <div
            className={`flex items-center border-b border-white/5 px-5 py-5 ${
              collapsed ? "md:justify-center md:px-0" : "justify-between"
            }`}
          >
            <NavLink
              to={DASHBOARD_PATH}
              onClick={onClose}
              title="Go to dashboard"
              aria-label="Children's Valley English School logo - go to dashboard"
              className="group -m-1 flex min-w-0 items-center gap-3 rounded-lg p-1 transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3763E0]"
            >
              <img
                src={schoolLogo}
                alt="Children's Valley English School logo"
                className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm transition-transform group-hover:scale-105"
              />
              <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
                <h2 className="font-bold text-base text-white truncate leading-tight tracking-tight">
                  CVES Panel
                </h2>
                <p className="text-[11px] text-gray-400 truncate">
                  Children's Valley English School
                </p>
              </div>
            </NavLink>
            <button
              onClick={onClose}
              className="md:hidden text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors text-xl"
              aria-label="Close menu"
            >
              <BsX />
            </button>
          </div>

          {/* Signature stripe - the school's own four brand colors, in one place */}
          <div className="flex h-[3px] w-full overflow-hidden">
            <span className="flex-1" style={{ backgroundColor: BRAND.green }} />
            <span className="flex-1" style={{ backgroundColor: BRAND.blue }} />
            <span className="flex-1" style={{ backgroundColor: BRAND.red }} />
            <span className="flex-1" style={{ backgroundColor: BRAND.pink }} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {MENU.map((item) =>
            "subLinks" in item ? (
              <div key={item.label}>
                <button
                  onClick={() => handleGroupClick(item)}
                  title={collapsed ? item.label : undefined}
                  style={
                    expanded === item.label
                      ? { borderLeft: `3px solid ${item.accent}` }
                      : { borderLeft: "3px solid transparent" }
                  }
                  className={`w-full flex items-center rounded-r-lg text-sm font-semibold transition-colors
                    ${collapsed ? "md:justify-center md:rounded-lg px-0 py-2.5" : "justify-between pl-3 pr-3 py-2.5"}
                    ${
                      expanded === item.label
                        ? "bg-white/[0.06] text-white"
                        : "text-gray-300 hover:bg-white/[0.04] hover:text-white"
                    }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-base shrink-0"
                      style={{
                        backgroundColor: `${item.accent}1A`,
                        color: item.accent,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                  </span>
                  <span className={`text-xs ${collapsed ? "md:hidden" : ""}`}>
                    {expanded === item.label ? <BsChevronUp /> : <BsChevronDown />}
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
                  <div className="ml-4 space-y-0.5 border-l-2 border-white/5 pl-4 py-0.5">
                    {item.subLinks.map((link) => (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        end={link.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? "font-bold text-white shadow-sm"
                              : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                          }`
                        }
                        style={({ isActive }) =>
                          isActive ? { backgroundColor: item.accent } : undefined
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
                  `flex items-center gap-3 rounded-lg text-sm font-semibold transition-colors ${
                    collapsed ? "md:justify-center px-0 py-2.5" : "px-3 py-2.5"
                  } ${
                    isActive
                      ? "text-white shadow-sm"
                      : "text-gray-300 hover:bg-white/[0.04] hover:text-white"
                  }`
                }
                style={({ isActive }) =>
                  isActive ? { backgroundColor: item.accent } : undefined
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-base shrink-0"
                      style={
                        isActive
                          ? { backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }
                          : { backgroundColor: `${item.accent}1A`, color: item.accent }
                      }
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
        <div className="px-3 py-4 border-t border-white/5">
          <div
            className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors ${
              collapsed ? "md:justify-center" : ""
            }`}
          >
            <div
              className="w-10 h-10 shrink-0 rounded-full text-white flex items-center justify-center font-bold shadow-inner"
              style={{
                background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.pink})`,
              }}
            >
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
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors border"
            style={{
              borderColor: `${BRAND.red}4D`,
              color: BRAND.red,
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${BRAND.red}1A`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <FaSignOutAlt /> <span className={collapsed ? "md:hidden" : ""}>Logout</span>
          </button>

          {/* App version — bumped automatically on every deploy */}
          <p className="mt-3 text-center text-[10px] tracking-wide text-white/25 select-none">
            v{__APP_VERSION_LABEL__}
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;