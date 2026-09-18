import { useState, useEffect, createContext, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import Loader from "../../custom-components/Loader";

/** Local app user shape, built from Firebase's auth user + Firestore profile. */
export interface AuthUser {
  uid: string;
  email: string | null;
  name?: string;
  role?: string;
  admin?: boolean;
}

/** Shape of the value provided by MyContextProvider. */
export interface AuthContextType {
  user: AuthUser | null;
  /**
   * false until Firebase has finished restoring the persisted session.
   * Protected routes must wait for this before redirecting to /login,
   * otherwise a page refresh bounces the user to the login page.
   */
  authReady: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

// Default value used when a component reads the context outside the provider.
// The provider always supplies the real value, so these are graceful no-ops.
const defaultContext: AuthContextType = {
  user: null,
  authReady: false,
  error: null,
  login: async () => false,
  logout: async () => {},
};

export const myContext = createContext<AuthContextType>(defaultContext);

/** Human-readable messages for common Firebase Auth error codes. */
function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "Unable to log in. Please try again.";
  }
}

export function MyContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load the Firestore `users/{uid}` document (name, role, admin) and merge
   * it into the global user so every component reads the same profile info.
   */
  const buildUserFromFirebase = async (
    firebaseUser: FirebaseUser
  ): Promise<AuthUser> => {
    const base: AuthUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
    };

    try {
      const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!snapshot.exists()) return base;

      const data = snapshot.data() as Record<string, unknown>;
      const role = typeof data.role === "string" ? data.role : undefined;
      const name = typeof data.name === "string" ? data.name : undefined;

      return {
        ...base,
        name,
        role,
        admin: data.admin === true || role === "admin",
      };
    } catch (err) {
      // Firestore security rules may block direct reads - keep auth-only data.
      console.error("Could not load Firestore user profile:", err);
      return base;
    }
  };

  // Keeps user state in sync with Firebase's own persisted session, so a page
  // refresh automatically restores the logged-in user. `authReady` stays false
  // until the first callback, which is what gates the app behind the loader.
  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        setUser(null);
        setAuthReady(true);
        return;
      }

      // Restore immediately with the auth-only info (uid/email) so the app can
      // render without waiting for the Firestore profile round-trip...
      const baseUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
      };
      setUser(baseUser);
      setAuthReady(true);

      // ...then merge the Firestore profile (name/role/admin) when it loads.
      void buildUserFromFirebase(firebaseUser).then((fullUser) => {
        if (!active) return;
        // Only apply if the same user is still logged in (guards logout races).
        setUser((prev) =>
          prev && prev.uid === firebaseUser.uid ? fullUser : prev
        );
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const fullUser = await buildUserFromFirebase(credential.user);
      setUser(fullUser);
      setError(null);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      const code = (err as { code?: string })?.code || "";
      setError(friendlyAuthError(code));
      setUser(null);
      setTimeout(() => {
        setError(null);
      }, 5000);
      return false;
    }
  };

  // Logout handler
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <myContext.Provider value={{ user, authReady, login, error, logout }}>
      {/* Until Firebase restores the session we don't know if the visitor is
          logged in, so show the loader instead of flashing the login page. */}
      {authReady ? children : <Loader label="Checking your session..." />}
    </myContext.Provider>
  );
}