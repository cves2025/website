import { useState, useEffect, createContext, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import Loader from "../../custom-components/Loader";
import {
  Permission,
  PermissionOverrides,
  Role,
  TeacherRoleDefaults,
  isClassTeacherProfile,
  isRole,
  resolvePermissions,
  ALL_SCOPE, NO_SCOPE, type AccessScope
} from "../../permissions";
import { toEditableSectionAssignments } from "../../utils/teacherSections";
import { subscribeTeacherRoleDefaults } from "../../utils/permissionSettingsService";

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
  scope: AccessScope;
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

function buildScope(role: Role, data: Record<string, unknown>): AccessScope {
  if (role === "admin") return ALL_SCOPE;
  if (role === "teacher") {
    return {
      kind: "assigned",
      assignments: toEditableSectionAssignments(data).assignments,
    };
  }
  return NO_SCOPE; // student / parent ka scope baad ke step mein
}

function baseUser(firebaseUser: FirebaseUser): AuthUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    permissions: [],
    accessState: "no-profile",
    scope: NO_SCOPE,
  };
}

/** Builds the app user from the users/{uid} document (null = no profile). */
function buildUser(
  firebaseUser: FirebaseUser,
  data: Record<string, unknown> | null,
  teacherDefaults: TeacherRoleDefaults | null
): AuthUser {
  const base = baseUser(firebaseUser);
  if (!data) return base;

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
      isClassTeacherProfile(data),
      teacherDefaults
    ),
    scope: buildScope(role, data),
  };
}

export function MyContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The profile and the school-wide teacher defaults are both listened to
    // live, so permission changes made on the Permissions page (or a
    // deactivated account) reach an open app without a reload.
    let stopListening: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      stopListening?.();
      stopListening = null;

      if (!firebaseUser) {
        setUser(null);
        setAuthReady(true);
        setProfileReady(false);
        return;
      }

      setUser(baseUser(firebaseUser));
      setAuthReady(true);
      setProfileReady(false);

      // undefined = not loaded yet; the user is built once both have arrived.
      let profile: Record<string, unknown> | null | undefined;
      let teacherDefaults: TeacherRoleDefaults | null | undefined;
      let profileFailed = false;

      const publish = () => {
        if (profileFailed) {
          setUser({ ...baseUser(firebaseUser), accessState: "profile-error" });
        } else if (profile !== undefined && teacherDefaults !== undefined) {
          setUser(buildUser(firebaseUser, profile, teacherDefaults));
        } else {
          return;
        }
        setProfileReady(true);
      };

      const stopProfile = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (snapshot) => {
          profileFailed = false;
          profile = snapshot.exists()
            ? (snapshot.data() as Record<string, unknown>)
            : null;
          publish();
        },
        (err) => {
          console.error("Could not load Firestore user profile:", err);
          profileFailed = true;
          publish();
        }
      );
      const stopDefaults = subscribeTeacherRoleDefaults((defaults) => {
        teacherDefaults = defaults;
        publish();
      });

      stopListening = () => {
        stopProfile();
        stopDefaults();
      };
    });

    return () => {
      stopListening?.();
      unsubscribe();
    };
  }, []);

  // The profile itself is loaded by the onAuthStateChanged listener above;
  // RequireAccess shows a loader until it is ready.
  const login = async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      // Normally the listener has already set the user; never replace it.
      setUser((prev) =>
        prev?.uid === credential.user.uid ? prev : baseUser(credential.user)
      );
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