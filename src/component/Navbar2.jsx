import React from "react";
import { BsList, BsX } from "react-icons/bs";
import { NavLink } from "react-router-dom";

function Navbar2({ dynemicClass }) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const linkClasses = ({ isActive }) =>
    `block w-full h-10 px-5 rounded hover:bg-amber-600
   ${isActive ? "bg-amber-700" : "bg-gray-800"}`;

  return (
    <nav
      className={`sticky top-[95px] z-50 md:top-[6rem] lg:top-[8rem] md:flex md:justify-center md:items-center ${dynemicClass}`}
    >
      {" "}
      {/* Adjust top position to prevent overlap */}
      <div className="flex md:justify-between md:items-center">
        <div className="hidden text-orange-600 text-2xl gap-10 md:flex z-50 flex-based md:justify-center md:items-center md:p-3">
          <NavLink
            className={({ isActive }) =>
              isActive ? "text-blue-600" : "hover:text-amber-600"
            }
            to="/"
          >
            Home
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? "text-blue-600" : "hover:text-amber-600"
            }
            to="/gallery"
          >
            Gallery
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? "text-blue-600" : "hover:text-amber-600"
            }
            to="/downloads"
          >
            Downloads
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? "text-blue-600" : "hover:text-amber-600"
            }
            to="/admission"
          >
            Admission
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? "text-blue-600" : "hover:text-amber-600"
            }
            to="/about"
          >
            About
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? "text-blue-600" : "hover:text-amber-600"
            }
            to="/contact"
          >
            Contact
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? "text-blue-600" : "hover:text-amber-600"
            }
            to="/payFee"
          >
            Pay Fee
          </NavLink>
        </div>
        <div
          className={`flex relative flex-col text-white font-bold text-2xl p-4 w-full md:hidden z-40 bg-amber-400`}
        >
          <div className="flex flex-col absolute top-0 right-0">
            <div className="flex self-end z-50">
              <span className="cursor-pointer" onClick={() => toggleMenu()}>
                {isMenuOpen ? <BsX /> : <BsList />}
              </span>
            </div>
            {isMenuOpen && (
              <div className="flex flex-col self-start items-center gap-1 bg-transparent ml-5">
                <NavLink
                  className={linkClasses}
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </NavLink>
                <NavLink
                  className={linkClasses}
                  to="/gallery"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Gallery
                </NavLink>
                <NavLink
                  className={linkClasses}
                  to="/downloads"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Downloads
                </NavLink>
                <NavLink
                  className={linkClasses}
                  to="/admission"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admission
                </NavLink>
                <NavLink
                  className={linkClasses}
                  to="/about"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </NavLink>
                <NavLink
                  className={linkClasses}
                  to="/contact"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </NavLink>
                <NavLink
                  className={linkClasses}
                  to="/payFee"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pay Fee
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar2;
