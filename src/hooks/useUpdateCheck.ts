import { useEffect } from "react";

const POLL_INTERVAL_MS = 60_000;
const LAST_RELOAD_ATTEMPT_KEY = "cves:autoUpdateReloadedForVersion";

/**
 * Automatically polls /version.json in the background and silently reloads the
 * page to the latest deployment whenever a newer version is detected.
 *
 * - Checks every 60s, on window focus, and whenever the tab becomes visible.
 * - Stale service workers/caches are cleared before reloading so the fresh
 *   bundle is actually served.
 * - Reloads only once per detected version (sessionStorage guard) to avoid a
 *   reload loop while a deploy is still propagating.
 * - Fetch/cache failures are silently ignored (offline / transient errors).
 * - Completely disabled in development mode.
 */
export function useUpdateCheck(): void {
  useEffect(() => {
    // No auto-update during local development.
    if (import.meta.env.DEV) return;

    const checkForUpdate = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = (await res.json()) as { version?: string };
        if (!data.version || data.version === __APP_VERSION__) return;

        // Already reloaded for this exact version once — a deploy may still be
        // propagating the old bundle. Don't reload in a loop.
        if (sessionStorage.getItem(LAST_RELOAD_ATTEMPT_KEY) === data.version) {
          return;
        }

        sessionStorage.setItem(LAST_RELOAD_ATTEMPT_KEY, data.version);
        await clearCachesAndReload();
      } catch {
        // Silently ignore network/parse/storage failures.
      }
    };

    checkForUpdate();

    const intervalId = window.setInterval(checkForUpdate, POLL_INTERVAL_MS);

    const handleFocus = () => {
      checkForUpdate();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}

/**
 * Unregisters any service workers, clears all caches, then reloads the page.
 * A fresh cache-busting query param guarantees the reload bypasses any cached
 * index.html and fetches the latest one from the server.
 */
async function clearCachesAndReload() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    const url = new URL(window.location.href);
    url.searchParams.set("v", Date.now().toString());
    window.location.replace(url.toString());
  }
}