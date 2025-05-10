import React from "react";

const RunningLine = ({ text }) => {
  return (
    <div className="relative w-full overflow-hidden bg-gray-300 text-xl py-2">
      <div
        className="whitespace-nowrap animate-scroll-left"
        style={{
          animationDuration: "20s", // Adjust duration as needed
          animationIterationCount: "infinite",
          animationTimingFunction: "linear",
        }}
      >
        <p>
          <span className="text-primaryGreen">ADMISSION OPEN </span>
          <span className="text-primaryBlue">ADMISSION OPEN </span>
          <span className="text-primaryRed">ADMISSION OPEN </span>
          <span className="text-primaryPink">ADMISSION OPEN </span>
          <span className="text-primaryGreen">ADMISSION OPEN </span>
          <span className="text-primaryBlue">ADMISSION OPEN </span>
          <span className="text-primaryRed">ADMISSION OPEN </span>
          <span className="text-primaryPink">ADMISSION OPEN </span>
          <span className="text-primaryGreen">ADMISSION OPEN </span>
          <span className="text-primaryBlue">ADMISSION OPEN </span>
          <span className="text-primaryRed">ADMISSION OPEN </span>
          <span className="text-primaryPink">ADMISSION OPEN </span>
          <span className="text-primaryGreen">ADMISSION OPEN </span>
          <span className="text-primaryBlue">ADMISSION OPEN </span>
          <span className="text-primaryRed">ADMISSION OPEN </span>
          <span className="text-primaryPink">ADMISSION OPEN </span>
          <span className="text-primaryGreen">ADMISSION OPEN </span>
          <span className="text-primaryBlue">ADMISSION OPEN </span>
          <span className="text-primaryRed">ADMISSION OPEN </span>
          <span className="text-primaryPink">ADMISSION OPEN </span>
          <span className="text-primaryGreen">ADMISSION OPEN </span>
          <span className="text-primaryBlue">ADMISSION OPEN </span>
          <span className="text-primaryRed">ADMISSION OPEN </span>
          <span className="text-primaryPink">ADMISSION OPEN </span>
          <span className="text-primaryGreen">ADMISSION OPEN </span>
          <span className="text-primaryBlue">ADMISSION OPEN </span>
          <span className="text-primaryRed">ADMISSION OPEN </span>
          <span className="text-primaryPink">ADMISSION OPEN </span>
        </p>
        {text}
      </div>
    </div>
  );
};

export default RunningLine;
