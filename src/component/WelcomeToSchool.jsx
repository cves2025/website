import React from "react";
import schoolBuilding from "../assets/image/schoolImage.jpg";
import Underline from "../design/Underline";

function WelcomeToSchool() {
  return (
    <div className="flex flex-col items-center justify-center gap-y-8 mt-8 pb-8 bg-gradient-to-b from-blue-200 to-white overflow-hidden">
      {/* Title Section */}
      <div className="flex flex-col justify-center items-center mt-4 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
          <span className="text-pink-600">Welcome To</span> Children's Valley English School
        </h1>
        {/* Adjusted Underline for better visual alignment and responsiveness */}
        <Underline className="w-2/3 md:w-1/2 lg:w-1/3 mt-2 self-center" />
      </div>

      {/* Content Section */}
      <div className="flex flex-col items-center justify-center gap-y-8 lg:flex-row lg:gap-x-16 px-4 mx-auto">
        {/* Image Container */}
        <div className="flex items-center justify-center w-full max-w-md lg:max-w-xl md:max-w-2xl">
          <img
            src={schoolBuilding}
            alt="School Building"
            className="rounded-xl shadow-2xl border-4 border-white transform hover:scale-105 transition-transform duration-300 ease-in-out"
          />
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center justify-center gap-y-4 lg:w-1/2 text-xl md:text-xl text-gray-700 leading-relaxed text-center lg:text-left p-4">
          <p className="mb-2">
            At Children's Valley English School, we are dedicated to nurturing young minds and shaping bright futures. Our school offers a safe, inspiring, and inclusive environment where every child is encouraged to explore, learn, and grow.
          </p>
          <p>
            English Language & Literature Mathematics General Science Social Studies Environmental Awareness Information Technology We regularly assess student progress with formative and summative evaluations, ensuring personalized support and improvement plans.
          </p>
          <p>
            Our Mission To deliver high-quality education with a focus on knowledge, skills, and values. To cultivate critical thinking, innovation, and a lifelong love for learning. To promote holistic development through academics, sports, arts, and community engagement. To nurture respect, integrity, and empathy among students, staff, and parents.
          </p>
        </div>
      </div>
    </div>
  );
}

export default WelcomeToSchool;