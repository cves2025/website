import React, { useState } from "react";

const Carousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + images.length) % images.length
    );
  };

  return (
    <div className="relative w-full md:h-[40rem] h-[386px] border-black border">
      <div className=" w-full h-full  overflow-hidden relative rounded-sm ">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-transform transform ${
              index === currentIndex ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <img
              src={image}
              alt={`Slide ${index}`}
              className="w-full h-full  object-cover "
            />
          </div>
        ))}
      </div>
      <div className="">
        <div className="absolute top-[50%] left-2">
          <button
            className=" rounded-lg opacity-70 hover:text-black duration-300 bg-gray-800 text-white p-2 "
            onClick={prevSlide}
          >
            Prev
          </button>
        </div>
        <div className="absolute top-[50%] right-2">
          <button
            className="rounded-lg opacity-70 hover:text-black duration-300 bg-gray-800 text-white p-2"
            onClick={nextSlide}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Carousel;
