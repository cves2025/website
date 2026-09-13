import { useState, useEffect, createContext, ReactNode } from "react";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { API_BASE_URL } from "./api";

/** Decoded Firebase ID token plus the raw token string. */
export interface AuthUser extends JwtPayload {
  name?: string;
  email?: string;
  role?: string;
  admin?: boolean;
  token: string;
}

/** Shape of the value provided by MyContextProvider. */
export interface AuthContextType {
  user: AuthUser | null;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

// Default value used when a component reads the context outside the provider.
// The provider always supplies the real value, so these are graceful no-ops.
const defaultContext: AuthContextType = {
  user: null,
  error: null,
  login: async () => false,
  logout: async () => {},
};

export const myContext = createContext<AuthContextType>(defaultContext);

export function MyContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem("token");
    if (token) return { ...jwtDecode(token), token };
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      if (decoded.exp !== undefined && decoded.exp * 1000 <= Date.now()) {
        setUser(null);
        localStorage.removeItem("token");
        return;
      }
    } else {
      setUser(null);
    }
  }, []);

  const login = async (email: string, password: string) => {
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
        throw new Error(
          data.error || data.message || `HTTP error ${response.status}`
        );
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
      setError(
        error instanceof Error && error.message
          ? error.message
          : "Unexpected error"
      );
      setUser(null);
      localStorage.removeItem("token");
      setTimeout(() => {
        setError(null);
      }, 5000);
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
    });
    const logoutData = await logoutResponse.json();
    console.log(logoutData);
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <myContext.Provider value={{ user, login, error, logout }}>
      {children}
    </myContext.Provider>
  );
}