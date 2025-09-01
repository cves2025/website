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
import Result from './Result'
import Login from './Login'
import Signup from './Signup'
import Dashboard from './admin/Dashboard'
import Student from './admin/Student';
import ExamDashboard from './admin/ExamDashboard';
import UnitTest_1 from './admin/UnitTest_1';
import ExamSettings from './admin/ExamSettings'

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
        <Route path="/download/result" element={<Result />} />
        <Route path="/login" element={<Login />} />
        <Route path='/signup' element={<Signup />}/>
        <Route path='/dashboard' element={<Dashboard />}/>
        <Route path='/student' element={<Student />}/>
        <Route path='/examDashboard' element={<ExamDashboard />} />
        <Route path='/unitTest_1' element={<UnitTest_1 />} />
        <Route path='/examDashboard/examSettings' element={<ExamSettings />} />
      </Routes>
    </>
  )
}

export default Router