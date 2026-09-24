import { Routes, Route } from 'react-router-dom'
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
import Subject from './panel/students/Subject'
import ExamList from './panel/exams/ExamList'
import AddTeacher from './panel/AddTeacher'
import TeachersList from './panel/TeachersList'
import AdmitCard from './panel/exams/AdmitCard'
import ExamSchedule from './panel/exams/ExamSchedule'
import GeneratedAdmitCards from './panel/exams/GeneratedAdmitCards'
import ResultPanel from './panel/exams/result/ResultPanel'
import IdCardStudents from './panel/IdCardStudents'
import IdCardTeachers from './panel/IdCardTeachers'
import IdCardStaff from './panel/IdCardStaff'
import IdCardAdmin from './panel/IdCardAdmin'
import Dashboard from './admin/Dashboard'
import Student from './admin/Student';
import ExamDashboard from './admin/ExamDashboard';
import UnitTest_1 from './admin/UnitTest_1';
import ExamSettings from './admin/ExamSettings'
import Settings from './panel/settings/Settings'

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
        <Route path="/welcome" element={<Welcome />}>
          <Route index element={<PanelHome />} />
          <Route path="student/add" element={<AddStudent />} />
          <Route path="student/list" element={<StudentList />} />
          <Route path="student/subject" element={<Subject />} />
          <Route path="settings" element={<Settings />} />
          <Route path="exam/list" element={<ExamList />} />
          <Route path="teacher/add" element={<AddTeacher />} />
          <Route path="teacher/list" element={<TeachersList />} />
          <Route path="admit-card" element={<AdmitCard />} />
          <Route path="admit-card/schedule" element={<ExamSchedule />} />
          <Route path="admit-card/generated" element={<GeneratedAdmitCards />} />
          <Route path="result" element={<ResultPanel />} />
          <Route path="id-card/students" element={<IdCardStudents />} />
          <Route path="id-card/teachers" element={<IdCardTeachers />} />
          <Route path="id-card/staff" element={<IdCardStaff />} />
          <Route path="id-card/admin" element={<IdCardAdmin />} />
        </Route>
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