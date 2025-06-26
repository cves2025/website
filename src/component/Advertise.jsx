import React from 'react'

function Advertise() {
  return (
    <div className="w-full sticky top-0 z-50">
        <div className="bg-gray-300 p-4 text-center text-2xl font-bold text-red-500">
            <h1 className='animate-blink'>ADMISSION OPEN 2025-26</h1>
        </div>
        <marquee direction="left" className="bg-yellow-400 text-black py-2 text-2xl font-semibold mt-2">
          Hurry up! <span className='text-red-500 font-bold'>Admission Open</span> Limited seats available. Call now for the new session +91 9336065547.
        </marquee>
    </div>
  )
}

export default Advertise