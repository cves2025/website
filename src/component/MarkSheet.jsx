import React, { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import schoolLogo from "../assets/image/schoolLogo1.png";
import OneToEight from "./OneToEight";
import ShowNurLKGUnitTestResult from "./ShowNurLKGUnitTestResult";
import ShowUKGUnitTestResult from "./ShowUKGUnitTestResult";

function MarkSheet() {
  const [student, setStudent] = useState([]);
  const [disableButton, setDisableButton] = useState(false);
  const [whichClass, setWhichClass] = useState("");
  const [unitTest1Date, setUnitTest1Date] = useState("");
  const [enrollment, setEnrollment] = useState("2317");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlerSeeResult = async (event, enrollment) => {
    event.preventDefault();
    setDisableButton(true);
    setTimeout(() => setDisableButton(false), 5000);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}api/result?enrollment=${enrollment}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await response.json();
      console.log(data);

      if (data.error) {
        setError(data.error);
        setWhichClass("");
        setLoading(false);
        setTimeout(() => {
          setError("");
          setDisableButton(false);
        }, 5000);
        return;
      }

      setWhichClass(data.studentData.class);
      setStudent(data.studentData);
      setUnitTest1Date(data.unitTest1ResultDate);
      setError("");
      setLoading(true);
      return;
    } catch (error) {
      console.error(error);
      setError("Something went wrong fetching data.");
    }
  };

  return (
    <div className="flex justify-center items-center flex-col">
      {/* Input form */}
      <div className="flex flex-col text-2xl gap-2 justify-center items-center print:hidden">
        <form
          onSubmit={(event) => handlerSeeResult(event, enrollment)}
          className="flex flex-col text-2xl gap-4 justify-center items-center"
        >
          <label>Enter Enrollment Number</label>
          <input
            type="text"
            value={enrollment}
            placeholder="Enter Enrollment Number"
            required
            className="h-10 w-full p-2 border-2 focus:outline-none"
            onChange={(event) => setEnrollment(event.target.value)}
          />
          <button
            type="submit"
            disabled={disableButton}
            className={`w-full text-white ${
              disableButton
                ? "bg-gray-400 cursor-not-allowed opacity-50"
                : "bg-blue-900"
            }`}
          >
            See Result
          </button>
        </form>
      </div>
      <div className="w-full">
        {loading && (
          <div className="flex bg-blue-900 mt-10">
            <div className="m-2 bg-yellow-500 w-full">
              <div className="m-2 p-2 bg-white">
                {/* Header */}
                <div className="flex justify-between text-lg font-bold">
                  <h1>Govt. Affiliated School</h1>
                  <h1>UDISE CODE: 0967091304</h1>
                </div>

                {/* CVES header start */}
                <div className="flex flex-row justify-center items-center">
                  <div>
                    <img
                      src={schoolLogo}
                      alt="school logo"
                      className="w-auto h-28 md:h-36"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div>
                      <h3 className="font-cancun text-2xl lg:text-4xl md:text-2xl">
                        <span className="text-green-600">CHILDREN'S</span>
                        <span className="text-blue-800"> VALLEY</span>
                        <span className="text-red-600"> ENGLISH</span>
                        <span className="text-pink-600"> SCHOOL</span>
                      </h3>
                    </div>
                    <div className="flex flex-row justify-between items-center text-center">
                      <div className="flex flex-col mx-auto text-xl font-bold">
                        <p className="text-cyan-600">
                          Co-Education English Medium School
                        </p>
                        <p>Mahmoorganj, Varanasi - 9336576690</p>
                        <p className="py-2 bg-purple-800 text-white rounded-lg">
                          PROGRESS REPORT
                        </p>
                      </div>
                      <div className="flex flex-col font-bold">
                        <div className="flex">
                          <QRCodeCanvas
                            value="https://cves.in"
                            size={75}
                            className="p-2"
                          />
                        </div>
                        <div>www.cves.in</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Content */}
                <div className="mt-2 border">
                  <div className="flex flex-col justify-center items-center text-center">
                    <p>Report Card (Unit Test-I)</p>
                    <p>Session: 2025-26</p>
                  </div>
                  <hr />
                  <div>
                    {["PG", "Nursery", "LKG"].includes(whichClass) ? (
                      <ShowNurLKGUnitTestResult
                        whichClass={whichClass}
                        resultData={student}
                        unitTest1Date={unitTest1Date}
                      />
                    ) : ["UKG"].includes(whichClass) ? (
                      <ShowUKGUnitTestResult
                        whichClass={whichClass}
                        resultData={student}
                      />
                    ) : ["1","2","3","4","5","6","7","8"].includes(whichClass) ? (
                      <OneToEight
                        whichClass={whichClass}
                        resultData={student}
                      />
                    ) : <div></div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print Button */}
      {loading && (
        <button
          onClick={window.print}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold print:hidden"
        >
          Print Marksheet
        </button>
      )}

      {/* Error Message */}
      {error && <div className="text-red-600 font-bold">{error}</div>}
    </div>
  )
}

export default MarkSheet;
