import React from "react";
import Underline from "../design/Underline";

const sideImages = import.meta.glob(
  "/src/assets/image/scienceLabSidePic/*.{jpeg,png,jpg,webp}",
  { eager: true, import: "default" }
);
const scienceLabImages = import.meta.glob(
  "/src/assets/image/scienceLab/*.{jpeg,png,jpg,webp}",
  { eager: true, import: "default" }
);

function ScienceLab() {
  return (
    <div className="flex flex-col gap-y-4 mt-4 pb-4 bg-gradient-to-b from-blue-200 to-white">
      <div className="flex flex-col justify-center items-center mt-4">
        <p className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
          <span className="text-pink-500">Science Lab</span> Facilities
        </p>
        <Underline
          width="w-36"
          className="w-2/3 md:w-1/2 lg:w-60 mt-2 self-center"
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-y-8 lg:flex-row lg:gap-x-16 px-4 max-w-6xl mx-auto">
        {/* Image Container */}
        <div className="flex flex-col items-center justify-center lg:max-w-lg w-full">
          {Object.values(sideImages).map((src, index) => (
            <div key={index} className="w-full p-2 m-auto max-w-8xl">
              <img
                src={src}
                alt={`Gallery Image ${index}`}
                className="w-full h-auto rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 ease-in-out"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center justify-center gap-y-4 text-xl md:text-xl text-gray-700 leading-relaxed text-center lg:text-left p-4">
          <p>
            At Children's Valley English School, we believe that science is best
            learned through observation and experimentation. Our well-equipped
            Science Lab provides students with hands-on learning experiences
            that spark curiosity and deepen their understanding of scientific
            concepts.
          </p>
          <ul className="list-disc list-inside">
            <li>
              <strong>Well-Equipped Science Lab:</strong> Our science lab is
              furnished with modern apparatus, models, and tools for Physics,
              Chemistry, and Biology, ensuring safe and effective practical
              learning.
            </li>
            <li>
              <strong>Experiential Learning:</strong> Students actively
              participate in experiments and demonstrations that strengthen
              theoretical knowledge and encourage logical thinking, observation
              skills, and scientific inquiry.
            </li>
            <li>
              <strong>Safety & Scientific Temperament:</strong> Emphasis is
              placed on laboratory safety, proper handling of equipment, and
              developing a scientific attitude. Guided by experienced teachers,
              students gain confidence, curiosity, and a lifelong interest in
              science.
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-4 gap-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Photos</h1>
        {/* <div className="flex justify-center items-center text-center">
          {Object.values(scienceLabImages).map((src, index) => (
            <div
              key={index}
              className="w-full md:w-1/2 lg:w-1/3 p-2 m-auto max-w-sm"
            >
              <img
                src={src}
                alt={`Gallery Image ${index}`}
                className="w-full h-auto rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 ease-in-out"
                loading="lazy"
              />
            </div>
          ))}
        </div> */}
        <div className="flex flex-wrap p-4">
          {Object.values(scienceLabImages).map((src, index) => (
            <div
              key={index}
              className="w-full md:w-1/2 lg:w-1/3 p-2 m-auto max-w-sm"
            >
              <img
                src={src}
                alt={`Gallery Image ${index}`}
                className="w-full h-auto rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 ease-in-out"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center p-4 gap-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Videos</h1>

          {/* Embedded YouTube videos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            <iframe
              className="w-full aspect-video rounded-lg shadow-lg"
              src="https://www.youtube.com/embed/YiQf1ngUJqY?si=qGAbhd8l_8tGsjRU"
              title="Classical Dance Performance"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>

            <iframe
              className="w-full aspect-video rounded-lg shadow-lg"
              src="https://www.youtube.com/embed/o7nJUNdIiio?si=CW0t0HAUeo9IuadR  "
              title="Karate Training Session"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>

            <iframe
              className="w-full aspect-video rounded-lg shadow-lg"
              src="https://www.youtube.com/embed/ZMfgDNiTuKs?si=1if1nbWRBpvNA4Lx"
              title="Karate Training Session"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>

            {/* Add more iframe tags as needed */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScienceLab;
