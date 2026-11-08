import { useCallback, useRef, useState } from "react";

/**
 * A value with Undo / Redo. `set` records a step; `preview` changes the
 * value without one (while dragging) and `commit` then records the drag as
 * a single step, from where it started.
 */
export function useHistoryState<T>(initial: T, limit: number) {
  const [state, setState] = useState({ past: [] as T[], present: initial, future: [] as T[] });
  // Value before a drag started (preview without a step).
  const pending = useRef<T | null>(null);

  const push = (past: T[], value: T) => [...past, value].slice(-limit);

  const set = useCallback(
    (next: T | ((current: T) => T)) =>
      setState((current) => {
        const value = typeof next === "function" ? (next as (c: T) => T)(current.present) : next;
        if (value === current.present) return current;
        return { past: push(current.past, current.present), present: value, future: [] };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limit]
  );

  const preview = useCallback((next: (current: T) => T) => {
    setState((current) => {
      if (pending.current === null) pending.current = current.present;
      return { ...current, present: next(current.present) };
    });
  }, []);

  const commit = useCallback(
    () =>
      setState((current) => {
        const start = pending.current;
        pending.current = null;
        if (start === null || start === current.present) return current;
        return { past: push(current.past, start), present: current.present, future: [] };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limit]
  );

  const undo = useCallback(
    () =>
      setState((current) =>
        current.past.length === 0
          ? current
          : {
              past: current.past.slice(0, -1),
              present: current.past[current.past.length - 1],
              future: [current.present, ...current.future],
            }
      ),
    []
  );

  const redo = useCallback(
    () =>
      setState((current) =>
        current.future.length === 0
          ? current
          : { past: push(current.past, current.present), present: current.future[0], future: current.future.slice(1) }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limit]
  );

  /** Starts over from `value` with no history. */
  const replace = useCallback((value: T) => setState({ past: [], present: value, future: [] }), []);

  return {
    value: state.present,
    set,
    preview,
    commit,
    undo,
    redo,
    replace,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}

export default useHistoryState;
