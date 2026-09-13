import { useEffect } from "react";
import Head from "./component/Head";
import { MyContextProvider } from "./component/context/MyContextProvider";
import { useNavigate } from "react-router-dom";

function App() {
  const navigate = useNavigate();

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
      </div>
    </MyContextProvider>
  );
}

export default App;