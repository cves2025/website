import React, { useState } from "react";

const MyForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    mobileNumber: "",
    email: "",
    program: "",
    state: "",
    city: "",
  });

  const [countryCodes] = useState([
    { code: "+91", country: "India" },
    // Add more country codes as needed
  ]);

  const states = [
    "State 1",
    "State 2",
    "State 3",
    // Add more states as needed
  ];

  const cities = {
    "State 1": ["City 1-1", "City 1-2", "City 1-3"],
    "State 2": ["City 2-1", "City 2-2", "City 2-3"],
    "State 3": ["City 3-1", "City 3-2", "City 3-3"],
    // Add more cities as needed
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log(formData);
  };

  return (
    <div className=" p-5 px-10 my-5  bg-white rounded-xl w-[22rem] sm:w-full  max-w-96 ">
      <div>
        <h2 className="text-center font-semibold text-[22px] text-blue-900">
          Enquiry Form
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <input
              className=" outline-none border-2 border-gray rounded-md text-sm  "
              type="text"
              placeholder="Enter Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "5px",
                marginTop: "30px",
              }}
            />
          </div>

          <div
            style={{ marginBottom: "15px" }}
            className="h-[50px]  outline- none border-2 border-gray rounded-md text-sm"
          >
            <select
              className="h-10"
              name="countryCode"
              style={{ padding: "8px", width: "55px", marginBottom: "5px" }}
              onChange={handleInputChange}
            >
              {countryCodes.map((code, index) => (
                <option key={index} value={code.code}>
                  {code.code} ({code.country})
                </option>
              ))}
            </select>

            <input
              className=""
              type="tel"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleInputChange}
              placeholder="Mobile Number"
              required
              style={{
                width: "126px",
                padding: "8px",
                marginLeft: "5px",
              }}
            />
          </div>

          <div
            style={{ marginBottom: "15px" }}
            className="outline-none border-2 border-gray rounded-md text-sm "
          >
            <input
              type="email"
              name="email"
              placeholder="Enter Email id"
              value={formData.email}
              onChange={handleInputChange}
              required
              pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
              style={{ width: "80%", padding: "8px", marginBottom: "5px" }}
            />
          </div>

          <div
            style={{ marginBottom: "15px" }}
            className="outline-none border-2 border-gray rounded-md text-sm "
          >
            <select
              name="program"
              value={formData.program}
              onChange={handleInputChange}
              required
              style={{ width: "80%", padding: "8px", marginBottom: "5px" }}
            >
              <option value="">Select Program</option>
              <option value="Secondary">Secondary</option>
              <option value="Senior Secondary">Senior Secondary</option>
            </select>
          </div>

          <div
            style={{ marginBottom: "15px" }}
            className="outline-none border-2 border-gray rounded-md text-sm "
          >
            <select
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              required
              style={{ width: "80%", padding: "9px", marginBottom: "5px" }}
            >
              <option value="">Select City</option>
              {formData.state &&
                cities[formData.state].map((city, index) => (
                  <option key={index} value={city}>
                    {city}
                  </option>
                ))}
            </select>
          </div>

          <div
            style={{ marginBottom: "15px" }}
            className="outline-none border-2 border-gray rounded-md text-sm "
          >
            <select
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              required
              style={{ width: "80%", padding: "8px", marginBottom: "5px" }}
            >
              <option value="">Select State</option>
              {states.map((state, index) => (
                <option key={index} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div>
            <input type="checkbox" className="relative top-4 -left-2" />
            <h1 className="text-wrap text-xs relative -top-6 left-3">
              *I agree to receive information regarding my submitted application
              by signing up on (CHIRLDREN'S VALLEY ENGLISH SCHOOL).
            </h1>
          </div>
          <button
            className="bg-blue-800 relative top-2 font-semibold"
            type="submit"
            style={{
              padding: "5px 10px",

              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            SUBMIT
          </button>
        </form>
      </div>
    </div>
  );
};

export default MyForm;

// <label for="states">Select a State:</label>
// <select id="states">

//     // Array of Indian states
//     const indiaStates = [
//         "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
//         "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
//         "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
//         "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
//         "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
//         "Uttar Pradesh", "Uttarakhand", "West Bengal"
//     ];

//     // Populate the dropdown
//     const selectElement = document.getElementById("states");

//     indiaStates.forEach(state => {
//         let option = document.createElement("option");
//         option.value = state;
//         option.textContent = state;
//         selectElement.appendChild(option);
//     });
