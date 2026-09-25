import { auth } from "../../firebase/config.ts"; // apne project ke firebase client config se adjust kar lena
// jahan `export const auth = getAuth(app);` jaisa kuch hoga

// Central place for the backend URL.
// VITE_API_BASE_URL is injected by Vite from .env.development (npm run dev)
// or .env.production (npm run build). It falls back to the local server when
// the env var is not present.
export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    "http://localhost:3000"
).replace(/\/+$/, "");

// Helper to attach the Firebase ID token (JWT) to API requests.
// Always pulls a fresh token from the currently logged-in Firebase user —
// no token is stored anywhere on the client.
export async function authHeaders(
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}