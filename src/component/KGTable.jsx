import React, { useState, useEffect } from "react";

function KGTable({ whichClass, resultData }) {
  const [studentProfileData, setStudentProfileData] = useState([]);
  const [studentMarksData, setStudentMarksData] = useState([]);
  const [whichClassData, setWhichClassData] = useState([]);

  const getHighlightClass = (subject) => {
    if (subject === "Percentage") return "text-green-800 font-bold";
    if (subject === "Total") return "text-blue-800 font-bold";
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
              <th colSpan={2} className="px-2 py-1"></th>
              <th colSpan={3}>Term-I</th>
              <th colSpan={3}>Term-II</th>
              <th>Grand Total</th>
            </tr>
            <tr className="divide-x divide-gray-300 font-bold">
              <th colSpan={2}>Subject</th>

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
            {studentMarksData.length !== 0 ? (
              (whichClass === "UKG"
                ? studentMarksData.slice(0, 10)
                : studentMarksData.slice(0, 8)
              ).map((mark, index) => {
                const highlightCell = getHighlightClass(mark.subject);
                return (
                  <tr key={index} className="divide-x divide-gray-300">
                    {mark.subject && (
                      <td
                        rowSpan={
                          mark.subject === "Percentage" ||
                          mark.subject === "Total" ||
                          mark.subject === "Science" ||
                          mark.subject === "Computer"
                            ? 1
                            : 2
                        }
                        colSpan={
                          mark.subject === "Percentage" ||
                          mark.subject === "Total" ||
                          mark.subject === "Science" ||
                          mark.subject === "Computer"
                            ? 2
                            : 1
                        }
                        className="font-bold"
                      >
                        {mark.subject}
                      </td>
                    )}
                    <td
                      className={`${
                        mark.subject === "Percentage" ||
                        mark.subject === "Total" ||
                        mark.subject === "Science" ||
                        mark.subject === "Computer"
                          ? "hidden"
                          : "font-bold"
                      }`}
                    >
                      {mark.examType}
                    </td>
                    <td
                      className={`${highlightCell} ${
                        mark.unit_I == "AB" ? "text-red-600 font-bold" : ""
                      }`}
                    >
                      {mark.unit_I}
                    </td>
                    <td
                      className={`${highlightCell} ${
                        mark.halfYearly == "AB" ? "text-red-600 font-bold" : ""
                      }`}
                    >
                      {mark.halfYearly}
                    </td>
                    <td
                      className={`${highlightCell} ${
                        mark.term_I == "AB" ? "text-red-600 font-bold" : ""
                      }`}
                    >
                      {mark.term_I}
                    </td>
                    <td
                      className={`${highlightCell} ${
                        mark.unit_II == "AB" ? "text-red-600 font-bold" : ""
                      }`}
                    >
                      {mark.unit_II}
                    </td>
                    <td
                      className={`${highlightCell} ${
                        mark.annual == "AB" ? "text-red-600 font-bold" : ""
                      }`}
                    >
                      {mark.annual}
                    </td>
                    <td
                      className={`${highlightCell} ${
                        mark.term_II == "AB" ? "text-red-600 font-bold" : ""
                      }`}
                    >
                      {mark.term_II}
                    </td>
                    <td
                      className={`${highlightCell} ${
                        mark.term_I_II == "AB" ? "text-red-600 font-bold" : ""
                      }`}
                    >
                      {mark.term_I_II}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="font-bold text-red-600">
                  No Marks Found
                </td>
              </tr>
            )}
            
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
                (whichClass === "UKG"
                ? studentMarksData.slice(10)
                : studentMarksData.slice(8)
              ).map((marks, index)=>(
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
            <div>Date: {student.issueDate}</div>
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

export default KGTable;
