import Router from "./Router";
import Footer from "./Footer";

import Banner from "./Banner";
import Header from "./Header";
import Navbar2 from "./Navbar2";
import { useLocation } from "react-router-dom";

function Head() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isPanelPage = location.pathname.startsWith("/welcome");
  const isAuthPage = location.pathname === "/login";

  if (isPanelPage) {
    return (
      <div className="m-0.5">
        <Router />
      </div>
    );
  }

  if (isAuthPage) {
    return (
      <div className="m-0.5">
        <Navbar2 dynemicClass="bg-gray-100" />
        <Router />
      </div>
    );
  }

  return (
    <div className="m-0.5">
      {isHomePage ? (
        <Banner />
      ) : (
        <div className="sticky top-0 z-50">
          <Header />
          <Navbar2 dynemicClass="bg-gray-100" />
        </div>
      )}
      <Router />
      <Footer />
    </div>
  );
}

export default Head;
