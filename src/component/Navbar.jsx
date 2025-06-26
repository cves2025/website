import React from "react";
import { BsList, BsX } from "react-icons/bs";
import { NavLink } from "react-router-dom";
import schoolLogo from "../assets/image/schoolLogo.jpg"
import Header from "./Header";



function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const linkClasses = ({ isActive }) =>
  `block w-full h-10 px-5 rounded hover:bg-amber-600
   ${isActive ? 'bg-amber-700' : 'bg-gray-800'}`;

  return (
    <nav className="bg-gray-900 sticky top-0 z-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <img
            src={schoolLogo}
            alt="School Logo"
            className="h-16 w-16 rounded-ful"
          />
          <h1 className="text-white text-3xl font-bold ml-4 hidden lg:flex">Sun Shine Noble School</h1>
        </div>
        <div className="hidden text-white font-bold text-2xl gap-10 md:flex z-40">
          <NavLink className={({isActive}) => isActive ? "p-5 hover:bg-amber-600 rounded-2xl bg-amber-700" : "p-5 hover:bg-amber-600 rounded-2xl"} to="/">Home</NavLink>
          <NavLink className={({isActive}) => isActive ? "p-5 hover:bg-amber-600 rounded-2xl bg-amber-700" : "p-5 hover:bg-amber-600 rounded-2xl"} to="/gallery">Gallery</NavLink>
          <NavLink className={({isActive}) => isActive ? "p-5 hover:bg-amber-600 rounded-2xl bg-amber-700" : "p-5 hover:bg-amber-600 rounded-2xl"} to="/downloads">Downloads</NavLink>
          <NavLink className={({isActive}) => isActive ? "p-5 hover:bg-amber-600 rounded-2xl bg-amber-700" : "p-5 hover:bg-amber-600 rounded-2xl"} to="/about">About</NavLink>
          <NavLink className={({isActive}) => isActive ? "p-5 hover:bg-amber-600 rounded-2xl bg-amber-700" : "p-5 hover:bg-amber-600 rounded-2xl"} to="/contact">Contact</NavLink>
        </div>
        <div className={`flex absolute top-0 right-0 flex-col text-white font-bold text-2xl p-4 md:hidden z-50`}>
            <div className="flex self-end z-50"><span className="cursor-pointer" onClick={()=> toggleMenu()}>{isMenuOpen ? <BsX /> : <BsList />}</span></div>
            {isMenuOpen && (
                <div className="flex flex-col self-start items-center gap-1 bg-transparent">
                    <NavLink className={linkClasses} to="/" onClick={()=> setIsMenuOpen(false)}>Home</NavLink>
                    <NavLink className={linkClasses} to="/gallery" onClick={()=> setIsMenuOpen(false)}>Gallery</NavLink>
                    <NavLink className={linkClasses} to="/downloads" onClick={()=> setIsMenuOpen(false)}>Downloads</NavLink>
                    <NavLink className={linkClasses} to="/about" onClick={()=> setIsMenuOpen(false)}>About</NavLink>
                    <NavLink className={linkClasses} to="/contact" onClick={()=> setIsMenuOpen(false)}>Contact</NavLink>
                </div>
            )}
        </div>
      </div>
      {/* <Header /> */}
    </nav>
  );
}

export default Navbar;
