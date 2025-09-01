import React, { useEffect, useState } from 'react'
import Accordian from '../design/Accordian'
import Underline from '../design/Underline'

function Downloads() {
  const pdfModules = import.meta.glob('/src/assets/syllabus/*.pdf', { eager: true });
  const timeTablesPdfModules = import.meta.glob('/src/assets/timeTable/*.pdf', { eager: true });
  // const data = '../assets/result.csv';
  const [openIndex, setOpenIndex] = React.useState(null);

  const accordians = [
    { title: 'Syllabus 2025-26', fileModules: pdfModules },
    { title: 'Time Table 2025-26', fileModules: timeTablesPdfModules },
  ];


  return (
    <div className="max-w-xl mx-auto mt-8">
        <p className='text-xl md:text-3xl font-bold'><span className='text-pink-500'>Downloads</span> Sections</p>
        <Underline />
      {accordians.map((item, idx) => (
        <Accordian
          key={idx}
          fileModules={item.fileModules}
          title={item.title}
          open={openIndex === idx}
          onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
        />
      ))}
    </div>
  )
}

export default Downloads