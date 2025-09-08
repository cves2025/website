import React, { useState, useEffect, useContext } from "react";
import Breadcrumb from "./Breadcrumb";
import { myContext } from "../context/MyContextProvider";
import { useNavigate } from "react-router-dom";

function ExamSettings() {
  const { user } = useContext(myContext);
  const navigate = useNavigate();

  const [radioButtonValue, setRadioButtonValue] = useState("");
  const [showExamTypeDate, setShowExamTypeDate] = useState(false);
  const [unitTest1Date, setUnitTest1Date] = useState("");
  const [halfYearlyDate, setHalfYearlyDate] = useState("");
  const [unitTest2Date, setUnitTest2Date] = useState("");
  const [annualDate, setAnnualDate] = useState("");
  // if radio button clicked then tag would be true
  const [resultDateReceived, setResultDateReceived] = useState(false);
  // set message for all type exam
  const [message, setMessage] = useState({
    unitTest1Message: "",
    unitTest2Message: "",
    halfYearlyMessage: "",
    annualMessage: "",
  });
  // set error for all type exam
  const [error, setError] = useState({
    unitTest1Error: "",
    unitTest2Error: "",
    halfYearlyError: "",
    annualError: "",
  });

  const setErrorMessageEmpty = () => {
    setError({
      unitTest1Error: "",
      unitTest2Error: "",
      halfYearlyError: "",
      annualError: "",
    });
    setMessage({
      unitTest1Error: "",
      unitTest2Error: "",
      halfYearlyError: "",
      annualError: "",
    });
  };

  const dateAddHandler = async (examType, examDate) => {
    // set all error and messages empty
    // setErrorMessageEmpty();

    // hide error meassage
    setTimeout(() => {
      setErrorMessageEmpty();
    }, 5000);

    // dynemically set error
    if (examDate === "") {
      const errorKey =
        examType === "unitTest1"
          ? "unitTest1Error"
          : examType === "unitTest2"
          ? "unitTest2Error"
          : examType === "halfYearly"
          ? "halfYearlyError"
          : "annualError";

      setError((prev) => ({ ...prev, [errorKey]: "Please select a date" }));
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}exam-setting`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          examType,
          examDate,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      const messageKey =
  examType === "unitTest1"
    ? "unitTest1Message"
    : examType === "unitTest2"
    ? "unitTest2Message"
    : examType == "halfYearly"
    ? "halfYearlyMessage"
    : "annualMessage";
      setMessage((prev) => ({ ...prev, [messageKey]: data.message }));
      
      setUnitTest1Date(data.data.unitTest1.split("T")[0]);
      setUnitTest2Date(data.data.unitTest2.split("T")[0]);
      setHalfYearlyDate(data.data.halfYearly.split("T")[0]);
      setAnnualDate(data.data.annual.split("T")[0]);
      setResultDateReceived(true);
    } catch (error) {
      setError(error);
    }
  };

  const getDateHandler = async () =>{
    if(resultDateReceived) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}api/get-result-date`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      const data = await response.json();
      if(data.error) {console.log(data.error); return;}
      setUnitTest1Date(data.data.unitTest1.split("T")[0]);
      setUnitTest2Date(data.data.unitTest2.split("T")[0]);
      setHalfYearlyDate(data.data.halfYearly.split("T")[0]);
      setAnnualDate(data.data.annual.split("T")[0]);
      setResultDateReceived(true);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (user) {
      user.role !== "admin" ? navigate("/examDashboard") : "";
    } else {
      navigate("/login");
    }
  }, []);

  return (
    <div className="px-4 py-6">
      <Breadcrumb testName="Exam" endLocation="Exam Settings" />
      <div className="">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => setShowExamTypeDate((prev) => !prev)}
        >
          Set Result Date
        </button>
        {showExamTypeDate && (
          <div className="flex flex-col ml-10 gap-2">
            {/* unit test - 1 start */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="radio"
                  id="unitTest-1"
                  value="unitTest-1"
                  checked={radioButtonValue === "unitTest-1"}
                  onChange={(event) => {setRadioButtonValue(event.target.value); getDateHandler();}}
                />
                <label htmlFor="unitTest-1">Unit Test-1</label>
              </div>
              {radioButtonValue === "unitTest-1" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 ml-10">
                    <input
                      type="date"
                      value={unitTest1Date}
                      required
                      onChange={(event) => setUnitTest1Date(event.target.value)}
                      maxLength={10}
                      className="border border-black px-2 py-1"
                    />
                    <button
                      className="bg-blue-800 text-white p-1 rounded-sm"
                      onClick={() => dateAddHandler("unitTest1", unitTest1Date)}
                    >
                      Add
                    </button>
                  </div>
                  {error.unitTest1Error ? (
                    <div className="font-bold text-red-600">
                      {error.unitTest1Error}
                    </div>
                  ) : message.unitTest1Message ? (
                    <div className="font-bold text-green-600">
                      {message.unitTest1Message}
                    </div>
                  ) : (
                    ""
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {/* half yearly start */}
              <div className="flex gap-2">
                <input
                  type="radio"
                  id="halfYearly"
                  value="halfYearly"
                  required
                  checked={radioButtonValue === "halfYearly"}
                  onChange={(event) => {setRadioButtonValue(event.target.value); getDateHandler();}}
                />
                <label htmlFor="halfYearly">Half Yearly</label>
              </div>
              {radioButtonValue === "halfYearly" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 ml-10">
                    <input
                      type="date"
                      placeholder="DD:MM:YYYY"
                      value={halfYearlyDate}
                      onChange={(event) =>
                        setHalfYearlyDate(event.target.value)
                      }
                      maxLength={10}
                      className="border border-black px-2 py-1"
                    />
                    <button
                      className="bg-blue-800 text-white p-1 rounded-sm"
                      onClick={() =>
                        dateAddHandler("halfYearly", halfYearlyDate)
                      }
                    >
                      Add
                    </button>
                  </div>
                  {error.halfYearlyError ? (
                    <div className="font-bold text-red-600">
                      {error.halfYearlyError}
                    </div>
                  ) : message.halfYearlyMessage ? (
                    <div className="font-bold text-green-600">
                      {message.halfYearlyMessage}
                    </div>
                  ) : (
                    ""
                  )}
                </div>
              )}
            </div>
            {/* Unit Test - 2 start */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="radio"
                  id="unitTest-2"
                  value="unitTest-2"
                  required
                  checked={radioButtonValue === "unitTest-2"}
                  onChange={(event) => {setRadioButtonValue(event.target.value); getDateHandler();}}
                />
                <label htmlFor="unitTest-2">Unit Test-2</label>
              </div>
              {radioButtonValue === "unitTest-2" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 ml-10">
                    <input
                      type="date"
                      placeholder="DD:MM:YYYY"
                      value={unitTest2Date}
                      required
                      onChange={(event) => setUnitTest2Date(event.target.value)}
                      maxLength={10}
                      className="border border-black px-2 py-1"
                    />
                    <button
                      className="bg-blue-800 text-white p-1 rounded-sm"
                      onClick={() => dateAddHandler("unitTest2", unitTest2Date)}
                    >
                      Add
                    </button>
                  </div>
                  {error.unitTest2Error ? (
                    <div className="font-bold text-red-600">
                      {error.unitTest2Error}
                    </div>
                  ) : message.unitTest2Message ? (
                    <div className="font-bold text-green-600">
                      {message.unitTest2Message}
                    </div>
                  ) : (
                    ""
                  )}
                </div>
              )}
            </div>
            {/* Annual start */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="radio"
                  id="annual"
                  value="annual"
                  checked={radioButtonValue === "annual"}
                  onChange={(event) => {setRadioButtonValue(event.target.value); getDateHandler();}}
                />
                <label htmlFor="annual">Annual</label>
              </div>
              {radioButtonValue === "annual" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 ml-10">
                    <input
                      type="date"
                      placeholder="DD:MM:YYYY"
                      value={annualDate}
                      onChange={(event) => setAnnualDate(event.target.value)}
                      maxLength={10}
                      className="border border-black px-2 py-1"
                    />
                    <button
                      className="bg-blue-800 text-white p-1 rounded-sm"
                      onClick={() => dateAddHandler("annual", annualDate)}
                    >
                      Add
                    </button>
                  </div>
                  {error.annualError ? (
                    <div className="font-bold text-red-600">
                      {error.annualError}
                    </div>
                  ) : message.annualMessage ? (
                    <div className="font-bold text-green-600">
                      {message.annualMessage}
                    </div>
                  ) : (
                    ""
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamSettings;
