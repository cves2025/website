import React, { useEffect, useState, useContext } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { myContext } from "./context/MyContextProvider";

function Login() {
  const [username, setUsername] = useState("rahul");
  const [password, setPassword] = useState("123456");
  const { user, login, error } = useContext(myContext);
  const navigate = useNavigate();

  const submitHandler = (event) => {
    event.preventDefault();
    login(username, password);
    if (user) navigate("/dashboard");   
  };

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user]);
  return (
    <div className="flex flex-col justify-center items-center mt-5">
      <form onSubmit={submitHandler} className="flex flex-col justify-center items-center gap-4 text-xl">
        <input
          type="text"
          value={username}
          placeholder="Username"
          required
          onChange={(event) => setUsername(event.target.value)}
          className="border-2 p-2 rounded-md"
        />
        <input
          type="password"
          value={password}
          placeholder="Password"
          required
          onChange={(event) => setPassword(event.target.value)}
          className="border-2 p-2 rounded-md"
        />
        <button
          type="submit"
          className="hover:text-white font-bold text-2xl rounded-lg bg-blue-600 w-1/2 h-10"
        >
          Login
        </button>
      </form>
        <NavLink to="/signup" className="text-blue-900 font-bold pt-2">Create an account</NavLink>
      {error && (
        <label className="text-red-700 text-xl font-bold">{error}</label>
      )}
    </div>
  );
}

export default Login;
