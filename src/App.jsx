import React from "react";
import Head from "./component/Head";
import {MyContextProvider} from "./component/context/MyContextProvider";

function App() {
  return (
    <MyContextProvider>
      <div className="m-0.5">
        <Head />
      </div>
    </MyContextProvider>
  );
}

export default App;
