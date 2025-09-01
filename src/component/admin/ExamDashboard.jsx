import React, { useState, useEffect, useContext } from "react";
import { myContext } from "../context/MyContextProvider";
import { useNavigate, NavLink } from "react-router-dom";
import Breadcrumb from "./Breadcrumb";
function ExamDashboard() {
  const { user } = useContext(myContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user]);
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <Breadcrumb testName="Exam" />
      <div className="flex flex-col gap-4 font-bold border-2 shadow-md p-2">
        <div>Select the exam to upload the result</div>
        <div className="flex flex-col md:flex-row md:justify-between md:w-1/2 gap-2">
          <NavLink
            to="/unitTest_1"
            className="bg-blue-700 text-white font-bold rounded-md p-1"
          >
            Unit Test-1
          </NavLink>
          <NavLink className="bg-blue-700 text-white font-bold rounded-md p-1">
            Half Yearly
          </NavLink>
          <NavLink className="bg-blue-700 text-white font-bold rounded-md p-1">
            Unit Test-2
          </NavLink>
          <NavLink className="bg-blue-700 text-white font-bold rounded-md p-1">
            Annual
          </NavLink>
        </div>
      </div>
      {user ? user.role == "admin" ? <div className="border-2 p-2 shadow-md">
        <NavLink to="/examDashboard/examSettings"  className="bg-blue-700 text-white font-bold rounded-md p-1" >Exam Settings</NavLink>
      </div>: "" : ""}
    </div>
  );
}

export default ExamDashboard;
