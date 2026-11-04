import { useEffect } from "react";
import Head from "./component/Head";
import { MyContextProvider } from "./component/context/MyContextProvider";
import { useNavigate } from "react-router-dom";
import { AppToaster } from "./components/ui/app-toaster";
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
        <AppToaster />
      </div>
    </MyContextProvider>
  );
}

export default App;