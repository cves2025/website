import Underline from "../design/Underline";
import SEO from "./SEO";

const sideImages = import.meta.glob<string>(
  "/src/assets/image/computerLabSideBar/*.{jpeg,png,jpg,webp}",
  { eager: true, import: "default" }
);
const computerLabImages = import.meta.glob<string>(
  "/src/assets/image/computerLab/*.{jpeg,png,jpg,webp}",
  { eager: true, import: "default" }
);

function ComputerLab() {
  return (
    <>
    <SEO
      title="Computer Lab Facility | Children's Valley English School Varanasi"
      description="Children's Valley English School in Varanasi provides a modern computer lab with updated systems to enhance digital learning and technical skills."
      />
    <div className="flex flex-col gap-y-4 mt-4 pb-4 bg-gradient-to-b from-blue-200 to-white">
      <div className="flex flex-col justify-center items-center mt-4">
        <p className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
          <span className="text-pink-500">Computer Lab</span> Facilities
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
            At Children's Valley English School, we believe in empowering
            students with strong digital skills alongside academic excellence.
            Our well-equipped Computer Lab provides a modern learning
            environment where students gain practical knowledge and confidence
            in technology.
          </p>
          <ul className="list-disc list-inside">
            <li>
              <strong>Modern Computer Lab:</strong> Our computer lab is equipped
              with updated systems, high-speed internet, and the latest
              educational software to support effective learning and hands-on
              practice.
            </li>
            <li>
              <strong>Practical Learning:</strong> Students learn computer
              fundamentals, typing skills, MS Office, internet usage, and basic
              programming concepts through structured and interactive sessions
              guided by trained faculty.
            </li>
            <li>
              <strong>Digital Awareness:</strong> Special focus is given to
              cyber safety, responsible internet use, and developing
              problem-solving skills. Through regular practice, students build
              technological confidence and are prepared for a digitally driven
              future.
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-4 gap-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Photos</h1>
        {/* <div className="flex justify-center items-center text-center">
          {Object.values(computerLabImages).map((src, index) => (
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
          {Object.values(computerLabImages).map((src, index) => (
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
    </>
  );
}

export default ComputerLab;
