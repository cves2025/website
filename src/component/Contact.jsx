import React from 'react'
import SchoolMap from './SchoolMap'
import QRCodeComponent from './QRCodeComponent'

function Contact() {

  return (
    <div className='flex flex-col lg:flex-row gap-4 p-4 bg-gray-100'>
      <div className='flex overflow-auto rounded-lg shadow-lg lg:w-1/2'>
        <SchoolMap />
      </div>
      {/* <div className='flex items-center justify-center lg:w-1/2'>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4 shadow-lg rounded-lg w-full'>
          <input type='text' placeholder='Name' className='w-full h-14 bg-white p-2'/>
          <input type='email' placeholder='Email' className='w-full h-14 bg-white p-2'/>
          <input type='tel' placeholder='Mobile No.' className='w-full h-14 bg-white p-2'/>
          <textarea placeholder='Message' className='w-full h-24 bg-white p-2'></textarea>
          <button type='submit' className='w-full h-10 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition duration-300 cursor-pointer'>Submit</button>
        </form> 
      </div> */}
      <div className='flex items-center justify-center lg:w-1/2 p-4 bg-white rounded-lg shadow-lg'>
        <QRCodeComponent />
      </div>
    </div>
  )
}

export default Contact