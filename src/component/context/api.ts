// Central place for the backend URL.
// VITE_API_BASE_URL is injected by Vite from .env.development (npm run dev)
// or .env.production (npm run build). It falls back to the local server when
// the env var is not present.
export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    "http://localhost:3000"
).replace(/\/+$/, "");

// Helper to attach the Firebase ID token (JWT) to API requests.
export function authHeaders(extra: Record<string, string> = {}) {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}