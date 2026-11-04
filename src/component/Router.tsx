import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './ScrollToTop'
import Home from './Home'
import Gallery from './Gallery'
import About from './About'
import Contact from './Contact'
import Downloads from './Downloads'
import ComputerLab from './ComputerLab'
import ScienceLab from './ScienceLab'
import Sports from './Sports'
import AdmissionOpen from './AdmissionOpen'
import PayFee from './PayFee'
import Result from './Result'
import Login from './Login'
import Welcome from './Welcome'
import PanelHome from './panel/PanelHome'
import AddStudent from './panel/students/AddStudent'
import StudentList from './panel/students/StudentList'
import StudentPromote from './panel/students/StudentPromote'
import StudentView from './panel/students/StudentView'
import Subject from './panel/students/Subject'
import ExamList from './panel/exams/ExamList'
import AddTeacher from './panel/teacher/AddTeacher'
import AdmitCard from './panel/exams/AdmitCard'
import ExamSchedule from './panel/exams/ExamSchedule'
import GeneratedAdmitCards from './panel/exams/GeneratedAdmitCards'
import ResultPanel from './panel/exams/result/ResultPanel'
import ExamSettings from './panel/exams/exam-settings/ExamSettings'
import AdmitCardTemplate from './panel/exams/exam-settings/AdmitCardTemplate'
import ResultTemplate from './panel/exams/exam-settings/ResultTemplate'

import ExamMarks from './panel/marks/ExamMarks'
import CrossList from './panel/marks/CrossList'
import IdCardStudents from './panel/IdCardStudents'
import IdCardTeachers from './panel/IdCardTeachers'
import IdCardStaff from './panel/IdCardStaff'
import IdCardAdmin from './panel/IdCardAdmin'
import Settings from './panel/settings/Settings'
import Permissions from './panel/settings/permissions/Permissions'
import Profile from './panel/settings/profile/Profile'
import News from './panel/settings/news/News'
import GalleryManager from './panel/settings/gallery/GalleryManager'
import DownloadsManager from './panel/settings/downloads/DownloadsManager'
import HomeBannerManager from './panel/settings/banner/HomeBannerManager'
import DeskSlip from './panel/exams/desk-slip/DeskSlip'
import RequireAccess from '../routes/RequireAccess'
import RequireRoutePermission from '../routes/RequireRoutePermission'
import GeneratedResultCards from './panel/exams/GeneratedResultCards'
import MarkAttendance from './panel/attendance/MarkAttendance'
import AttendanceReport from './panel/attendance/AttendanceReport'
import HolidayCalendar from './panel/attendance/HolidayCalendar'
import FeeStructure from './panel/fees/FeeStructure'
import CollectFee from './panel/fees/CollectFee'
import FeeReceipt from './panel/fees/FeeReceipt'
import FeeSettings from './panel/fees/FeeSettings'

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
        <Route path="/pay-fee" element={<PayFee />} />
        <Route path="/facilities/computer-lab" element={<ComputerLab />} />
        <Route path="/facilities/science-lab" element={<ScienceLab />} />
        <Route path="/facilities/sports" element={<Sports />} />
        <Route path="/download/result" element={<Result />} />
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAccess />}>
        <Route path="/welcome" element={<Welcome />}>
        <Route element={<RequireRoutePermission />}>
          <Route index element={<PanelHome />} />
          <Route path="student/add" element={<AddStudent />} />
          <Route path="student/list" element={<StudentList />} />
          <Route path="student/view" element={<StudentView />} />
          <Route path="student/promote" element={<StudentPromote />} />
          <Route path="student/subject" element={<Subject />} />
          <Route path="attendance/mark" element={<MarkAttendance />} />
          <Route path="attendance/report" element={<AttendanceReport />} />
          <Route path="attendance/holidays" element={<HolidayCalendar />} />
          <Route path="fees/collect" element={<CollectFee />} />
          <Route path="fees/receipt" element={<FeeReceipt />} />
          <Route path="fees/structure" element={<FeeStructure />} />
          <Route path="fees/settings" element={<FeeSettings />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/permissions" element={<Permissions />} />
          <Route path="settings/profile" element={<Profile />} />
          <Route path="settings/news" element={<News />} />
          <Route path="settings/gallery" element={<GalleryManager />} />
          <Route path="settings/downloads" element={<DownloadsManager />} />
          <Route path="settings/banner" element={<HomeBannerManager />} />
          <Route path="exam/list" element={<ExamList />} />
          <Route path="teacher/add" element={<AddTeacher />} />
          {/* The teachers list lives on Add Teacher; old links land there. */}
          <Route path="teacher/list" element={<Navigate to="/welcome/teacher/add" replace />} />
          <Route path="admit-card" element={<AdmitCard />} />
          <Route path="desk-slip" element={<DeskSlip />} />
          <Route path="admit-card/schedule" element={<ExamSchedule />} />
          <Route path="admit-card/generated" element={<GeneratedAdmitCards />} />
          <Route path="result-card/generated" element={<GeneratedResultCards />} />
          <Route path="result" element={<ResultPanel />} />
          <Route path="exam-settings" element={<ExamSettings />} />
          <Route path="exam-settings/admit-card-template" element={<AdmitCardTemplate />} />
          <Route path="exam-settings/result-template" element={<ResultTemplate />} />
          <Route path="marks" element={<ExamMarks />} />
          <Route path="cross-list" element={<CrossList />} />
          <Route path="id-card/students" element={<IdCardStudents />} />
          <Route path="id-card/teachers" element={<IdCardTeachers />} />
          <Route path="id-card/staff" element={<IdCardStaff />} />
          <Route path="id-card/admin" element={<IdCardAdmin />} />
        </Route>
        </Route>
        </Route>
      </Routes>
    </>
  )
}

export default Router