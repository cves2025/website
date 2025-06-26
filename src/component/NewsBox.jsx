import React from "react";
import Underline from "../design/Underline";
import NewsCard from "../card/NewsCard";
import latestNewsData from "../assets/JSON/latestNews.json";
 
function NewsBox() {
  return (
    <div className="flex flex-col gap-y-4 mt-4 pb-4 bg-gradient-to-b from-blue-200 to-white">
      <div className="flex flex-col justify-center items-center mt-4">
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
          <span className="text-pink-600">Latest</span> News
        </h1>
        <Underline width="w-20" className="md:w-32" />
      </div>
      {latestNewsData.map((news, index) => (
        <NewsCard
          key={index}
          newsDate={news.newsDate}
          newHeading={news.newsHeading}
          newText={news.newsText}
          newsImage={news.newsImageUrl}
        />
      ))}
    </div>
  );
}

export default NewsBox;
