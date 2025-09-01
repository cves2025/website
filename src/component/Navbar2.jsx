import React from "react";
import { BsList, BsX } from "react-icons/bs";
import { NavLink } from "react-router-dom";

function Navbar2({ dynemicClass }) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [downloadIsOpen, setDownloadIsOpen] = React.useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleDownloadMenu = () => {
    setDownloadIsOpen(() => !downloadIsOpen);
    setTimeout(() => {
      setDownloadIsOpen(false);
    }, 5000);
  };

  const linkClasses = ({ isActive }) =>
    `block w-full h-10 px-5 rounded hover:bg-amber-600
   ${isActive ? "bg-amber-700" : "bg-gray-800"}`;

  return (
    <nav
      className={`sticky z-50 md:flex md:justify-center md:items-center ${dynemicClass} print:hidden`}
    >
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
          <h1
            className={`relative flex flex-row justify-center items-center hover:text-amber-600 hover:cursor-pointer`}
            onClick={toggleDownloadMenu}
          >
            Downloads
            <svg
              className={`w-5 h-5 transform transition-transform duration-200 ${
                downloadIsOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <div
              className={`${
                downloadIsOpen
                  ? "absolute flex flex-col top-10 left-10 bg-gray-100"
                  : "hidden"
              }`}
            >
              <ul className="">
                <li>
                  <NavLink
                    className={({ isActive }) =>
                      isActive
                        ? "text-blue-600 flex flex-row justify-center items-center"
                        : "hover:text-amber-600 flex justify-row justify-center items-center"
                    }
                    to="/downloads"
                  >
                    Downloads
                  </NavLink>
                </li>
                <li><NavLink
                    className={({ isActive }) =>
                      isActive
                        ? "text-blue-600 flex flex-row justify-center items-center"
                        : "hover:text-amber-600 flex justify-row justify-center items-center"
                    }
                    to="/download/result"
                  >
                    Result
                  </NavLink></li>
              </ul>
            </div>
          </h1>
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
        {/* Mobile view navbar start from here */}
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
