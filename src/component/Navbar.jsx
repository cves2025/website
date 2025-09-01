import React, {useContext} from "react";
import { BsList, BsX } from "react-icons/bs";
import { NavLink } from "react-router-dom";
import { myContext } from "./context/MyContextProvider";



function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const {user, logout} = useContext(myContext);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const linkClasses = ({ isActive }) =>
  `block w-full h-5 px-2 rounded hover:bg-amber-600
   ${isActive ? 'bg-amber-700' : 'bg-gray-800'}`;

  return (
    <nav className="bg-gray-900 sticky top-0 z-20">
      <div className="flex justify-center items-center">
        <div className="hidden text-white font-bold text-xl gap-5 md:flex z-40">
          <NavLink className={({isActive}) => isActive ? "p-2 hover:bg-amber-600 rounded-2xl bg-amber-700" : "p-2 hover:bg-amber-600 rounded-2xl"} to="/dashboard">Dashboard</NavLink>
          <NavLink className={({isActive}) => isActive ? "p-2 hover:bg-amber-600 rounded-2xl bg-amber-700" : "p-2 hover:bg-amber-600 rounded-2xl"} to="/student">Student</NavLink>
          <NavLink className={({isActive}) => isActive ? "p-2 hover:bg-amber-600 rounded-2xl bg-amber-700" : "p-2 hover:bg-amber-600 rounded-2xl"} to="/examDashboard">Exam</NavLink>
          <NavLink onClick={()=> logout()} className="p-2" >Logout</NavLink>
          <label>{console.log(user)}</label>
        </div>
        <div className={`flex absolute top-0 right-0 flex-col text-white font-bold text-xl p-2 md:hidden z-50`}>
            <div className="flex self-end z-50"><span className="cursor-pointer" onClick={()=> toggleMenu()}>{isMenuOpen ? <BsX /> : <BsList />}</span></div>
            {isMenuOpen && (
                <div className="flex flex-col self-start items-center gap-1 bg-transparent">
                    <NavLink className={linkClasses} to="/dashboard" onClick={()=> setIsMenuOpen(false)}>Dashboard</NavLink>
                    <NavLink className={linkClasses} to="/student" onClick={()=> setIsMenuOpen(false)}>Student</NavLink>
                    <NavLink className={linkClasses} to="/examDashboard" onClick={()=> setIsMenuOpen(false)}>Exam</NavLink>
                    <NavLink className={linkClasses} onClick={()=> {setIsMenuOpen(false); logout()}}>Logout</NavLink>
                </div>
            )}
        </div>
      </div>
      {/* <Header /> */}
    </nav>
  );
}

export default Navbar;
