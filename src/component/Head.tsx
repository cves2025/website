import { useContext } from "react";
import Router from "./Router";
import Footer from "./Footer";

import Banner from "./Banner";
import Header from "./Header";
import Navbar2 from "./Navbar2";
import { useLocation } from "react-router-dom";
import { myContext } from "./context/MyContextProvider";

function Head() {
  const location = useLocation();
  const { user } = useContext(myContext);
  const isHomePage = location.pathname === "/";
  const isPanelPage = location.pathname.startsWith("/welcome");
  const isAuthPage = location.pathname === "/login";

  /*
   * The public menu (Navbar2) is for the visitors of the website, i.e. only
   * BEFORE somebody logs in:
   *  - once a user is logged in the menu is not shown (the panel has its own
   *    sidebar and the site is only browsed publicly by visitors),
   *  - the login screen has its own full-page design, so the menu is not shown
   *    there either,
   *  - the panel (/welcome) brings its own sidebar layout.
   */
  const showPublicNavbar = !user;

  if (isPanelPage || isAuthPage) {
    return (
      <div className="m-0.5">
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
          {showPublicNavbar && <Navbar2 dynemicClass="bg-gray-100" />}
        </div>
      )}
      <Router />
      <Footer />
    </div>
  );
}

export default Head;
