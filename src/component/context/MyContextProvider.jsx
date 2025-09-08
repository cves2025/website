import React, {useState, useEffect, createContext} from 'react';
import {jwtDecode} from "jwt-decode";

export const myContext = createContext();

export function MyContextProvider({children}) {
  const [user, setUser] = useState(()=>{
    const token = localStorage.getItem('token');
    if(token) return jwtDecode(token);
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

  const login = async (username, password) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json(); // Try to parse regardless

    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }

    const token = data.token;
    if (!token) throw new Error("No Token Received");

    const decoded = jwtDecode(token);
    localStorage.setItem("token", token);
    setUser(decoded);
  } catch (error) {
    console.error("Login error:", error);
    setError(error.message || "Unexpected error");
    setUser(null);
    localStorage.removeItem("token");
    setTimeout(()=>{setError(null)},5000);
  }
};

// Logout handler
const logout = async () => {
  console.log("logout");
  const token = localStorage.getItem("token");
  const logoutResponse = await fetch(`${import.meta.env.VITE_API_URL}logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ token}),
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

