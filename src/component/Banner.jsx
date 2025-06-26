import React, { useState, useEffect, useRef } from "react";
import Navbar2 from "./Navbar2";
import Header from "./Header";
import banner1 from "../assets/image/banner/1.jpg";
import banner2 from "../assets/image/banner/2.jpg";
import banner3 from "../assets/image/banner/3.jpg";
import banner4 from "../assets/image/banner/4.jpg";
import banner5 from "../assets/image/banner/5.jpg";
import banner6 from "../assets/image/banner/6.jpg";
import banner7 from "../assets/image/banner/7.jpg";
import banner8 from "../assets/image/banner/8.jpg";

const banners = [
  {
    img: banner1,
    title: "Learn. Grow. Lead.",
    description:
      "We cultivate a learning environment where every child is encouraged to grow intellectually and lead with confidence.",
  },
  {
    img: banner2,
    title: "ADMISSION OPEN",
    description: "Your Journey to Success Begins Here",
  },
  {
    img: banner3,
    title: "Excellence Today, Success Tomorrow",
    description: "Empowering Education for a Brighter Future",
  },
  {
    img: banner4,
    title: "Nurturing Brilliance Through Knowledge",
    description: "Future-Ready Education Starts Here",
  },
  {
    img: banner5,
    title: "Learn Today, Lead Tomorrow",
    description: "The Launchpad for Greatness",
  },
  {
    img: banner6,
    title: "Unlocking Potential, Inspiring Futures",
    description: "Preparing Students for a World of Possibilities",
  },
  {
    img: banner7,
    title: "Educating Hearts and Minds",
    description: "Your Journey to Success Starts Here",
  },
  {
    img: banner8,
    title: "Excellence in Education, Strong in Community",
    description: "A Community of Learners, A Family of Friends",
  },
];

// Clone images for infinite scroll illusion
const extendedBanners = [...banners, ...banners];

function Banner() {
  const [scrollNav, setScrollNav] = useState(false);
  const [index, setIndex] = useState(0);
  const sliderRef = useRef(null);
  const total = banners.length;
  const [currentYear, setCurrentYear] = useState(() => {
    const date = new Date();
    return date.getFullYear();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => prevIndex + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;

    // Apply smooth transition
    if (index <= total) {
      slider.style.transition = "transform 0.5s ease-in-out";
    }

    // Shift the slider
    slider.style.transform = `translateX(-${index * 100}%)`;

    // When reaching the duplicated end, reset to beginning without transition
    if (index === total) {
      setTimeout(() => {
        slider.style.transition = "none";
        slider.style.transform = `translateX(0%)`;
        setIndex(0);
      }, 500); // Must match the transition duration
    }
  }, [index, total]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrollNav(true);
      } else {
        setScrollNav(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <div className="relative overflow-hidden lg:w-full">
        <div ref={sliderRef} className="flex w-full">
          {extendedBanners.map((banner, i) => (
            <div key={i} className="relative flex-shrink-0 w-full h-screen">
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black opacity-50"></div>

              {/* Image */}
              <img
                src={banner.img}
                alt={banner.name}
                className="w-full h-screen object-cover"
              />

              {/* Text Overlay */}
              <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4 ">
                <div className="flex flex-col justify-center items-center text-center w-full mt-8 overflow-hidden">
                  <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 mb-4 flex flex-col gap-y-4">
                    {banner.title !== "ADMISSION OPEN" ? (
                      banner.title
                    ) : (
                      <>
                        {banner.title}
                        <span className="block sm:inline">
                          {currentYear}-{(currentYear + 1).toString().slice(-2)}
                        </span>
                      </>
                    )}
                  </h1>

                  <p className="text-2xl md:text-4xl">{banner.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col text-white text-center">
          <div className="flex w-full md:justify-center md:items-center">
            {/* Make Header sticky */}
            <div className="fixed w-full top-0 z-50">
              <Header />
              <div
                className={`w-full z-50 md:flex md:justify-center md:items-center transition-colors duration-300 ${
                  scrollNav ? "bg-gray-100" : "bg-transparent"
                }`}
              >
                <Navbar2 />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Banner;
