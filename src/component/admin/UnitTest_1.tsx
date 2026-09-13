import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { myContext } from "../context/MyContextProvider";

function UnitTest_1() {
  const navigate = useNavigate();
  const { user } = useContext(myContext);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user]);

  return (
    <div className="flex flex-col justify-center items-center mt-10 gap-3 text-center px-4">
      <h2 className="text-2xl font-bold text-gray-800">Unit Test-1 Marks</h2>
      <p className="text-red-700 font-semibold">
        This feature was part of the old MongoDB backend and has been removed.
      </p>
      <p className="text-gray-600">
        It will be added again later on top of Cloud Firestore.
      </p>
    </div>
  );
}

export default UnitTest_1;