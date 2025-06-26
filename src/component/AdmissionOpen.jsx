import React, { useState } from "react";

const AdmissionOpen = () => {
  const [currentYear, setCurrentYear] = useState(() => {
    const date = new Date();
    return date.getFullYear();
  });

  return (
    <div className="h-[44vh]">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 shadow-lg mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">
          Admission Open {currentYear}-{(currentYear + 1).toString().slice(-2)}
        </h1>
        <p className="text-lg mb-6">
          Join us for an exciting academic year filled with learning,
          exploration, and growth. Apply now to secure your seat!
        </p>
        <button className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-gray-200 transition duration-300">
          Apply Now
        </button>
      </div>
    </div>
  );
};

export default AdmissionOpen;
