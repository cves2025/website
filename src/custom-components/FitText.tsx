import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";

interface FitTextProps {
  children: ReactNode;
  /** Classes for the outer block (width / alignment / flex sizing). */
  className?: string;
  /** Smallest allowed size as a fraction of the original font size. */
  minScale?: number;
}

/**
 * Keeps its content on ONE line. If the text is wider than the available
 * space, the font size is reduced until it fits. Short text is untouched.
 * Re-fits on resize, font load and before/after printing.
 */
function FitText({ children, className = "", minScale = 0.5 }: FitTextProps) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  const fit = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    inner.style.fontSize = "";
    const available = outer.clientWidth;
    if (available <= 0) return;

    const baseSize = parseFloat(getComputedStyle(inner).fontSize);
    if (!baseSize || inner.offsetWidth <= available) return;

    const minSize = baseSize * minScale;
    let size = baseSize;
    // A few passes because glyph widths don't scale perfectly linearly.
    for (let i = 0; i < 4; i += 1) {
      const width = inner.offsetWidth;
      if (width <= available || size <= minSize) break;
      size = Math.max(minSize, size * (available / width) * 0.99);
      inner.style.fontSize = `${size}px`;
    }
  }, [minScale]);

  useLayoutEffect(() => {
    fit();
  });

  useEffect(() => {
    const outer = outerRef.current;
    const refit = () => {
      fit();
      requestAnimationFrame(fit);
      window.setTimeout(fit, 150);
    };

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (outer && observer) observer.observe(outer);

    const printQuery = window.matchMedia("print");
    window.addEventListener("beforeprint", refit);
    window.addEventListener("afterprint", refit);
    window.addEventListener("resize", fit);
    printQuery.addEventListener?.("change", refit);
    void document.fonts?.ready.then(fit);

    return () => {
      observer?.disconnect();
      window.removeEventListener("beforeprint", refit);
      window.removeEventListener("afterprint", refit);
      window.removeEventListener("resize", fit);
      printQuery.removeEventListener?.("change", refit);
    };
  }, [fit]);

  return (
    <span
      ref={outerRef}
      className={`block w-full min-w-0 overflow-hidden whitespace-nowrap ${className}`}
    >
      <span ref={innerRef} className="inline-block whitespace-nowrap">
        {children}
      </span>
    </span>
  );
}

export default FitText;