import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** The nearest ancestor that scrolls (null = the page itself). */
export function scrollParentOf(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return null;
}

/**
 * True once at least `hiddenPart` (0-1, default all) of the `sentinelRef`
 * element has scrolled out above the scroll area (false while it is in view
 * or still below). Used to show a sticky stand-in at the top while the real
 * element is going out of sight.
 */
export function useIsStuck(
  sentinelRef: RefObject<HTMLElement | null>,
  enabled = true,
  hiddenPart = 1
) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!enabled || !sentinel) {
      setStuck(false);
      return;
    }
    const visibleNeeded = 1 - hiddenPart;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const top = entry.rootBounds?.top ?? 0;
        const aboveTop = entry.boundingClientRect.top < top;
        setStuck(aboveTop && (!entry.isIntersecting || entry.intersectionRatio <= visibleNeeded));
      },
      // Called when the visible part crosses the limit, and at in / out.
      { root: scrollParentOf(sentinel), threshold: [0, visibleNeeded, 1] }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelRef, enabled, hiddenPart]);

  return stuck;
}

export default useIsStuck;
