import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { BsFillTelephoneForwardFill, BsFillHouseAddFill } from "react-icons/bs";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-8">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex flex-col items-start gap-y-2">
          <h2 className="text-xl font-bold mb-4">
            Children's Valley English School
          </h2>
          <p className="text-sm">
            Empowering students through education and innovation.
          </p>
          <p className="text-sm">
            {" "}
            <BsFillHouseAddFill className="inline mr-1" /> Address: D 59/295 A,
            Mahmoorganj Varanasi UP
          </p>
          <p className="text-sm">
            <BsFillTelephoneForwardFill className="inline mr-1" /> Phone: +91
            0542-2220107, +91 9336576690
          </p>
        </div>

        <div className="">
          <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
          <ul className="text-sm md:flex md:flex-wrap md:gap-x-10">
            <div>
              <li>
                <NavLink to="/" className="hover:underline">
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/gallery" className="hover:underline">
                  Gallery
                </NavLink>
              </li>
            </div>
            <div>
              <li>
                <NavLink to="/downloads" className="hover:underline">
                  Download
                </NavLink>
              </li>
              <li>
                <NavLink to="/admission" className="hover:underline">
                  Admission
                </NavLink>
              </li>
            </div>
            <div>
              <li>
                <NavLink to="/about" className="hover:underline">
                  About
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" className="hover:underline">
                  Contact
                </NavLink>
              </li>
            </div>
            <div>
              <li>
                <NavLink to="/payFee" className="hover:underline">
                  Pay Fee
                </NavLink>
              </li>
            </div>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Follow Us</h3>
          <div className="flex gap-4 text-2xl">
            <a
              target="_blank"
              href="https://www.facebook.com/cvesvaranasi"
              className="hover:text-blue-500"
            >
              <FaFacebook />
            </a>
            <a
              target="_blank"
              href="https://www.instagram.com/cves_varanasi/"
              className="hover:text-pink-500"
            >
              <FaInstagram />
            </a>
            <a
              target="_blank"
              href="https://www.youtube.com/@childrensvalleyenglishscho6699"
              className="hover:text-red-500"
            >
              <FaYoutube />
            </a>
          </div>
        </div>
      </div>

      <div className="text-center text-sm mt-8 border-t border-gray-700 pt-4">
        © {new Date().getFullYear()} Children's Valley English School. All
        rights reserved.
        <p>Developed and maintained by Rahul Sharma</p>
      </div>
    </footer>
  );
};

export default Footer;
