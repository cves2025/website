import React from 'react'

function GallerySkeleton() {
  return (
    <div className='flex flex-wrap w-full justify-center items-center gap-2'>
        <div className='bg-gray-500 rounded-lg  w-xl h-48 animate-pulse'></div>
        <div className='bg-gray-500 rounded-lg  w-xl h-48 animate-pulse'></div>
        <div className='bg-gray-500 rounded-lg  w-xl h-48 animate-pulse'></div>
    </div>
  )
}

export default GallerySkeleton;