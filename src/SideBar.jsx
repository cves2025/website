import React, { useState } from "react";
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
const SideBar = ({ isopen, setIsOpen }) => {
  const [expand, setExpand] = useState(false);
  const [expandTwo, setExpandTwo] = useState(false);
  const [expandThree, setExpandThree] = useState(false);
  const [expandFour, setExpandFour] = useState(false);
  return (
    <div
      className={`h-[100vh] w-96  bg-green-600 fixed z-10 top-0 font-bold ${
        isopen ? "left-0 opacity-100" : "-left-[100%] opacity-0"
      } duration-300 transition-all ease-in-out
      `}
    >
      <div className="flex justify-end">
        <button
          className="py-2 px-4"
          onClick={() => {
            setIsOpen((prev) => !prev);
          }}
        >
          X
        </button>
      </div>
      <div className="">
        <ul className="flex flex-col">
          <li className="p-3 flex flex-col cursor-pointer ">
            <div className="flex justify-between items-center">
              <p>ABOUT</p>
              <button
                className=""
                onClick={() => {
                  setExpand((prop) => !prop);
                }}
              >
                {!expand ? (
                  <BiChevronDown className="min-w-8 min-h-8 p-1" />
                ) : (
                  <BiChevronUp className="min-w-8 min-h-8 p-1 " />
                )}
              </button>
            </div>
            <div className={`${expand ? "block" : "hidden"} `}>
              <ul className="px-4 flex flex-col gap-1">
                <li>VISION MISSION</li>

                <li>COMMITTE</li>
              </ul>
            </div>
          </li>

          <li className="  cursor-pointer p-3  ">
            PROGRAMMERS
            <button
              className="  font-bold float-right "
              onClick={() => {
                setExpandTwo((proptwo) => !proptwo);
              }}
            >
              {" "}
              {!expandTwo ? (
                <BiChevronDown className="min-w-8 min-h-8 p-1 " />
              ) : (
                <BiChevronUp className="min-w-8 min-h-8 p-1" />
              )}
            </button>
            <div className={`${expandTwo ? "block" : "hidden"} `}>
              <li>
                <div className=" h-32 w-96  relative -left-5 m-2 p-4 ">
                  <div>SECONDARY LEVEL</div>
                  <div>SR-SECONDARY LEVEL</div>
                  <div>SKILL & VOCATIONAL EDUCATION</div>
                  <div>FEE STRUCTURE</div>
                </div>
              </li>
              <div></div>
            </div>
          </li>

          <li className=" 50px] cursor-pointer p-3  ">
            COUNSELLING
            <button
              className="  font-bold float-right "
              onClick={() => {
                setExpandThree((propThree) => !propThree);
              }}
            >
              {!expandThree ? (
                <BiChevronDown className="min-w-8 min-h-8 p-1" />
              ) : (
                <BiChevronUp className="min-w-8 min-h-8 p-1" />
              )}
            </button>
            <div className={`${expandThree ? "block" : "hidden"} `}>
              <li>
                <div className=" h-32 w-96  relative -left-5 m-2 p-4 ">
                  <div>ADMISSION</div>
                  <div>SCHEME OF EXAMINATION</div>
                  <div>TRANSFER OR CREDIT</div>
                  <div>CERTIFICATE CRITERIA</div>
                </div>
              </li>
              <div></div>
            </div>
          </li>
          <li className=" 50px] cursor-pointer p-3   ">
            ACCREDITED INSTITUTES
            <button
              className="  font-bold float-right "
              onClick={() => {
                setExpandFour((propFour) => !propFour);
              }}
            >
              {!expandFour ? (
                <BiChevronDown className="min-w-8 min-h-8 p-1 " />
              ) : (
                <BiChevronUp className="min-w-8 min-h-8 p-1 " />
              )}
            </button>
            <div className={`${expandFour ? "block" : "hidden"} `}>
              <li>
                <div className=" h-32 w-96   relative -left-5 m-2 p-4 ">
                  <div>FIND ACCREDITED INSTITUTES</div>
                  <div>PARTNERS PROGRAM</div>
                  <div>ONLINE ACCREDITATION FORM</div>
                  <div>OFFLINE ACCREDITATION FORM</div>
                </div>
              </li>
              <div></div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SideBar;
