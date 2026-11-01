/**
 * The Home banner slides bundled with the website code. They are shown until
 * they have been imported into Firestore once per environment
 * (Settings > Home Banner > Import current slides).
 *
 * TODO: remove this file and assets/image/banner once the slides are
 * imported in both the dev and the prod environment.
 */
import banner1 from "../assets/image/banner/1.jpg";
import banner2 from "../assets/image/banner/2.jpg";
import banner3 from "../assets/image/banner/3.jpg";
import banner4 from "../assets/image/banner/4.jpg";
import banner5 from "../assets/image/banner/5.jpg";
import banner6 from "../assets/image/banner/6.jpg";
import banner7 from "../assets/image/banner/7.jpg";
import banner8 from "../assets/image/banner/8.jpg";

export interface LegacyBannerSlide {
  img: string;
  title: string;
  description: string;
  /** Show the current session after the title (e.g. "ADMISSION OPEN 2026-27"). */
  showSession: boolean;
}

export const LEGACY_BANNER_SLIDES: LegacyBannerSlide[] = [
  {
    img: banner1,
    title: "Learn. Grow. Lead.",
    description:
      "We cultivate a learning environment where every child is encouraged to grow intellectually and lead with confidence.",
    showSession: false,
  },
  {
    img: banner2,
    title: "ADMISSION OPEN",
    description: "Your Journey to Success Begins Here",
    showSession: true,
  },
  {
    img: banner3,
    title: "Excellence Today, Success Tomorrow",
    description: "Empowering Education for a Brighter Future",
    showSession: false,
  },
  {
    img: banner4,
    title: "Nurturing Brilliance Through Knowledge",
    description: "Future-Ready Education Starts Here",
    showSession: false,
  },
  {
    img: banner5,
    title: "Learn Today, Lead Tomorrow",
    description: "The Launchpad for Greatness",
    showSession: false,
  },
  {
    img: banner6,
    title: "Unlocking Potential, Inspiring Futures",
    description: "Preparing Students for a World of Possibilities",
    showSession: false,
  },
  {
    img: banner7,
    title: "Educating Hearts and Minds",
    description: "Your Journey to Success Starts Here",
    showSession: false,
  },
  {
    img: banner8,
    title: "Excellence in Education, Strong in Community",
    description: "A Community of Learners, A Family of Friends",
    showSession: false,
  },
];
