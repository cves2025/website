import { MapPin, Navigation, Phone } from "lucide-react";
import { SCHOOL_CONTACT } from "../constants";

const { ADDRESS, PHONE, LAT, LNG } = SCHOOL_CONTACT;
const EMBED_URL = `https://maps.google.com/maps?q=${LAT},${LNG}&z=17&output=embed`;
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${LAT},${LNG}`;

const SchoolMap = () => {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <iframe
        title="Children's Valley English School location"
        src={EMBED_URL}
        className="h-80 w-full flex-1 border-0 lg:min-h-[420px]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3 text-gray-700">
          <p className="flex gap-2">
            <MapPin className="mt-0.5 shrink-0 text-red-500" size={20} />
            <span>{ADDRESS}</span>
          </p>
          <a href={`tel:${PHONE}`} className="flex items-center gap-2 font-semibold hover:text-blue-600">
            <Phone className="shrink-0 text-green-600" size={20} />
            {PHONE}
          </a>
        </div>

        <a
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-green-500 px-5 py-3 font-semibold text-white shadow-md transition duration-300 hover:bg-green-600"
        >
          <Navigation size={18} />
          Get Directions
        </a>
      </div>
    </div>
  );
};

export default SchoolMap;
