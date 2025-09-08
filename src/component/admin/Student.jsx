import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { myContext } from "../context/MyContextProvider";

function Student() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const { user } = useContext(myContext);
  const navigate = useNavigate();

  const excelFileUploadHandler = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("file", event.target.files[0]);

    const response = await fetch(`${import.meta.env.VITE_API_URL}excelFileUpload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      credentials: "include",
      body: formData,
    });
    const message = await response.text();
    if (!response.ok) {
      setError(message);
      setMessage(null);
    } else {
      setMessage(message);
      setError(null);
    }
  };

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user]);
  return (
    <div className="flex flex-col justify-center items-center">
      <div className="flex flex-col gap-2">
        <label>Upload Excel Sheet of students</label>
        <input type="file" accept=".xlsx" onChange={excelFileUploadHandler} />
        {message && (
          <label className="text-green-700 font-bold">{message}</label>
        )}
        {error && <label className="text-red-700 font-bold">{error}</label>}
      </div>
    </div>
  );
}

export default Student;
