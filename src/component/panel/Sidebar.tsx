import {
  useState,
  useContext,
  useEffect,
  useRef,
  useMemo,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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
  FaSignOutAlt,
  FaCog,
  FaUserShield,
  FaIdBadge,
  FaNewspaper,
  FaImages,
  FaFilePdf,
} from "react-icons/fa";
import schoolLogo from "../../assets/image/schoolLogo.jpg";
import { BRAND, MENU, filterMenu, groupOfPath, type MenuItem } from "../../config/navigation";
import { PERMISSIONS } from "../../permissions";

/** The logo in the brand block always returns to the dashboard. */
const DASHBOARD_PATH = "/welcome";

/** Page opened by the "Settings" item of the account menu (mini sidebar). */
const SETTINGS_PATH = "/welcome/settings";

/** Page opened by the "Permissions" item of the account menu. */
const PERMISSIONS_PATH = "/welcome/settings/permissions";

/** Page opened by the "My Profile" item of the account menu. */
const PROFILE_PATH = "/welcome/settings/profile";

/** Page opened by the "News" item of the account menu. */
const NEWS_PATH = "/welcome/settings/news";

/** Page opened by the "Gallery" item of the account menu. */
const GALLERY_PATH = "/welcome/settings/gallery";

/** Page opened by the "Downloads" item of the account menu. */
const DOWNLOADS_PATH = "/welcome/settings/downloads";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout, can } = useContext(myContext);
  const navigate = useNavigate();
  const location = useLocation();

  const canOpenSettings = can(PERMISSIONS.SETTINGS_ACCESS);
  const canManagePermissions = can(PERMISSIONS.PERMISSIONS_MANAGE);
  // ON for teachers by default; the admin can switch it off per teacher.
  const canOpenProfile = can(PERMISSIONS.PROFILE_VIEW);
  const canManageNews = can(PERMISSIONS.NEWS_MANAGE);
  const canManageGallery = can(PERMISSIONS.GALLERY_MANAGE);
  const canManageDownloads = can(PERMISSIONS.DOWNLOADS_MANAGE);
  const canOpenAccountMenu =
    canOpenProfile ||
    canOpenSettings ||
    canManagePermissions ||
    canManageNews ||
    canManageGallery ||
    canManageDownloads;

  const menu = useMemo(
  () => filterMenu(MENU, user?.permissions ?? []),
  [user?.permissions]
);
const [expanded, setExpanded] = useState(groupOfPath(menu, location.pathname));
// Desktop sidebar starts collapsed; `collapsed` is what the chevron pins.
const [collapsed, setCollapsed] = useState(true);
// While collapsed, hovering opens it (the page shrinks like a normal open);
// leaving closes it again.
const [hovering, setHovering] = useState(false);
const isCollapsed = collapsed && !hovering;
const hoverTimer = useRef<number | null>(null);

  const clearHoverTimer = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  // A short delay so a cursor just passing over the bar does not open it.
  const handlePointerEnter = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse" || !collapsed) return;
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(() => setHovering(true), 120);
  };

  const handlePointerLeave = () => {
    clearHoverTimer();
    setHovering(false);
    setAccountMenuOpen(false);
  };

  useEffect(() => clearHoverTimer, []);

  // Mini sidebar ("account menu") shown when the user name at the bottom is
  // clicked. It hosts the My Profile, Settings, Permissions, News, Gallery and Downloads entries.
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  // Close the account menu on an outside click or on Escape.
  useEffect(() => {
    if (!accountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  /** Opens a page from the account menu and closes the drawer. */
  const openFromAccountMenu = (path: string) => {
    setAccountMenuOpen(false);
    onClose();
    navigate(path);
  };

  const onSettingsPage = location.pathname.startsWith(SETTINGS_PATH);

  // When isCollapsed, clicking a group icon navigates straight to its first sub-link
  // instead of expanding (since there's no room to show sub-links while isCollapsed).
  const handleGroupClick = (item: Extract<MenuItem, { subLinks: unknown[] }>) => {
    if (isCollapsed) {
      navigate(item.subLinks[0].path);
      onClose();
      return;
    }
    setExpanded((prev) => (prev === item.label ? "" : item.label));
  };

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
    clearHoverTimer();
    setHovering(false);
    setExpanded("");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials =
    (user?.fullName || user?.email || "U").trim()[0]?.toUpperCase() || "U";

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
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col shadow-2xl transform transition-all duration-300 ease-in-out border-r border-white/5
          bg-gradient-to-b from-[#12141C] to-[#181B26] text-white
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:z-30 md:h-screen md:shrink-0
          print:hidden
          ${isCollapsed ? "md:w-20" : "md:w-72"}`}
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
        <div className={isCollapsed ? "md:px-0" : ""}>
          <div
            className={`flex items-center border-b border-white/5 px-5 py-5 ${
              isCollapsed ? "md:justify-center md:px-0" : "justify-between"
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
              <div className={`min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
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
          {menu.map((item) =>
            "subLinks" in item ? (
              <div key={item.label}>
                <button
                  onClick={() => handleGroupClick(item)}
                  title={isCollapsed ? item.label : undefined}
                  style={
                    expanded === item.label
                      ? { borderLeft: `3px solid ${item.accent}` }
                      : { borderLeft: "3px solid transparent" }
                  }
                  className={`w-full flex items-center rounded-r-lg text-sm font-semibold transition-colors
                    ${isCollapsed ? "md:justify-center md:rounded-lg px-0 py-2.5" : "justify-between pl-3 pr-3 py-2.5"}
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
                    <span className={isCollapsed ? "md:hidden" : ""}>{item.label}</span>
                  </span>
                  <span className={`text-xs ${isCollapsed ? "md:hidden" : ""}`}>
                    {expanded === item.label ? <BsChevronUp /> : <BsChevronDown />}
                  </span>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isCollapsed ? "md:hidden" : ""
                  } ${
                    expanded === item.label && !isCollapsed
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
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg text-sm font-semibold transition-colors ${
                    isCollapsed ? "md:justify-center px-0 py-2.5" : "px-3 py-2.5"
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
                    <span className={isCollapsed ? "md:hidden" : ""}>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/5">
          <div ref={accountMenuRef} className="relative">
            {/* Account menu (mini sidebar) — opens upwards from the user block */}
            {canOpenAccountMenu && <div
              id="sidebar-account-menu"
              role="menu"
              aria-label="Account menu"
              className={`absolute bottom-full left-0 right-0 z-10 mb-2 min-w-[12rem] origin-bottom overflow-hidden rounded-xl border border-white/10 bg-[#1D2029] shadow-2xl transition-all duration-200 ease-out ${
                accountMenuOpen
                  ? "visible translate-y-0 opacity-100 pointer-events-auto"
                  : "invisible translate-y-1 opacity-0 pointer-events-none"
              }`}
            >
              <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                Account
              </p>
              {[
                {
                  show: canOpenProfile,
                  path: PROFILE_PATH,
                  label: "My Profile",
                  icon: <FaIdBadge />,
                  color: BRAND.pink,
                },
                {
                  show: canOpenSettings,
                  path: SETTINGS_PATH,
                  label: "Settings",
                  icon: <FaCog />,
                  color: BRAND.blue,
                },
                {
                  show: canManagePermissions,
                  path: PERMISSIONS_PATH,
                  label: "Permissions",
                  icon: <FaUserShield />,
                  color: BRAND.green,
                },
                {
                  show: canManageNews,
                  path: NEWS_PATH,
                  label: "News",
                  icon: <FaNewspaper />,
                  color: BRAND.red,
                },
                {
                  show: canManageGallery,
                  path: GALLERY_PATH,
                  label: "Gallery",
                  icon: <FaImages />,
                  color: BRAND.blue,
                },
                {
                  show: canManageDownloads,
                  path: DOWNLOADS_PATH,
                  label: "Downloads",
                  icon: <FaFilePdf />,
                  color: BRAND.pink,
                },
              ]
                .filter((item) => item.show)
                .map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    role="menuitem"
                    onClick={() => openFromAccountMenu(item.path)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <span
                      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-base"
                      style={{
                        backgroundColor: `${item.color}1A`,
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
            </div>}

            {/* Clicking the name (or the avatar while isCollapsed) opens the menu */}
            <button
              type="button"
              onClick={() => canOpenAccountMenu && setAccountMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-controls="sidebar-account-menu"
              title={isCollapsed ? "Account menu" : undefined}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                isCollapsed ? "md:justify-center" : ""
              } ${
                accountMenuOpen || onSettingsPage
                  ? "bg-white/[0.06]"
                  : "hover:bg-white/[0.04]"
              }`}
            >
              <span
                className="w-10 h-10 shrink-0 rounded-full text-white flex items-center justify-center font-bold shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.pink})`,
                }}
              >
                {initials}
              </span>
              <span
                className={`min-w-0 flex-1 text-left ${
                  isCollapsed ? "md:hidden" : ""
                }`}
              >
                <span className="block truncate text-sm font-semibold text-white">
                  {user?.fullName || user?.email || "User"}
                </span>
                <span className="block truncate text-xs text-gray-400">
                  {user?.email}
                </span>
              </span>
              {!isCollapsed && canOpenAccountMenu && (
                <span className="text-xs text-gray-400" aria-hidden="true">
                  {accountMenuOpen ? <BsChevronDown /> : <BsChevronUp />}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
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
            <FaSignOutAlt /> <span className={isCollapsed ? "md:hidden" : ""}>Logout</span>
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