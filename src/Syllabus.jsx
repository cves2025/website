import React from "react";
import { useState } from "react";
const Syllabus = () => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div
      className={`${
        isOpen ? "h-10 duration-200" : "h-45rem] duration-200 "
      } overflow-hidden`}
    >
      <div>
        <div className=" h-full w-full bg-stone-400  ">
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
              Click Here For Syllabus Session 2025-26
            </button>
          </div>
          <div className="flex  justify-center font-medium gap-5 py-10  flex-wrap">
            {/* <div className={isOpen ? "hidden " : "block "}>Play Group</div> */}
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>Nursery</span>
              <embed
                className="h-[32rem] w-[22rem] "
                src="/Syllabus/Nursery_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>LKG</span>
              <embed
                className="h-[32rem] w-[22rem] "
                src="/Syllabus/LKG_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>UKG</span>
              <embed
                className="h-[32rem] w-[22rem] "
                src="/Syllabus/UKG_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>CLASS I</span>
              <embed
                className="h-[32rem] w-[22rem]"
                src="/Syllabus/Class-1_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>CLASS II</span>
              <embed
                className="h-[32rem] w-[22rem]"
                src="/Syllabus/Class-2-Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>CLASS III</span>
              <embed
                className="h-[32rem] w-[22rem]"
                src="/Syllabus/Class-3_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>CLASS IV</span>
              <embed
                className="h-[32rem] w-[22rem] "
                src="/Syllabus/Class-4_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>CLASS V</span>
              <embed
                className="h-[32rem] w-[22rem]"
                src="/Syllabus/Class-5_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>CLASS VI</span>
              <embed
                className="h-[32rem] w-[22rem]"
                src="/Syllabus/Class-6_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>CLASS VII</span>
              <embed
                className="h-[32rem] w-[22rem]"
                src="/Syllabus/Class-7_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
            <div className={`${isOpen ? "hidden" : "block"}  `}>
              <span>CLASS VIII</span>
              <embed
                className="h-[32rem] w-[22rem]"
                src="/Syllabus/Class-8_Syllabus_2025-26.pdf"
                type="application/pdf"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Syllabus;
