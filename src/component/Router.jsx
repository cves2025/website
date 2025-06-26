import React from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './ScrollToTop'
import Home from './Home'
import Gallery from './Gallery'
import About from './About'
import Contact from './Contact'
import Downloads from './Downloads'
import ComputerLab from './ComputerLab'
import Sports from './Sports'
import AdmissionOpen from './AdmissionOpen'
import PayFee from './PayFee'

function Router() {
  return (
    <>
      <ScrollToTop />
    <Routes>
      <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/admission" element={<AdmissionOpen />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/payFee" element={<PayFee />} />
        <Route path="/facilities/Computer-Lab" element={<ComputerLab />} />
        <Route path="/facilities/Sports" element={<Sports />} />
      </Routes>
    </>
  )
}

export default Router