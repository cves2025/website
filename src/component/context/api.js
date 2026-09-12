// Central place for the backend URL.
// Falls back to the local server during development when VITE_API_URL is not set.
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

// Helper to attach the Firebase ID token (JWT) to API requests.
export function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}