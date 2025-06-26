import React from "react";
import Underline from "../design/Underline";

const sportsImages = import.meta.glob(
  "/src/assets/image/sports/*.{jpeg,png,jpg,webp}",
  { eager: true, import: "default" }
);
const gamesImages = import.meta.glob(
  "/src/assets/image/games/*.{jpeg,png,jpg,webp}",
  { eager: true, import: "default" }
);

function Sports() {
  return (
    <div className="flex flex-col gap-y-4 mt-4 pb-4 bg-gradient-to-b from-blue-200 to-white">
      <div className="flex flex-col justify-center items-center mt-4">
        <p className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
          <span className="text-pink-500">Sports</span> Facilities
        </p>
        <Underline
          width="w-20"
          className="w-2/3 md:w-1/2 lg:w-60 mt-2 self-center"
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-y-8 lg:flex-row lg:gap-x-16 px-4 max-w-6xl mx-auto">
        {/* Image Container */}
        <div className="flex flex-col items-center justify-center lg:max-w-lg w-full">
          {Object.values(sportsImages).map((src, index) => (
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
        <div className="flex flex-col items-center justify-center gap-y-4 lg:w-1/2 text-xl md:text-xl text-gray-700 leading-relaxed text-center lg:text-left p-4">
          <p>
            At Sun Shine Noble School, we believe in nurturing not only the
            minds but also the bodies and spirits of our students. Our diverse
            range of sports and wellness activities ensures holistic development
            and encourages students to lead active, healthy lives.
          </p>
          <ul className="list-disc list-inside">
            <li>
              <strong>Karate:</strong> Our professionally conducted karate
              classes help students develop discipline, focus, self-confidence,
              and self-defense skills. Regular training sessions and belt
              certification programs foster both mental and physical strength.
            </li>
            <li>
              <strong>Dance:</strong> Dance is a joyful expression of creativity
              and rhythm. With experienced instructors, students explore various
              dance forms that enhance their coordination, flexibility, and
              confidence—all while having fun!
            </li>
            <li>
              <strong>Yoga:</strong> Our yoga sessions are designed to promote
              mindfulness, inner peace, and physical fitness. Students learn
              breathing techniques, posture control, and relaxation methods that
              contribute to their overall well-being and stress management. At
              Sun Shine Noble School, we are committed to providing an
              environment where every child can discover their talents, build
              resilience, and grow into well-rounded individuals.
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-4 gap-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Photos</h1>
        <div className="flex justify-center items-center text-center">
          Photos Added Soon
        </div>
        <div className="flex flex-wrap p-4">
          {Object.values(gamesImages).map((src, index) => (
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
              src="https://www.youtube.com/embed/u5C-qtWmWT0"
              title="Classical Dance Performance"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>

            <iframe
              className="w-full aspect-video rounded-lg shadow-lg"
              src="https://www.youtube.com/embed/DFIGFL9Otvg"
              title="Karate Training Session"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>

            <iframe
              className="w-full aspect-video rounded-lg shadow-lg"
              src="https://www.youtube.com/embed/DTT9klp8Pqo"
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

export default Sports;
