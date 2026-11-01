import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import Navbar2 from "./Navbar2";
import Header from "./Header";
import { generateAcademicYears } from "../utils/generateAcademicYears";
import { LEGACY_BANNER_SLIDES } from "../utils/legacyBanner";
import {
  DEFAULT_INTERVAL_SECONDS,
  bannerImageClasses,
  subscribeHomeBanner,
  type BannerFit,
  type BannerPosition,
  type HomeBanner,
} from "../utils/homeBannerService";

interface BannerItem {
  key: string;
  img: string;
  title: string;
  description: string;
  showSession: boolean;
  fit: BannerFit;
  position: BannerPosition;
}

const CURRENT_SESSION = generateAcademicYears()[0]?.value ?? "";

/** Matches the CSS transition below. */
const SLIDE_MS = 500;

/** Smallest finger movement (px) that counts as a swipe. */
const SWIPE_PX = 40;

/**
 * Full-screen slider at the top of the public site. The slides come from
 * Settings > Home Banner; until the slides bundled with the code are
 * imported there, they are shown whenever no saved slide is. Arrows and
 * swipes move it by hand; it also moves on its own every `intervalSeconds`.
 */
function Banner() {
  const [scrollNav, setScrollNav] = useState(false);
  // undefined = still loading; null = never saved (bundled slides).
  const [banner, setBanner] = useState<HomeBanner | null | undefined>();

  useEffect(
    () =>
      subscribeHomeBanner(setBanner, (error) => {
        console.error("Failed to load the banner:", error);
        setBanner(null);
      }),
    []
  );

  const slides = useMemo<BannerItem[]>(() => {
    if (banner === undefined) return [];
    const shown = banner?.slides.filter((slide) => slide.isPublished) ?? [];
    // Until the bundled slides are imported, they stand in whenever no saved
    // slide is shown (nothing saved yet, or every saved slide hidden/deleted).
    if (shown.length === 0 && !banner?.legacyImported) {
      return LEGACY_BANNER_SLIDES.map((slide, i) => ({
        key: `bundled-${i}`,
        ...slide,
        fit: "cover" as const,
        position: "center" as const,
      }));
    }
    return shown.map((slide) => ({
        key: slide.id,
        img: slide.imageUrl,
        title: slide.title,
        description: slide.description,
        showSession: slide.showSession,
        fit: slide.fit,
        position: slide.position,
      }));
  }, [banner]);

  const intervalSeconds = banner?.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS;
  const total = slides.length;
  const canSlide = total > 1;

  // The track is [last, ...slides, first]; `pos` 1..total are the real
  // slides. Reaching a copy at either end jumps to its real slide without
  // animation, so the slider loops both ways.
  const track = canSlide ? [slides[total - 1], ...slides, slides[0]] : slides;
  const [pos, setPos] = useState(1);
  const [animate, setAnimate] = useState(true);
  // Bumped on every manual move, so the timer restarts from zero.
  const [manualMoves, setManualMoves] = useState(0);

  useEffect(() => {
    setAnimate(false);
    setPos(canSlide ? 1 : 0);
  }, [total, canSlide]);

  const go = useCallback(
    (delta: 1 | -1) => {
      setAnimate(true);
      // Ignore moves while sitting on a copy, until the jump has happened.
      setPos((current) =>
        current <= 0 || current >= total + 1 ? current : current + delta
      );
    },
    [total]
  );

  const goByHand = (delta: 1 | -1) => {
    go(delta);
    setManualMoves((value) => value + 1);
  };

  useEffect(() => {
    if (!canSlide || (pos !== 0 && pos !== total + 1)) return;
    const timer = setTimeout(() => {
      setAnimate(false);
      setPos(pos === 0 ? total : 1);
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [pos, total, canSlide]);

  useEffect(() => {
    if (!canSlide) return;
    const timer = setInterval(() => go(1), intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [canSlide, intervalSeconds, go, manualMoves]);

  const touchStartX = useRef<number | null>(null);

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
      <div className="relative overflow-hidden lg:w-full bg-gray-900">
        <div
          className="flex w-full"
          style={{
            transform: `translateX(-${pos * 100}%)`,
            transition: animate ? `transform ${SLIDE_MS}ms ease-in-out` : "none",
          }}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            const end = event.changedTouches[0]?.clientX;
            if (!canSlide || start === null || end === undefined) return;
            const distance = end - start;
            if (Math.abs(distance) >= SWIPE_PX) goByHand(distance < 0 ? 1 : -1);
          }}
        >
          {track.length === 0 && <div className="h-screen w-full flex-shrink-0" />}
          {track.map((slide, i) => (
            <div key={`${slide.key}-${i}`} className="relative flex-shrink-0 w-full h-screen">
              {/* "Whole photo": a blurred copy fills the space around it */}
              {slide.fit === "contain" && (
                <img
                  src={slide.img}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
                  draggable={false}
                />
              )}

              {/* Image */}
              <img
                src={slide.img}
                alt={slide.title}
                className={`relative w-full h-screen ${bannerImageClasses(slide.fit, slide.position)}`}
                draggable={false}
              />

              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black opacity-50"></div>

              {/* Text Overlay */}
              <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4 ">
                <div className="flex flex-col justify-center items-center text-center w-full mt-8 overflow-hidden">
                  <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 mb-4 flex flex-col gap-y-4">
                    {slide.title}
                    {slide.showSession && CURRENT_SESSION && (
                      <span className="block sm:inline">{CURRENT_SESSION}</span>
                    )}
                  </h1>

                  <p className="text-2xl md:text-4xl">{slide.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {canSlide && (
          <>
            <button
              type="button"
              onClick={() => goByHand(-1)}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-xl text-white transition-colors hover:bg-black/60 md:left-6 md:h-12 md:w-12"
            >
              <BsChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => goByHand(1)}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-xl text-white transition-colors hover:bg-black/60 md:right-6 md:h-12 md:w-12"
            >
              <BsChevronRight />
            </button>
          </>
        )}

        {/* Lets clicks and swipes reach the slider; only the header takes them. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col text-white text-center">
          <div className="flex w-full md:justify-center md:items-center">
            {/* Make Header sticky */}
            <div className="pointer-events-auto fixed w-full top-0 z-50">
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
