import WelcomeToSchool from "./WelcomeToSchool";
import NewsBox from "./NewsBox";
// import UpcomingEvent from "./UpcomingEvent";
import Facilities from "./Facilities";
import SEO from "./SEO";

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
