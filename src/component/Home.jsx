import React from "react";
import WelcomeToSchool from "./WelcomeToSchool.jsx";
import NewsBox from "./NewsBox.jsx";
import UpcomingEvent from "./UpcomingEvent.jsx";
import Facilities from "./Facilities.jsx";

function Home() {
  return (
    <>
      {/* <Banner /> */}
      <WelcomeToSchool />
      <NewsBox />
      <UpcomingEvent />
      <Facilities />
    </>
  );
}

export default Home;
