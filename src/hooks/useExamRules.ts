import { useEffect, useState } from "react";
import {
  DEFAULT_EXAM_RULES,
  type ExamRules,
} from "../utils/examRules";
import {
  getCachedExamRules,
  loadExamRules,
  setCachedExamRules,
  subscribeExamRules,
} from "../utils/examRulesService";

export interface ExamRulesState {
  /** The effective rules (defaults only until the real ones are read). */
  rules: ExamRules;
  /** True while the first read of the rules is still in flight. */
  loading: boolean;
  /**
   * Non-null when the rules FAILED to load (network/permission). When set, the
   * `rules` value above is NOT cached as if it were real - screens must warn
   * the user and must not store results/ranks based on them.
   */
  error: string | null;
  /** Retries the load (used by the error banner). */
  reload: () => void;
}

/**
 * Shared exam rules for screens that display results/ranks. One module-level
 * cache means every page shares the same copy; when `saveExamRules` replaces
 * the cache, all mounted hooks re-render with the new rules immediately
 * (no reload needed).
 */
export function useExamRules(): ExamRulesState {
  const [rules, setRules] = useState<ExamRules>(
    () => getCachedExamRules() ?? DEFAULT_EXAM_RULES
  );
  const [loading, setLoading] = useState<boolean>(
    () => getCachedExamRules() === null
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeExamRules((next) => {
      setRules(next);
      setLoading(false);
      setError(null);
    });

    const cached = getCachedExamRules();
    if (cached) {
      setRules(cached);
      setLoading(false);
      setError(null);
      return unsubscribe;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    loadExamRules()
      .then((next) => {
        if (cancelled) return;
        setCachedExamRules(next);
        setRules(next);
        setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("Failed to load exam rules:", loadError);
        // Deliberately NOT cached: the defaults are not the real settings.
        setError("Could not load exam settings (rank and pass rules).");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [reloadNonce]);

  return {
    rules,
    loading,
    error,
    reload: () => setReloadNonce((value) => value + 1),
  };
}