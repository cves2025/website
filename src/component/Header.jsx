import React from "react";
import schoolLogo from "../assets/image/schoolLogo.jpg";
import { BiSolidPhoneCall } from "react-icons/bi";

const Header = () => {
  return (
    <>
      <div className="flex w-full bg-gray-100 md:gap-x-10 sticky top-0 z-50 text-center">
        <div className="flex overflow-hidden md:w-40 justify-center items-center">
          <img
            src={schoolLogo}
            alt="school logo"
            className="w-28 h-20 lg:w-auto md:h-auto"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col justify-center items-center w-full">
          <h3 className="font-cancun text-3xl lg:text-6xl md:text-3xl">
            <span className="text-green-600">CHILDREN'S</span>
            <span className="text-blue-800"> VALLEY</span>
            <span className="text-red-600"> ENGLISH</span>
            <span className="text-pink-600"> SCHOOL</span>
          </h3>

          <p className="text-3xl font-bold text-black">
            Mahmoorganj Varanasi{" "}
            <span className="block sm:inline">
              <BiSolidPhoneCall className="inline mr-1" /> 9336576690
            </span>{" "}
          </p>
        </div>
      </div>
    </>
  );
};

export default Header;
