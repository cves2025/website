import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type Side = "top" | "bottom";

interface TooltipProps {
  /** What the tooltip says (text or small markup). Empty = no tooltip. */
  content: ReactNode;
  /** The element it explains (a button, an icon ...). */
  children: ReactNode;
  /** Preferred side; it flips when there is no room. */
  side?: Side;
  /** Wait before it shows, in ms. */
  delay?: number;
  /** Extra classes for the wrapper around `children`. */
  className?: string;
}

const GAP = 8;
const EDGE = 8;

/**
 * App-wide tooltip: a small navy bubble with an arrow, shown on hover (after
 * a short delay) and on keyboard focus, hidden on leave, blur or Esc. Drawn
 * in a portal so no overflow or z-index cuts it; flips to the other side
 * near a screen edge. Use it instead of the `title` attribute.
 *
 *   <Tooltip content="Lock now"><button ... /></Tooltip>
 */
function Tooltip({ content, children, side = "bottom", delay = 250, className = "" }: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number; side: Side; arrow: number } | null>(null);

  const show = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setOpen(false);
    setPlace(null);
  }, []);

  // Position next to the anchor, inside the screen.
  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current?.getBoundingClientRect();
    const bubble = bubbleRef.current?.getBoundingClientRect();
    if (!anchor || !bubble) return;
    const roomBelow = window.innerHeight - anchor.bottom;
    const roomAbove = anchor.top;
    const finalSide: Side =
      side === "bottom"
        ? roomBelow < bubble.height + GAP && roomAbove > roomBelow
          ? "top"
          : "bottom"
        : roomAbove < bubble.height + GAP && roomBelow > roomAbove
          ? "bottom"
          : "top";
    const center = anchor.left + anchor.width / 2;
    const left = Math.min(Math.max(center - bubble.width / 2, EDGE), window.innerWidth - bubble.width - EDGE);
    const top = finalSide === "bottom" ? anchor.bottom + GAP : anchor.top - bubble.height - GAP;
    setPlace({ top, left, side: finalSide, arrow: Math.min(Math.max(center - left, 12), bubble.width - 12) });
  }, [open, side, content]);

  // Esc, scrolling or resizing hides it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open, hide]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  if (content === null || content === undefined || content === "") return <>{children}</>;

  return (
    <>
      <span
        ref={anchorRef}
        className={`inline-flex ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onMouseDown={hide}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={bubbleRef}
            id={id}
            role="tooltip"
            className={`pointer-events-none fixed z-[80] max-w-[16rem] rounded-lg bg-navy px-3 py-1.5 text-xs font-medium leading-snug text-white shadow-[0_8px_24px_-6px_rgba(15,31,75,0.55)] ring-1 ring-white/10 transition-[opacity,transform] duration-150 ${
              place ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            style={{ top: place?.top ?? -9999, left: place?.left ?? -9999 }}
          >
            {content}
            {place && (
              <span
                aria-hidden
                className={`absolute h-2.5 w-2.5 rotate-45 bg-navy ${place.side === "bottom" ? "-top-1" : "-bottom-1"}`}
                style={{ left: place.arrow - 5 }}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export default Tooltip;
