import React from "react";
import { useState } from "react";
const Syllabus = () => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div
      className={`${
        isOpen ? "h-10 duration-500" : "h-[100rem] duration-500"
      }  `}
    >
      <div>
        <div className="h-[100rem] w-full bg-stone-400 ">
          <div
            isopen={isOpen}
            setIsOpen={setIsOpen}
            className="flex justify-center"
          >
            <button
              onClick={() => {
                setIsOpen((p) => !p);
              }}
              className="font-medium text-2xl underline font-serif
                hover:text-blue-800 duration-500"
            >
              Click Here For Syllabus
            </button>
          </div>
          <div className="flex  flex-col justify-center text-center font-medium gap-10 py-10  ">
            <div className={isOpen ? "hidden " : "block "}>Play Group</div>
            <embed></embed>
            <div className={isOpen ? "hidden " : "block "}> NUS</div>
            <div className={isOpen ? "hidden " : "block "}> LKG</div>
            <div className={isOpen ? "hidden " : "block "}>UKG</div>
            <div className={isOpen ? "hidden " : "block "}>Class I</div>
            <div className={isOpen ? "hidden " : "block "}>Class II</div>
            <div className={isOpen ? "hidden " : "block "}>Class III</div>
            <div className={isOpen ? "hidden " : "block "}>Class IV</div>
            <div className={isOpen ? "hidden " : "block "}>Class V</div>
            <div className={isOpen ? "hidden " : "block "}>Class VI</div>
            <div className={isOpen ? "hidden " : "block "}>Class VII</div>
            <div className={isOpen ? "hidden " : "block "}>Class VIII</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Syllabus;
