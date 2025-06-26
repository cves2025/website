// src/components/Underline.jsx
import React from "react";

const Underline = ({ color = "bg-blue-500", width = "w-50", height = "h-2", className = "" }) => {
  return (
    <div className={`${width} ${height} ${color} ${className} -skew-x-24 bg-gradient-to-r from-amber-600 to-yellow-300`} />
  );
};

export default Underline;
