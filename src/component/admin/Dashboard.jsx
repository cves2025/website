import React, {useEffect, useContext} from 'react'
import { useNavigate } from 'react-router-dom';
import { myContext } from '../context/MyContextProvider';

function Dashboard() {
    const {user} = useContext(myContext);
    const navigate = useNavigate();

    useEffect(()=>{
      if(!user) navigate("/login");
    },[user]);
  return (
    <div>
      Dashboard
    </div>
  )
}

export default Dashboard
