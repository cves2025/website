import { useContext } from "react";
import Router from "./Router";
import Footer from "./Footer";

import Banner from "./Banner";
import Header from "./Header";
import Navbar2 from "./Navbar2";
import Navbar from "./Navbar";
import { useLocation } from "react-router-dom";
import { myContext } from "./context/MyContextProvider";

function Head() {
  const location = useLocation();
  const {user} = useContext(myContext);
  return (
    <div className="m-0.5">
      {location.pathname == "/" ? (
        <Banner />
      ) : (
        <div className="sticky top-0 z-50">
          <Header />
          {user ? <Navbar dynemicClass="bg-gray-100"/> : <Navbar2 dynemicClass="bg-gray-100"/>}
        </div>
      )}
      <Router />
      <Footer />
    </div>
  );
}

export default Head;
