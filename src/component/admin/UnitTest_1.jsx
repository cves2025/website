import React, { useState, useEffect, useContext } from "react";
import { myContext } from "../context/MyContextProvider";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "./Breadcrumb.jsx";
import {
  nurserySubject,
  ukgSubject,
  selectClass,
  selectSkills,
  class_1_to_8,
} from "./subjectDefined.js";
import FillUnitTest1Marks from "./FillUnitTest1Result.jsx";

function UnitTest_1() {
  const { user } = useContext(myContext);
  const navigate = useNavigate();

  const [subject, setSubject] = useState([]);
  const [selectSubject, setSelectSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const [unitTest1Data, setUnitTest1Data] = useState([]);
  const [error, setError] = useState(null);

  const [radioButtonValue, setRadioButtonValue] = useState("");

  const subjectMap = {
    Nursery: nurserySubject,
    LKG: nurserySubject,
    UKG: ukgSubject,
    ...Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [String(i + 1), class_1_to_8])
    ),
  };

  const classSubjectHandler = (schoolClass) => {
    const subjects = subjectMap[schoolClass] || [];
    setSubject(subjects);
    setSelectedClass(schoolClass);
    setSelectSubject("");
  };

  const classSubjectFindHandler = async (event) => {
    event.preventDefault();
    console.log(selectedClass, selectSubject.split(" ")[0]);
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}api/unit_test_1_marks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          selectedClass,
          selectSubject: selectSubject.split(" ")[0],
        }),
      }
    );
    const data = await response.json();
    if (!data) {
      setError(data);
      return;
    }
    setUnitTest1Data(data);
    console.log(data);
  };

  useEffect(() => {
    if (!user) navigate("/login");
  }, []);

  return (
    <div className="px-4 py-6">
      <Breadcrumb testName="Unit Test-1" endLocation="Marks Fillings" />
      <div className="p-2 border-2 shadow-md">
<div className="">
        <p className="mb-2 font-semibold">Select one to fill marks</p>

        <div className="flex items-center mb-2">
          <input
            type="radio"
            id="exam"
            name="markType"
            value="exam"
            checked={radioButtonValue === "exam"}
            onChange={(e) => {
              setRadioButtonValue(e.target.value);
              setSubject([]);
              setSelectSubject("");
              setSelectedClass("");
              setUnitTest1Data([]);
            }}
          />
          <label htmlFor="exam" className="ml-2 pr-10">
            Exam Mark
          </label>

          <input
            type="radio"
            id="skills"
            name="markType"
            value="skills"
            checked={radioButtonValue === "skills"}
            onChange={(e) => {
              setRadioButtonValue(e.target.value);
              setSubject([]);
              setSelectSubject("");
              setSelectedClass("");
              setUnitTest1Data([]);
            }}
          />
          <label htmlFor="skills" className="ml-2">
            Skills
          </label>
        </div>
      </div>

      {radioButtonValue == "exam" && (
        <>
          {" "}
          <form
            onSubmit={classSubjectFindHandler}
            className="flex flex-col gap-4 p-4 bg-white shadow-md rounded-lg dark:bg-gray-900 sm:flex-row sm:items-center sm:gap-6"
          >
            {/* Class Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Class
              </label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
                value={selectedClass}
                required
                onChange={(e) => {
                  classSubjectHandler(e.target.value);
                  setUnitTest1Data([]);
                }}
              >
                <option value="" disabled>
                  Select
                </option>
                {selectClass.map((studentClass) => (
                  <option key={studentClass} value={studentClass}>
                    {studentClass}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject
              </label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
                value={selectSubject}
                required
                onChange={(event) => {
                  setSelectSubject(event.target.value);
                  setUnitTest1Data([]);
                }}
              >
                <option value="" disabled>
                  Select
                </option>
                {subject.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              Find
            </button>
          </form>
          <FillUnitTest1Marks
            students={unitTest1Data}
            selectSubject={selectSubject}
            selectedClass={selectedClass}
          />
        </>
      )}
      {/* skills radio button start */}
      {radioButtonValue == "skills" && (
        <>
          {" "}
          <form
            onSubmit={classSubjectFindHandler}
            className="flex flex-col gap-4 p-4 rounded-lg dark:bg-gray-900 sm:flex-row sm:items-center sm:gap-6"
          >
            {/* Class Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Class
              </label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
                value={selectedClass}
                required
                onChange={(e) => {
                  classSubjectHandler(e.target.value);
                  setUnitTest1Data([]);
                }}
              >
                <option value="" disabled>
                  Select
                </option>
                {selectClass.map((studentClass) => (
                  <option key={studentClass} value={studentClass}>
                    {studentClass}
                  </option>
                ))}
              </select>
            </div>

            {/* skills Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Skills
              </label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
                value={selectSubject}
                required
                onChange={(event) => {
                  setSelectSubject(event.target.value);
                  setUnitTest1Data([]);
                }}
              >
                <option value="" disabled>
                  Select
                </option>
                {selectSkills.map((skil) => (
                  <option key={skil} value={skil}>
                    {skil}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              Find
            </button>
          </form>
            { selectSubject == "Attendance" && 
              <p className="text-red-700">Attendance should be in this format: student attendance / Number or working days (Ex: 22/50)</p>
            }
          
          <FillUnitTest1Marks
            students={unitTest1Data}
            selectSubject={selectSubject}
            selectedClass={selectedClass}
          />
        </>
      )}
      </div>
      
    </div>
  );
}

export default UnitTest_1;
