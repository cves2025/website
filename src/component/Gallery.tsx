import { useState, useEffect, useMemo } from "react";
import Underline from "../design/Underline";
import SEO from "./SEO";
import {
  subscribeGallery,
  subscribeGalleryImported,
  type GalleryPhoto,
} from "../utils/galleryService";
import { LEGACY_GALLERY_PHOTOS } from "../utils/legacyGallery";

interface GalleryImage {
  key: string;
  src: string;
  caption: string;
}

/**
 * The photos published on Settings > Gallery, newest first. Until the
 * photos bundled with the code have been imported there, they are shown
 * after the uploaded ones.
 */
function Gallery() {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  // null = not known yet; a failed read counts as "not imported".
  const [imported, setImported] = useState<boolean | null>(null);

  useEffect(() => {
    const stopPhotos = subscribeGallery({ publishedOnly: true }, setPhotos, (error) => {
      console.error("Failed to load the gallery:", error);
      setPhotos([]);
    });
    const stopImported = subscribeGalleryImported(setImported, (error) => {
      console.error("Failed to read the gallery import status:", error);
      setImported(false);
    });
    return () => {
      stopPhotos();
      stopImported();
    };
  }, []);

  const images = useMemo<GalleryImage[]>(() => {
    if (photos === null || imported === null) return [];
    return [
      ...photos.map((photo) => ({
        key: photo.id,
        src: photo.imageUrl,
        caption: photo.caption,
      })),
      ...(imported
        ? []
        : LEGACY_GALLERY_PHOTOS.map((photo) => ({
            key: `bundled-${photo.name}`,
            src: photo.url,
            caption: "",
          }))),
    ];
  }, [photos, imported]);

  const loading = photos === null || imported === null;

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedImage(null);
      setIsClosing(false);
    }, 100);
  };

  return (
    <>
    <SEO
      title="School Gallery | Children's Valley English School Varanasi"
      description="Explore the gallery of Children's Valley English School in Varanasi showcasing campus, events, activities, and student life."
      />
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
          {loading && (
            <p className="py-10 text-center text-gray-500">Loading photos...</p>
          )}
          {!loading && images.length === 0 && (
            <p className="py-10 text-center text-gray-500">
              Photos will be added soon.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 place-items-center">
            {images.map((img, i) => (
              <div
                key={img.key}
                className="cursor-pointer"
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img.src}
                  alt={img.caption || `Gallery ${i + 1}`}
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
                src={selectedImage.src}
                alt={selectedImage.caption || "Zoomed"}
                className="w-auto max-w-full h-auto max-h-[80vh] rounded-lg shadow-2xl"
              />
              {selectedImage.caption && (
                <p className="mt-3 text-center text-base font-semibold text-white">
                  {selectedImage.caption}
                </p>
              )}
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
