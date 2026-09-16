import { useState, useEffect, createContext, ReactNode } from "react";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { doc, getDoc } from "firebase/firestore";
import { API_BASE_URL } from "./api";
import { db } from "../../firebase/config";

/** Decoded Firebase ID token plus the raw token string. */
export interface AuthUser extends JwtPayload {
  uid?: string;
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

/** Firebase ID tokens identify the user via the `sub` / `uid` / `user_id` claims. */
function extractUid(decoded: JwtPayload): string | undefined {
  const uid =
    decoded.sub ||
    (decoded as { uid?: string }).uid ||
    (decoded as { user_id?: string }).user_id;
  return uid || undefined;
}

export function MyContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      return { ...decoded, uid: extractUid(decoded), token };
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  /**
   * Load the Firestore `users/{uid}` document (name, role, uid) once and merge
   * it into the global user so every component reads the same profile info.
   * If the read is blocked by security rules, the JWT-based data is kept.
   */
  const refreshProfile = async (current: AuthUser): Promise<void> => {
    const uid = current.uid || extractUid(current);
    if (!uid) return;

    try {
      const snapshot = await getDoc(doc(db, "users", uid));
      if (!snapshot.exists()) return;

      const data = snapshot.data() as Record<string, unknown>;
      const role = typeof data.role === "string" ? data.role : current.role;
      const name =
        typeof data.name === "string" && data.name.trim()
          ? data.name
          : current.name;

      setUser({
        ...current,
        uid,
        name,
        role,
        admin: data.admin === true || role === "admin" || current.admin === true,
      });
    } catch (error) {
      // Firestore security rules may block direct reads - keep JWT-only data.
      console.error("Could not load Firestore user profile:", error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      if (decoded.exp !== undefined && decoded.exp * 1000 <= Date.now()) {
        setUser(null);
        localStorage.removeItem("token");
        return;
      }
      const restoredUser: AuthUser = {
        ...decoded,
        uid: extractUid(decoded),
        token,
      };
      setUser(restoredUser);
      // Fetch the Firestore `users/{uid}` profile once and share it globally.
      void refreshProfile(restoredUser);
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
      const loggedInUser: AuthUser = {
        ...decoded,
        uid: extractUid(decoded),
        token,
      };
      localStorage.setItem("token", token);
      setUser(loggedInUser);
      setError(null);
      // Fetch the Firestore `users/{uid}` profile once and share it globally.
      void refreshProfile(loggedInUser);
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