import { useCallback, useEffect, useState } from "react";

/**
 * Loads data with `load` and reloads it whenever `deps` change (or on
 * `reload()`). A load that finishes after the deps changed is dropped, so
 * a slow answer never overwrites a newer one. Pass `enabled: false` to wait
 * (e.g. until a student is picked); `data` is then `initial`.
 */
export function useAsyncData<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  options: { initial: T; enabled?: boolean; errorMessage: string }
) {
  const { initial, enabled = true, errorMessage } = options;
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setData(initial);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((cause) => {
        console.error(errorMessage, cause);
        if (!cancelled) setError(errorMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `load` and `initial` are rebuilt every render; `deps` says when to reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { data, setData, loading, error, reload };
}

export default useAsyncData;
