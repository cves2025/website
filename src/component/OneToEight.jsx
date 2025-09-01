import React, { useState, useEffect } from "react";

function OneToEight({ resultData }) {
  const [studentProfileData, setStudentProfileData] = useState([]);
  const [studentMarksData, setStudentMarksData] = useState([]);

  console.log(resultData);

  const getHighlightClass = (subject) => {
  if (subject === "Percentage") return "text-green-800 font-bold";
//   if (subject === "attendance") return "text-blue-700 italic";
  return "";
};

  useEffect(() => {
    if (resultData) {
      setStudentProfileData(resultData.filteredStudent);
      setStudentMarksData(resultData.filteredMarks);
    }
  }, [resultData]);

  return (
    <>
      <div>
        <div className="flex flex-col">
          <div className="justify-center items-center text-center">
            <h1>Student Profile</h1>
          </div>
          {studentProfileData.map((student, index) => (
            <div key={index} className="flex flex-col w-1/2 p-2">
              <div className="flex flex-row justify-between">
                <p className="flex gap-x-3">
                  <span>Enrollment No.:</span>
                  <span>{student.enrollment_no}</span>
                </p>
                <p className="flex gap-x-3">
                  <span>Class: </span>
                  <span>{student.class}</span>
                </p>
              </div>
              <div className="flex flex-row justify-between">
                <p className="flex gap-x-3">
                  <span>Student Name:</span>
                  <span>{student.name}</span>
                </p>
                <p className="flex gap-x-3">
                  <span>Section:</span>
                  <span>{student.section}</span>
                </p>
              </div>
              <div className="flex flex-row justify-between">
                <p className="flex gap-x-3">
                  <span>Student Father Name:</span>
                  <span>{student.fatherName}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
        <table className="table-auto border justify-center items-center text-center w-full border-collapse">
          <thead className="divide-y divide-gray-300">
            <tr className="divide-x divide-gray-300">
              <th className="px-2 py-1"></th>
              <th colSpan={3}>Term-I</th>
              <th colSpan={3}>Term-II</th>
              <th>Grand Total</th>
            </tr>
            <tr className="divide-x divide-gray-300 font-bold">
              <th>Subject</th>
              <td>
                Unit Test-I
                <br />
                (30)
              </td>
              <td>
                Half Yearly
                <br />
                (70)
              </td>
              <td>
                Term-I Total
                <br />
                (100)
              </td>
              <td>
                Unit Test-II
                <br />
                (30)
              </td>
              <td>
                Annual Exam
                <br />
                (70)
              </td>
              <td>
                Term-II Total
                <br />
                (100)
              </td>
              <td>
                Term-I+II Total
                <br />
                (200)
              </td>
            </tr>
            {
                studentMarksData.length !== 0 ? studentMarksData.slice(0,10).map((marks, index)=>{
                    const highlightCell = getHighlightClass(marks.subject); 
                    return (
                    <tr key={index} className="divide-x divide-gray-300">
              <td className="font-bold">{marks.subject}</td>
              <td className={highlightCell}>{marks.unit_I}</td>
              <td className={highlightCell}>{marks.halfYearly}</td>
              <td className={highlightCell}>{marks.term_I}</td>
              <td className={highlightCell}>{marks.unit_II}</td>
              <td className={highlightCell}>{marks.annual}</td>
              <td className={highlightCell}>{marks.term_II}</td>
              <td className={highlightCell}>{marks.term_I_II}</td>
            </tr>
                )})
                : <tr>
                    <td colSpan={8} className="font-bold text-red-600">No Marks Found</td>
                </tr>
            }
            
          </thead>
        </table>
        <div className="mt-10">
          <table className="border w-full table-auto justify-center items-center text-center border-collapse">
            <thead className="divide-y divide-gray-300">
              <tr className="divide-x divide-y divide-gray-300">
                <th>Skill</th>
                <th>Term-I</th>
                <th>Term-II</th>
              </tr>
              {
                studentMarksData.slice(11).map((marks, index)=>(
                    <tr key={index} className="divide-x divide-y divide-gray-300">
                <td>{marks.subject}</td>
                <td colSpan={marks.subject == "Teacher Remark" ? 2 : 1}>{marks.subject == "Teacher Remark" ? marks.unit_I : marks.term_I}</td>
                <td className={`${marks.subject == "Teacher Remark" ? "hidden" : ""}`}>{marks.term_II}</td>
              </tr>
                ))
              }
              
            </thead>
          </table>
        </div>
        {studentProfileData.map((student, index) => (
          <div key={index} className="flex flex-col mt-5 p-2 gap-5">
            <div>Issue Date: {student.issueDate}</div>
            <div className="flex justify-between">
              <span>Place: Varanasi</span>
              <span>Class Teacher: {student.classTeacher}</span>
              <span>Principal</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default OneToEight;
