import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PageHeaderProps {
  /** Heading text shown on the left. */
  title?: string;

  /** Extra Tailwind classes for the title. */
  titleStyle?: string;

  /** Supporting text rendered underneath the title. */
  description?: string | ReactNode;

  /** Extra Tailwind classes for the description. */
  descriptionStyle?: string;

  /** Any node rendered on the right side. */
  button?: ReactNode;

  /** Buttons/nodes rendered inside the dropdown menu. */
  buttonDropdown?: ReactNode;

  /** Extra Tailwind classes for the header wrapper. */
  className?: string;
}

function PageHeader({
  title,
  titleStyle = "",
  description,
  descriptionStyle = "",
  button,
  buttonDropdown,
  className = "",
}: PageHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Close dropdown when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <section
      className={`flex w-full flex-col gap-3 rounded-lg bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${className}`}
    >
      {/* Title & Description */}
      <div className="min-w-0">
        {title && (
          <h1
            className={`text-xl font-bold tracking-tight text-black sm:text-2xl ${titleStyle}`}
          >
            {title}
          </h1>
        )}

        {description && (
          <p
            className={`mt-1 text-sm text-black sm:text-base ${descriptionStyle}`}
          >
            {description}
          </p>
        )}
      </div>

      {/* Right Side */}
      <div className="ml-auto flex shrink-0 items-center gap-2 pt-1 sm:pt-0">
        {/* Normal Button */}
        {button && <div>{button}</div>}

        {/* Dropdown */}
        {buttonDropdown && (
          <div ref={dropdownRef} className="relative">
            {/* Dropdown Toggle */}
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              className="flex items-center justify-center rounded-full border border-gray-300 bg-white p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-primaryBlue/30"
            >
              {dropdownOpen ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
                role="menu"
              >
                {buttonDropdown}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default PageHeader;