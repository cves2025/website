import { useEffect } from "react";
import Head from "./component/Head";
import { MyContextProvider } from "./component/context/MyContextProvider";
import { useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useUpdateCheck } from "./hooks/useUpdateCheck";

function App() {
  const navigate = useNavigate();

  // Silently checks for a newer deployment and auto-reloads when one is found.
  useUpdateCheck();

  useEffect(() => {
    const path = sessionStorage.getItem("redirectPath");
    if (path) {
      navigate(path);
      sessionStorage.removeItem("redirectPath");
    }
  }, []);

  return (
    <MyContextProvider>
      <div className="m-0.5">
        <Head />
        <Toaster position="top-right" toastOptions={{ duration: 4000, success: { duration: 3000 }, error: { duration: 5000 }, style: { background: "#1f2937", color: "#fff", fontWeight: 600, }, }} /> 
      </div>
    </MyContextProvider>
  );
}

export default App;