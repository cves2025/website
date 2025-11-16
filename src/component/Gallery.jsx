import { useState, useEffect } from "react";
import Underline from "../design/Underline";

function Gallery() {
  // const [allImages, setAllImages] = useState(firebaseStorageImageData);
  // const [filteredImages, setFilteredImages] = useState([]);
  // const [activeButton, setActiveButton] = useState("All");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  // const [loading, setLoading] = useState(true); // Loading state
  const [images, setImages] = useState([]);

  useEffect(() => {
    const imageModules = import.meta.glob(
      "../assets/image/gallery/*.{png,jpg,jpeg,svg,gif}",
      {
        eager: true,
        query: "?url",
        import: "default",
      }
    );

    const loadedImages = Object.keys(imageModules).map((path) => {
      return {
        src: imageModules[path],
        alt: `Image from gallery ${path.split("/").pop()}`,
      };
    });

    setImages(loadedImages);
  }, []);

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedImage(null);
      setIsClosing(false);
    }, 100);
  };

  return (
    <>
      <div className="px-4">
        {/* Heading */}
        <div className="flex flex-col justify-center items-center mt-4">
          <p className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
            <span className="text-pink-500">School</span> Gallery
          </p>
          <Underline className="w-2/3 md:w-1/2 lg:w-60 mt-2 self-center" />
        </div>

        {/* Gallery Grid */}
        <div className="mt-4 m-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 place-items-center">
            {images.map((img, i) => (
              <div
                key={i}
                className="cursor-pointer"
                onClick={() => setSelectedImage(img.src)}
              >
                <img
                  src={img.src}
                  alt={`Gallery ${i}`}
                  className="w-full h-auto rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 ease-in-out"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Modal for Zoomed Image */}
        {selectedImage && (
          <div
            className={`fixed inset-0 flex items-center justify-center bg-black z-50 transition-opacity duration-300 ease-in-out ${
              isClosing ? "animate-fadeOut" : "animate-fadeIn"
            }`}
            onClick={handleCloseModal}
          >
            <div className="relative p-4 transform scale-90 transition-transform duration-300 ease-out animate-zoomIn">
              <img
                src={selectedImage}
                alt="Zoomed"
                className="w-auto max-w-full h-auto max-h-[80vh] rounded-lg shadow-2xl"
              />
              <button
                className="absolute top-4 right-4 bg-red-600 text-white rounded-full px-3 py-1 text-lg"
                onClick={() => setSelectedImage(null)}
              >
                ✖
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Gallery;
