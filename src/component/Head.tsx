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

  // Panel & auth pages use their OWN layout (sidebar for /welcome, bare screen for
  // login/signup). Here the public site header/footer are intentionally NOT shown.
  const isBarePage =
    location.pathname.startsWith("/welcome") ||
    location.pathname === "/login" ||
    location.pathname === "/signup";

  if (isBarePage) {
    return (
      <div className="m-0.5">
        <Router />
      </div>
    );
  }

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
