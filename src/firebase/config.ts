import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// "dev" -> (default) DB, "prod" -> prod DB
export const APP_ENV: "dev" | "prod" =
  import.meta.env.VITE_APP_ENV === "prod" ? "prod" : "dev";

const FIRESTORE_DB_ID: string = import.meta.env.VITE_FIRESTORE_DB_ID || "(default)";

const app = initializeApp(firebaseConfig);

// storageBucket from firebaseConfig is used as the bucket for this environment
export const storage = getStorage(app);

export const db = getFirestore(app, FIRESTORE_DB_ID);

export const auth = getAuth(app);

export default app;