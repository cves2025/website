import React from 'react'
import Underline from '../design/Underline'

function UpcomingEvent() {
  return (
    <div className="flex flex-col gap-y-4 mt-4 pb-4 bg-gradient-to-b from-blue-200 to-white">
      <div className="flex flex-col justify-center items-center mt-4">
        <p className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight"><span className='text-pink-500'>Upcoming</span> Events</p>
        <Underline className="w-2/3 md:w-1/2 lg:w-60 mt-2 self-center" />
      </div>
      <h1 className='text-lg md:text-xl font-semibold m-auto'>No Upcoming Events</h1>
    </div>
  )
}

export default UpcomingEvent