import {
  useEffect,
  useState,
  useRef,
  useContext,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { myContext } from "./context/MyContextProvider";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef<boolean>(false); // prevents double-submit (onClick + form onSubmit)
  const { user, authReady, login, error } = useContext(myContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Page the user originally asked for (set by protected routes on redirect).
  const redirectTo = searchParams.get("redirect") || "/welcome";

  const submitHandler = async (
    event?: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>
  ) => {
    if (event) event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    const success = await login(email, password);
    submitting.current = false;
    setLoading(false);
    if (success) navigate(redirectTo, { replace: true });
  };

  // Already logged in (e.g. arriving here while the session is still valid):
  // send the user straight to the page they wanted instead of the dashboard.
  useEffect(() => {
    if (authReady && user) navigate(redirectTo, { replace: true });
  }, [authReady, user, redirectTo, navigate]);

  return (
    <div className="relative flex flex-col md:flex-row w-full min-h-screen overflow-hidden bg-slate-50">
      {/* ---- Animated background blobs (left side only) ---- */}
      <div className="pointer-events-none absolute inset-0 md:w-1/2 overflow-hidden">
        <div className="cves-blob cves-blob-1" />
        <div className="cves-blob cves-blob-2" />
        <div className="cves-blob cves-blob-3" />
      </div>

      {/* Left side - Login form */}
      <div className="relative z-10 flex flex-col justify-center items-center w-full md:w-1/2 min-h-screen px-6 py-10">
        <div className="cves-card w-full max-w-md flex flex-col items-center bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl shadow-blue-900/5 rounded-3xl px-8 py-10">
          <div className="cves-fade-up" style={{ animationDelay: "0.05s" }}>
            <h1 className="text-3xl font-bold mb-1 text-gray-800 text-center">
              Welcome Back
            </h1>
          </div>

          <div className="cves-fade-up" style={{ animationDelay: "0.15s" }}>
            <h3 className="font-cancun text-xl text-center">
              <span className="text-green-600">CHILDREN'S</span>
              <span className="text-blue-800"> VALLEY</span>
              <span className="text-red-600"> ENGLISH</span>
              <span className="text-pink-600"> SCHOOL</span>
            </h3>
          </div>

          <p
            className="cves-fade-up text-gray-500 mb-8 text-base text-center"
            style={{ animationDelay: "0.22s" }}
          >
            Login to continue to your account
          </p>

          <form
            onSubmit={submitHandler}
            className="flex flex-col w-full gap-6"
          >
            {/* Email - floating label */}
            <div
              className="cves-fade-up relative"
              style={{ animationDelay: "0.3s" }}
            >
              <input
                id="cves-email"
                type="email"
                value={email}
                placeholder=" "
                required
                onChange={(event) => setEmail(event.target.value)}
                className="peer border-2 border-gray-200 p-3 pt-4 rounded-xl w-full text-base bg-white/80 outline-none transition-all duration-300 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
              />
              <label
                htmlFor="cves-email"
                className="absolute left-3 top-3.5 text-gray-400 text-base transition-all duration-200 pointer-events-none
                  peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:bg-white peer-focus:px-1
                  peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:left-2.5 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
              >
                Email
              </label>
            </div>

            {/* Password - floating label + show/hide toggle */}
            <div
              className="cves-fade-up relative"
              style={{ animationDelay: "0.38s" }}
            >
              <input
                id="cves-password"
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder=" "
                required
                onChange={(event) => setPassword(event.target.value)}
                className="peer border-2 border-gray-200 p-3 pt-4 pr-11 rounded-xl w-full text-base bg-white/80 outline-none transition-all duration-300 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
              />
              <label
                htmlFor="cves-password"
                className="absolute left-3 top-3.5 text-gray-400 text-base transition-all duration-200 pointer-events-none
                  peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:bg-white peer-focus:px-1
                  peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:left-2.5 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <div
              className="cves-fade-up"
              style={{ animationDelay: "0.46s" }}
            >
              <button
                type="submit"
                onClick={submitHandler}
                disabled={loading}
                className="cves-btn relative overflow-hidden font-bold text-xl rounded-xl w-full h-12 text-white disabled:opacity-60 transition-all duration-300 active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  )}
                  {loading ? "Logging in..." : "Login"}
                </span>
              </button>
            </div>
          </form>

          {error && (
            <label className="cves-shake text-red-700 text-base font-bold pt-3 text-center">
              {error}
            </label>
          )}
        </div>
      </div>

      {/* Right side - Image (hidden on mobile) */}
      <div className="hidden md:block md:w-1/2 min-h-screen relative overflow-hidden">
        <img
          src="https://firebasestorage.googleapis.com/v0/b/schoolproject-284dc.appspot.com/o/loginPage%2Fschool_login.jpg?alt=media&token=a1418638-edda-4303-9c2c-1ed801242b0f"
          alt="Nature"
          className="cves-kenburns w-full h-screen object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="cves-fade-up absolute bottom-12 left-10 right-10 text-white" style={{ animationDelay: "0.4s" }}>
          <h2 className="text-3xl font-bold drop-shadow-lg">
            Shaping bright futures, one day at a time.
          </h2>
          <p className="mt-2 text-white/80 drop-shadow">
            Children's Valley English School — Admin Panel
          </p>
        </div>
      </div>

      <style>{`
        @keyframes cvesFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cves-fade-up {
          opacity: 0;
          animation: cvesFadeUp 0.6s ease-out forwards;
        }

        @keyframes cvesCardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cves-card {
          animation: cvesCardIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes cvesBlobMove {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        .cves-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(60px);
          opacity: 0.35;
          animation: cvesBlobMove 14s ease-in-out infinite;
        }
        .cves-blob-1 {
          width: 320px;
          height: 320px;
          top: -60px;
          left: -60px;
          background: radial-gradient(circle at 30% 30%, #60a5fa, #2563eb);
        }
        .cves-blob-2 {
          width: 280px;
          height: 280px;
          bottom: -40px;
          left: 20%;
          background: radial-gradient(circle at 30% 30%, #f472b6, #db2777);
          animation-delay: 3s;
        }
        .cves-blob-3 {
          width: 240px;
          height: 240px;
          top: 30%;
          right: -60px;
          background: radial-gradient(circle at 30% 30%, #34d399, #059669);
          animation-delay: 6s;
        }

        .cves-btn {
          background: linear-gradient(120deg, #2563eb, #4f46e5, #2563eb);
          background-size: 200% 100%;
          animation: cvesBtnShine 4s linear infinite;
        }
        .cves-btn:hover:not(:disabled) {
          background-position: 100% 0;
          box-shadow: 0 10px 25px -8px rgba(37, 99, 235, 0.6);
        }
        @keyframes cvesBtnShine {
          0% { background-position: 0% 0; }
          50% { background-position: 100% 0; }
          100% { background-position: 0% 0; }
        }

        @keyframes cvesKenBurns {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.12) translate(-1%, -1%); }
        }
        .cves-kenburns {
          animation: cvesKenBurns 18s ease-in-out infinite alternate;
        }

        @keyframes cvesShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .cves-shake {
          animation: cvesShake 0.4s ease-in-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .cves-fade-up, .cves-card, .cves-blob, .cves-btn, .cves-kenburns, .cves-shake {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Login;