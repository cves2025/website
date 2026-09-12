import React, {useState} from 'react'
import { API_BASE_URL } from './context/api'

function Signup() {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")
    const [showMessage, setShowMessage] = useState(true)

    const submtHandler = async (event) =>{
        event.preventDefault()
        setMessage("")
        setError("")
        if(password !== confirmPassword){
          setError("Password did not match")
          return;
        }
        const res = await fetch(`${API_BASE_URL}/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
          });
          const data = await res.json();
          if (data.message) setMessage(data.message);
          if (data.error) setError(data.error);
          setShowMessage(true)
    }
  return (
    <div>
        <div>
          <form onSubmit={submtHandler} className="flex flex-col mt-5 items-center gap-y-4">
            <input
              type="text"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Full Name"
              required
              className="rounded-lg h-9 pl-4 border"
            />
            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="Email"
              required
              className="rounded-lg h-9 pl-4 border"
            />
            <input
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="Password"
              required
              className="rounded-lg h-9 pl-4 border"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e)=>setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              className="rounded-lg h-9 pl-4 border"
            />
            
            <button type="submit" className="rounded-lg h-9 w-20 cursor-pointer bg-blue-800 font-bold hover:text-white">Create</button>
          </form>
        </div>
          <p className={`${showMessage ? 'block' : 'hidden'} text-green-700 font-bold`}>{message}</p>
          <p className={`${showMessage ? 'block' : 'hidden'} text-red-700 font-bold`}>{error}</p>
    </div>
  );
  
}

export default Signup
