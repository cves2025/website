import { useEffect, useState, useRef, useContext } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { myContext } from "./context/MyContextProvider";
import loginSideImage from "../assets/image/loginSide.jpg";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false); // prevents double-submit (onClick + form onSubmit)
  const { user, login, error } = useContext(myContext);
  const navigate = useNavigate();

  const submitHandler = async (event) => {
    if (event) event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    const success = await login(email, password);
    submitting.current = false;
    setLoading(false);
    if (success) navigate("/welcome");
  };

  useEffect(() => {
    if (user) navigate("/welcome");
  }, [user]);

  return (
    <div className="flex flex-col md:flex-row w-full min-h-screen">
      {/* Left side - Login form */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 min-h-screen px-6 py-10">
        <div className="w-full max-w-md flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Welcome Back</h1>
          <h3 className="font-cancun text-xl">
            <span className="text-green-600">CHILDREN'S</span>
            <span className="text-blue-800"> VALLEY</span>
            <span className="text-red-600"> ENGLISH</span>
            <span className="text-pink-600"> SCHOOL</span>
          </h3>
          <p className="text-gray-500 mb-8 text-base text-center">
            Login to continue to your account
          </p>

          <form
            onSubmit={submitHandler}
            className="flex flex-col w-full gap-4"
          >
            <input
              type="email"
              value={email}
              placeholder="Email"
              required
              onChange={(event) => setEmail(event.target.value)}
              className="border-2 p-3 rounded-md w-full text-base focus:outline-none focus:border-blue-600 transition-colors"
            />
            <input
              type="password"
              value={password}
              placeholder="Password"
              required
              onChange={(event) => setPassword(event.target.value)}
              className="border-2 p-3 rounded-md w-full text-base focus:outline-none focus:border-blue-600 transition-colors"
            />
            <button
              type="submit"
              onClick={submitHandler}
              disabled={loading}
              className="hover:text-white font-bold text-xl rounded-lg bg-blue-600 hover:bg-blue-700 w-full h-12 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <NavLink
            to="/signup"
            className="text-blue-900 font-bold pt-4 hover:underline"
          >
            Create an account
          </NavLink>

          {error && (
            <label className="text-red-700 text-base font-bold pt-3 text-center">
              {error}
            </label>
          )}
        </div>
      </div>

      {/* Right side - Image (hidden on mobile) */}
      <div className="hidden md:block md:w-1/2 min-h-screen relative">
        <img
          src={loginSideImage}
          alt="Nature"
          className="w-full h-screen object-cover"
        />
      </div>
    </div>
  );
}

export default Login;