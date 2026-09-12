import {useState, useEffect, createContext} from 'react';
import { jwtDecode } from "jwt-decode";
import { API_BASE_URL } from "./api";

export const myContext = createContext();

export function MyContextProvider({children}) {
  const [user, setUser] = useState(()=>{
    const token = localStorage.getItem('token');
    if (token) return { ...jwtDecode(token), token };
    return null;
  })
  const [error, setError] = useState(null);

  useEffect(()=>{
    const token = localStorage.getItem("token");
    if(token) {
      const decoded = jwtDecode(token);
      if(decoded.exp*1000 <= Date.now()) {
        setUser(null);
        localStorage.removeItem("token");
        return;
      }
    } else {
      setUser(null);
    }
  },[])

  const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json(); // Try to parse regardless

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error ${response.status}`);
    }

    const token = data.token;
    if (!token) throw new Error("No Token Received");

    const decoded = jwtDecode(token);
    localStorage.setItem("token", token);
    setUser({ ...decoded, token });
    setError(null);
    return true;
  } catch (error) {
    console.error("Login error:", error);
    setError(error.message || "Unexpected error");
    setUser(null);
    localStorage.removeItem("token");
    setTimeout(()=>{setError(null)},5000);
    return false;
  }
};

// Logout handler
const logout = async () => {
  console.log("logout");
  const token = localStorage.getItem("token");
  const logoutResponse = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
    const logoutData = await logoutResponse.json();
    console.log(logoutData);
    localStorage.removeItem("token");
    setUser(null);
    
}
    
  return (
    <myContext.Provider value={{user, login, error, logout}}>
      {children}
    </myContext.Provider>
  )
}

