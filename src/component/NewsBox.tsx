import { useEffect, useState } from "react";
import Underline from "../design/Underline";
import NewsCard from "../card/NewsCard";
import schoolLogo from "../assets/image/schoolLogo.jpg";
import { subscribeNews, type NewsItem } from "../utils/newsService";

/** Latest News of the Home page: the published news, managed in Settings > News. */
function NewsBox() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(
    () =>
      subscribeNews({ publishedOnly: true }, setNews, (error) =>
        console.error("Failed to load the latest news:", error)
      ),
    []
  );

  // Nothing published (or still loading): hide the whole section.
  if (news.length === 0) return null;

  return (
    <div className="flex flex-col gap-y-4 mt-4 pb-4 bg-gradient-to-b from-blue-200 to-white">
      <div className="flex flex-col justify-center items-center mt-4">
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
          <span className="text-pink-600">Latest</span> News
        </h1>
        <Underline width="w-20" className="md:w-32" />
      </div>
      {news.map((item) => (
        <NewsCard
          key={item.id}
          newsDate={item.newsDate}
          newHeading={item.heading}
          newText={item.text}
          newsImage={item.imageUrl || schoolLogo}
          isLogo={!item.imageUrl}
        />
      ))}
    </div>
  );
}

export default NewsBox;
