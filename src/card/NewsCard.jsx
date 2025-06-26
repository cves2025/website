import React from 'react'

function NewsCard({ newsImage, newHeading, newText, newsDate }) {
  const date = new Date(newsDate);
  const options = { year: "numeric", month: "long", day: "numeric" };
  const formattedDate = date.toLocaleDateString("en-GB", options);

  return (
    <div className='flex flex-col items-start justify-center gap-y-4 mt-4 pr-4 lg:ml-20 lg:mr-20 bg-pink-200 border-l-4 border-pink-500 shadow-lg rounded-lg p-4'>
        <div className="flex gap-x-1 w-full">
        <div className="w-full flex items-center justify-center aspect-w-16 aspect-h-9">
          <img
            src={newsImage}
            alt="summer vacation"
            className="rounded-lg shadow-lg border h-36 w-32 object-cover md:h-48 md:w-48"
          />
        </div>
        <div className="flex flex-col items-start justify-center gap-y-1 w-full">
          <p className="font-bold text-sm lg:text-2xl">{newHeading}</p>
          <p className="text-sm lg:text-xl">{newText}</p>
          <p className="font-bold text-sm lg:text-xl">{formattedDate}</p>
        </div>
      </div>
    </div>
  )
}

export default NewsCard