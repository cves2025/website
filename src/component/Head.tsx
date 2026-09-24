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

  /*
   * The public menu (Navbar2) is always shown, whether the user is logged in
   * or not, so the public site stays browsable by anyone at any time:
   *  - the login screen has its own full-page design, so the menu is not shown
   *    there either,
   *  - the panel (/welcome) brings its own sidebar layout.
   */

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
          <Navbar2 dynemicClass="bg-gray-100" />
        </div>
      )}
      <Router />
      <Footer />
    </div>
  );
}

export default Head;
