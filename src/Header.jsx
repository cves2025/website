import React, { useState } from "react";
import SideBar from "./SideBar";
import { BsFillMortarboardFill } from "react-icons/bs";
import { GrGallery } from "react-icons/gr";
import { IoCloudDownloadSharp, IoMegaphone } from "react-icons/io5";
import { MdContactPhone } from "react-icons/md";
const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div>
        <SideBar isopen={isOpen} setIsOpen={setIsOpen} />
      </div>
      <div className="flex">
        <div className="min-h-32 min-w-20 h-24 sm:h-28  md:h-36 lg:h-40 mx-2">
          <img
            src="/images/logo/logo.jpg"
            alt="error photo was not available yet"
            className=" h-full  w-full object-contain"
          />
        </div>

        <div className="flex flex-col w-full px-2 my-4 gap-2">
          <div className="h-full w-full font-cancun flex text-2xl sm:text-5xl md:text-6xl md:flex-row flex-wrap gap-x-5 gap-y-2 justify-center items-center text-center">
            <div className="flex gap-2">
              <span className="text-primaryGreen">CHILDREN'S </span>
              <span className="text-primaryBlue ">VALLEY </span>
            </div>
            <div className="flex gap-2">
              <span className="text-primaryRed">ENGLISH</span>
              <span className="text-primaryPink">SCHOOL</span>
            </div>
          </div>
          <div className="w-full flex items-start justify-center">
            <span className="text-sm md:text-xl lg:text-2xl font-serif font-semibold">
              Mahmoorganj, Varanasi
            </span>
          </div>
        </div>
      </div>
      <div className="bg-primaryGreen text-white p-4">
        <div className="md:flex md:justify-center hidden sm:block ">
          <ul className="text-lg flex flex-wrap gap-5 justify-center items-center font-semibold">
            <li className="cursor-pointer hover:text-primaryGreen hover:bg-white  duration-500 shadow shadow-white rounded-xl border border-white">
              <a href="/" className="flex gap-2 items-center px-4 py-1">
                <FaHome />
                Home
              </a>
            </li>
            <li className="cursor-pointer hover:text-primaryGreen hover:bg-white duration-500 shadow shadow-white rounded-xl border border-white">
              <a
                href="/sections=about_us"
                className="flex gap-2 items-center px-4 py-1"
              >
                <IoMegaphone />
                About Us
              </a>
            </li>
            <li className="cursor-pointer hover:text-primaryGreen hover:bg-white duration-500 shadow shadow-white rounded-xl border border-white">
              <a
                href="/sections=about_us"
                className="flex gap-2 items-center px-4 py-1"
              >
                <BsFillMortarboardFill /> Affiliations
              </a>
            </li>
            <li className="cursor-pointer hover:text-primaryGreen hover:bg-white duration-500 shadow shadow-white rounded-xl border border-white">
              <a
                href="/sections=photo_gallery"
                className="flex gap-2 items-center px-4 py-1"
              >
                <GrGallery />
                Photo Gallery
              </a>
            </li>
            <li className="cursor-pointer hover:text-primaryGreen hover:bg-white duration-500 shadow shadow-white rounded-xl border border-white">
              <a
                href="/sections=downloads"
                className="flex gap-2 items-center px-4 py-1"
              >
                <IoCloudDownloadSharp /> Downloads
              </a>
            </li>
            <li className="cursor-pointer hover:text-primaryGreen hover:bg-white duration-500 shadow shadow-white rounded-xl border border-white">
              <a
                href="/sections=contact_us"
                className="flex gap-2 items-center px-4 py-1"
              >
                <MdContactPhone />
                Contact Us
              </a>
            </li>
          </ul>
        </div>
        <div className="">
          <button
            className="sm:hidden p-2 px-4 flex items-center justify-center gap-2 cursor-pointer hover:text-primaryGreen hover:bg-white duration-500 shadow shadow-white rounded-xl border border-white"
            onClick={() => {
              setIsOpen((prev) => !prev);
            }}
          >
            <GiHamburgerMenu /> Menu
          </button>
        </div>
      </div>
    </>
  );
};

export default Header;
