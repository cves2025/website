import React, { useState } from "react";
import SideBar from "./SideBar";
import { FaHamburger } from "react-icons/fa";
import { GiHamburger, GiHamburgerMenu } from "react-icons/gi";
const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div>
        <SideBar isopen={isOpen} setIsOpen={setIsOpen} />
      </div>
      <div className="flex">
        <div className="min-h-32 h-24 sm:h-28  md:h-36 lg:h-40">
          <img
            src="/images/logo/logo.jpg"
            alt="error photo was not available yet"
            className=" h-full  w-full object-contain "
          />
        </div>
        <p className=" h-full w-full font-cancun flex text-3xl sm:text-5xl md:text-6xl md:flex-row flex-wrap gap-0 px-5 my-4 justify-center text-center">
          <div>
            <span className="text-primaryGreen ">CHILDREN'S </span>
            <span className="text-primaryBlue">VALLEY</span>
          </div>
          <div>
            <span className="text-primaryRed">ENGLISH </span>
            <span className="text-primaryPink">SCHOOL</span>
          </div>
        </p>
      </div>
      <div className="  h-10 bg-primaryGreen text-white ">
        <div className="  text-2xl md:flex md:justify-center hidden sm:block">
          <ul className="flex gap-2 font-semibold">
            <li className="cursor-pointer hover:text-black duration-500 ">
              <a href="/">Home</a>
            </li>
            <li className="cursor-pointer hover:text-black duration-500 ">
              About
            </li>
            <li>
              <span className=" hover:text-black duration-500">
                <a href="tel:9336576690">9336576690, </a>
              </span>
              <span className="hover:text-black duration-500">
                <a href="tel:8081667099">8081667099</a>
              </span>
            </li>
          </ul>
        </div>
        <div className="">
          <button
            className="h-7  md:hidden sm:hidden  bg-green-600  hover:bg-green-500 duration-300  px-5 border border-b-yellow-950 rounded-lg my-1 mx-4 text-white"
            onClick={() => {
              setIsOpen((prev) => !prev);
            }}
          >
            <GiHamburgerMenu />
          </button>
        </div>
      </div>
    </>
  );
};

export default Header;
