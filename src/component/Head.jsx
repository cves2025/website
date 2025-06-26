import React from "react";
import Navbar from "./Navbar";
import Router from "./Router";
import Footer from "./Footer";
// import Advertise from "./Advertise";
import Banner from "./Banner";
import Header from "./Header";
import Navbar2 from "./Navbar2";
import { useLocation } from "react-router-dom";

function Head() {
  // const date = new Date();
  // const currentMonth = date.toLocaleString("default", { month: "long" });
  // const month = ["August", "September", "October", "November", "December"];
  const location = useLocation();

  return (
    <div className="m-0.5">
      {location.pathname == "/" ? (
        <Banner />
      ) : (
        <>
          <Header />
          <Navbar2 dynemicClass="bg-gray-100 top-[144px]"/>
        </>
      )}
      {/* <Header /> 
      <Navbar2 /> */}
      {/* <Navbar /> */}
      {/* <Banner /> */}
      {/* {!month.includes(currentMonth) && <Advertise />} */}
      <Router />
      <Footer />
    </div>
  );
}

export default Head;
