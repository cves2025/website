import React from "react";
import WelcomeToSchool from "./WelcomeToSchool.jsx";
import NewsBox from "./NewsBox.jsx";
// import UpcomingEvent from "./UpcomingEvent.jsx";
import Facilities from "./Facilities.jsx";
import SEO from "./SEO.jsx";

function Home() {
  return (
    <>
    <SEO
        title="Best CBSE School in Varanasi | Children's valley English School"
        description="Children's valley English School is one of the best CBSE schools in Varanasi offering quality education, modern facilities, and excellent faculty."
      />
      {/* <Banner /> */}
      <WelcomeToSchool />
      <NewsBox />
      {/* <UpcomingEvent /> */}
      <Facilities />
    </>
  );
}

export default Home;
