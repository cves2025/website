import React, { useState, useEffect } from "react";

function ShowNurLKGUnitTestResult({ whichClass, resultData, unitTest1Date }) {
  const [studentProfileData, setStudentProfileData] = useState([]);
  const [studentMarksData, setStudentMarksData] = useState([]);
  const [date, setDate] = useState("");
  const [whichClassData, setWhichClassData] = useState([]);

  const attendRemarkRank = {};

  const allSubjects = [
    { name: "English" },
    { name: "Math" },
    { name: "Hindi" },
  ];
  const gradeSubjects = [
    { name: "Drawing" },
    { name: "Conversation" },
    { name: "Karate" },
  ];

  const calculateTotal = () => {
    if (studentMarksData.length == 0) {
      return;
    } else {
      return studentMarksData[0].subjects.reduce(
        (sum, item) => sum + (item.marks.written || 0) + (item.marks.oral || 0),
        0
      );
    }
  };

  const calculatePercentage = () => {
    const total = calculateTotal();
    const maxMarks = allSubjects.length * 30;
    const percentage = ((total / maxMarks) * 100).toFixed(2);
    if (percentage == "NaN") return "---";
    return percentage;
  };

  useEffect(() => {
    if (resultData) {
      console.log(resultData);
      console.log(resultData.unitTest1Marks);
      setStudentProfileData(resultData);
      resultData.unitTest1Marks == undefined
        ? setStudentMarksData([])
        : setStudentMarksData(resultData.unitTest1Marks);
      unitTest1Date.unitTest1 === undefined ? setDate("---") : setDate(new Date(unitTest1Date.unitTest1).toLocaleDateString("en-IN"))
    }
  }, [resultData]);

  return (
    <>
      <div>
        <div className="flex flex-col">
          <div className="justify-center items-center text-center">
            <h1>Student Profile</h1>
          </div>
          <div className="flex flex-col w-1/2 p-2">
            <div className="flex flex-row justify-between">
              <p className="flex gap-x-3">
                <span>Enrollment No.:</span>
                <span>{studentProfileData.enrollment}</span>
              </p>
              <p className="flex gap-x-3">
                <span>Class: </span>
                <span>{studentProfileData.class}</span>
              </p>
            </div>
            <div className="flex flex-row justify-between">
              <p className="flex gap-x-3">
                <span>Student Name:</span>
                <span>{studentProfileData.name}</span>
              </p>
              <p className="flex gap-x-3">
                <span>Section:</span>
                <span>{studentProfileData.section}</span>
              </p>
            </div>
            <div className="flex flex-row justify-between">
              <p className="flex gap-x-3">
                <span>Student Father Name:</span>
                <span>{studentProfileData.fatherName}</span>
              </p>
            </div>
          </div>
        </div>
        <table className="table-auto border justify-center items-center text-center w-full border-collapse">
          <thead className="divide-y divide-x divide-gray-300">
            <tr className="divide-x divide-gray-300">
              <th colSpan={3}>Term-I</th>
            </tr>
            <tr className="divide-x divide-gray-300 font-bold">
              <th colSpan={2}>Subject</th>
              <th>Unit Test-I (30)</th>
            </tr>
            {allSubjects.map((subject, index) => {
              const marks =
                studentMarksData.length !== 0 ? (
                  studentMarksData[0].subjects.find(
                    (m) => m.name == subject.name
                  ) || {}
                ) : (
                  <tr>
                    <th className="text-red-600 font-bold">
                      Your Marks not filled, Please contact to principal!
                    </th>
                  </tr>
                );

              return (
                <React.Fragment key={`written-${subject.name}`}>
                  <tr>
                    <td rowSpan={2} className="border border-gray-300">
                      {subject.name}
                    </td>
                    <td className="border border-gray-300">Written</td>
                    <td className="border border-gray-300">
                      {marks.marks?.written ?? "---"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300">Oral</td>
                    <td className="border border-gray-300">
                      {marks.marks?.oral ?? "---"}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="divide-x divide-gray-300 font-bold">
              <td colSpan={2} className="border border-gray-300">
                Total
              </td>
              <td className="border border-gray-300">
                {calculateTotal()} / 90
              </td>
            </tr>
            <tr className="divide-x divide-gray-300 font-bold text-green-700">
              <td colSpan={2} className="border border-gray-300">
                Percentage
              </td>
              <td className="border border-gray-300">
                {calculatePercentage()}%
              </td>
            </tr>
          </thead>
        </table>
        <div className="mt-10">
          <table className="border w-full table-auto justify-center items-center text-center border-collapse">
            <thead className="divide-y divide-gray-300">
              <tr className="divide-x divide-gray-300 font-bold">
                <th>Skills</th>
                <th>Grade</th>
              </tr>
              {gradeSubjects.map((subject, index) => {
                const gradeMarks =
                  studentMarksData.length !== 0
                    ? studentMarksData[0].subjects.find(
                        (m) => m.name == subject.name
                      ) || {}
                    : "";
                return (
                  <React.Fragment key={`grade-${subject.name}`}>
                    <tr>
                      <td className="border border-gray-300">{subject.name}</td>
                      <td className="border border-gray-300">
                        {gradeMarks.marks?.grade ?? "---"}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </thead>
          </table>
        </div>
        <div className="flex flex-col mt-5 p-2 gap-2 border">
          <div className="flex w-full flex-row">
            <div className="text-left w-1/2">
              Attendance:{" "}
              {studentMarksData.length !== 0 &&
              Array.isArray(studentMarksData[0].subjects)
                ? studentMarksData[0].subjects.find(
                    (m) => m.name === "Attendance"
                  )?.marks.grade ?? "---"
                : "---"}{" "}
              (Days)
            </div>
            {studentMarksData.length !== 0 &&
              Array.isArray(studentMarksData[0].subjects) &&
              studentMarksData[0].subjects.find((m) => m.name === "Rank")?.marks
                ?.grade && (
                <div className="text-left text-green-600 font-bold">
                  Rank:{" "}
                  {
                    studentMarksData[0].subjects.find((m) => m.name === "Rank")
                      ?.marks.grade
                  }
                </div>
              )}
          </div>
          <div>
            Teacher's Remark:{" "}
            <span className="text-blue-600 font-bold">
              {" "}
              {studentMarksData.length !== 0 &&
              Array.isArray(studentMarksData[0].subjects)
                ? studentMarksData[0].subjects.find((m) => m.name === "Remark")
                    ?.marks.grade ?? "---"
                : "---"}
            </span>
          </div>
        </div>
        <div className="flex flex-col mt-2 p-2 gap-5">
          <div>Date: {date}</div>
          <div className="flex justify-between">
            <span>Place: Varanasi</span>
            <span>Class Teacher: </span>
            <span>Principal</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default ShowNurLKGUnitTestResult;
