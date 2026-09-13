import { useState, useEffect, Fragment } from "react";
import {
  StudentResultData,
  SubjectMark,
  UnitTest1MarksRow,
} from "./marksTypes";

interface ShowNurLKGUnitTestResultProps {
  whichClass?: string;
  resultData: StudentResultData | null;
  unitTest1Date: { unitTest1?: string } | string | null;
}

const EMPTY_STUDENT: StudentResultData = { class: "" };

function ShowNurLKGUnitTestResult({
  resultData,
  unitTest1Date,
}: ShowNurLKGUnitTestResultProps) {
  const [studentProfileData, setStudentProfileData] =
    useState<StudentResultData>(EMPTY_STUDENT);
  const [studentMarksData, setStudentMarksData] = useState<UnitTest1MarksRow[]>(
    []
  );
  const [date, setDate] = useState("");

  const allSubjects: { name: string }[] = [
    { name: "English" },
    { name: "Math" },
    { name: "Hindi" },
  ];
  const gradeSubjects: { name: string }[] = [
    { name: "Drawing" },
    { name: "Conversation" },
    { name: "Karate" },
  ];

  const calculateTotal = (): number | undefined => {
    if (studentMarksData.length === 0) {
      return undefined;
    }
    return (
      studentMarksData[0].subjects?.reduce(
        (sum: number, item: SubjectMark) =>
          sum + (item.marks?.written || 0) + (item.marks?.oral || 0),
        0
      ) || 0
    );
  };

  const calculatePercentage = (): string => {
    const total = calculateTotal();
    if (total === undefined) return "---";
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
      const dateValue =
        typeof unitTest1Date === "object" && unitTest1Date !== null
          ? unitTest1Date.unitTest1
          : undefined;
      dateValue === undefined
        ? setDate("---")
        : setDate(new Date(dateValue).toLocaleDateString("en-IN"));
    }
  }, [resultData, unitTest1Date]);

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
            {allSubjects.map((subject) => {
              const marks =
                studentMarksData.length !== 0
                  ? studentMarksData[0].subjects?.find(
                      (m) => m.name == subject.name
                    ) || {}
                  : {};

              return (
                <Fragment key={`written-${subject.name}`}>
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
                </Fragment>
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
              {gradeSubjects.map((subject) => {
                const gradeMarks =
                  studentMarksData.length !== 0
                    ? studentMarksData[0].subjects?.find(
                        (m) => m.name == subject.name
                      ) || {}
                    : {};
                return (
                  <Fragment key={`grade-${subject.name}`}>
                    <tr>
                      <td className="border border-gray-300">{subject.name}</td>
                      <td className="border border-gray-300">
                        {gradeMarks.marks?.grade ?? "---"}
                      </td>
                    </tr>
                  </Fragment>
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
                  )?.marks?.grade ?? "---"
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
                      ?.marks?.grade
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
                    ?.marks?.grade ?? "---"
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
