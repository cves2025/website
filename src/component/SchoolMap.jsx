// src/components/SchoolMap.jsx
import React from "react";
import schoolMap from "../assets/image/schoolMap.png"; // Assuming you have a school map image

const SchoolMap = () => {

  return (
    <div className="w-full flex justify-center py-8">
      {/* Tailwind for centering and padding */}
      <div className="w-11/12">
        <img src={schoolMap} alt="School Map" className="w-full h-auto" />
      </div>
    </div>
  );
};

export default SchoolMap;
