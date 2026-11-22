import { useEffect, useRef, useState } from "react";

import { COUNT_UP_MS } from "../constants";

/** True when the user asked the system for less motion. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that glides to `target` (from where it was: 0 at first, the old
 * value when it changes) in `duration` ms, easing out. At once with reduced
 * motion. Also used as a 0 -> 1 progress (`useCountUp(ready ? 1 : 0)`) to fill
 * rings and bars together with the numbers.
 */
export function useCountUp(target: number, duration = COUNT_UP_MS): number {
  const [shown, setShown] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const begin = current.current;
    const start = performance.now();
    const instant = prefersReducedMotion() || duration <= 0;
    let frame = 0;
    const step = (now: number) => {
      const t = instant ? 1 : Math.min(1, (now - start) / duration);
      current.current = begin + (target - begin) * easeOutCubic(t);
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return shown;
}
