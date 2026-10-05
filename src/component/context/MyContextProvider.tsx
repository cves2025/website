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
import {
  Permission,
  PermissionOverrides,
  Role,
  isRole,
  resolvePermissions,
} from "../../permissions";

export type AccessState =
  | "ok"
  | "no-profile"
  | "invalid-role"
  | "inactive"
  | "profile-error";

export interface AuthUser {
  uid: string;
  email: string | null;
  fullName?: string;
  role?: Role;
  permissions: Permission[];
  accessState: AccessState;
  lastSeenReleaseId?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  authReady: boolean;
  profileReady: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  /** true agar current user ke paas yeh permission hai. */
  can: (permission: Permission) => boolean;
}

const defaultContext: AuthContextType = {
  user: null,
  authReady: false,
  profileReady: false,
  error: null,
  login: async () => false,
  logout: async () => {},
  can: () => false,
};

export const myContext = createContext<AuthContextType>(defaultContext);

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

function readIsClassTeacher(data: Record<string, unknown>): boolean {
  const sections = data.sectionAssignments;
  if (Array.isArray(sections)) {
    return sections.some(
      (s) => (s as { isClassTeacher?: unknown } | null)?.isClassTeacher === true
    );
  }
  return data.isClassTeacher === true;
}

export function MyContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUserFromFirebase = async (
    firebaseUser: FirebaseUser
  ): Promise<AuthUser> => {
    const base: AuthUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      permissions: [],
      accessState: "no-profile",
    };

    try {
      const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!snapshot.exists()) return base;

      const data = snapshot.data() as Record<string, unknown>;
      const fullName = typeof data.fullName === "string" ? data.fullName : undefined;
      const lastSeenReleaseId =
        typeof data.lastSeenReleaseId === "string" &&
        data.lastSeenReleaseId.trim() !== ""
          ? data.lastSeenReleaseId
          : undefined;

      if (!isRole(data.role)) {
        return { ...base, fullName: fullName, accessState: "invalid-role" };
      }
      const role = data.role;

      const status = typeof data.status === "string" ? data.status : "";
      const inactive =
        data.isDeleted === true || (status !== "" && status !== "Active");
      if (inactive) {
        return { ...base, fullName: fullName, role, accessState: "inactive" };
      }

      return {
        ...base,
        fullName: fullName,
        role,
        lastSeenReleaseId,
        accessState: "ok",
        permissions: resolvePermissions(
          role,
          data.permissionOverrides as PermissionOverrides | undefined,
          readIsClassTeacher(data)
        ),
      };
    } catch (err) {
      console.error("Could not load Firestore user profile:", err);
      return { ...base, accessState: "profile-error" };
    }
  };

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        setUser(null);
        setAuthReady(true);
        setProfileReady(false);
        return;
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        permissions: [],
        accessState: "no-profile",
      });
      setAuthReady(true);
      setProfileReady(false);

      void buildUserFromFirebase(firebaseUser).then((fullUser) => {
        if (!active) return;
        setUser((prev) =>
          prev && prev.uid === firebaseUser.uid ? fullUser : prev
        );
        setProfileReady(true);
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
      setProfileReady(true);
      setError(null);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      const code = (err as { code?: string })?.code || "";
      setError(friendlyAuthError(code));
      setUser(null);
      setProfileReady(false);
      setTimeout(() => setError(null), 5000);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfileReady(false);
  };

  const can = (permission: Permission) =>
    user?.accessState === "ok" && user.permissions.includes(permission);

  return (
    <myContext.Provider
      value={{ user, authReady, profileReady, login, error, logout, can }}
    >
      {authReady ? children : <Loader label="Checking your session..." />}
    </myContext.Provider>
  );
}