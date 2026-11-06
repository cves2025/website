import type { CSSProperties } from "react";

type SpinnerSize = "xs" | "sm" | "md" | "lg";

/** Diameter and ring thickness (px) of each size. */
const SIZES: Record<SpinnerSize, { box: number; ring: number }> = {
  xs: { box: 16, ring: 2.5 },
  sm: { box: 24, ring: 3 },
  md: { box: 44, ring: 5 },
  lg: { box: 64, ring: 6 },
};

interface SpinnerProps {
  size?: SpinnerSize;
  /** "cves" (school colours) on light ground; "white" inside coloured buttons. */
  tone?: "cves" | "white";
  className?: string;
  /** Read out by screen readers; "" when a label is shown next to it. */
  label?: string;
}

/**
 * The app's spinner: a ring in the school colours (bg-cves-ring) that
 * turns. `xs` / `sm` fit inside buttons and inputs.
 */
export function Spinner({ size = "sm", tone = "cves", className = "", label = "Loading" }: SpinnerProps) {
  const { box, ring } = SIZES[size];
  if (tone === "white") {
    return (
      <span
        role={label ? "status" : undefined}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : true}
        style={{ width: box, height: box, borderWidth: ring }}
        className={`inline-block shrink-0 animate-spin rounded-full border-white/35 border-t-white [animation-duration:0.8s] ${className}`}
      />
    );
  }
  // Cuts the middle out of the coloured disc, leaving the ring.
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px + 0.5px))`;
  const style: CSSProperties = { width: box, height: box, mask, WebkitMask: mask };
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      style={style}
      className={`inline-block shrink-0 animate-spin rounded-full bg-cves-ring [animation-duration:0.8s] motion-reduce:[animation-duration:2s] ${className}`}
    />
  );
}

interface LoaderProps {
  /** Text shown under the spinner. Pass an empty string to hide it. */
  label?: string;
  /**
   * true (default) covers the whole viewport with a centered loader - used
   * while the app is restoring the login session or a page loads. false
   * renders just the spinner so it can be dropped inside a card or section.
   */
  fullScreen?: boolean;
  /** Spinner size; defaults to lg full screen and md inline. */
  size?: SpinnerSize;
  className?: string;
}

/**
 * The app-wide loading indicator: the school-colour spinner with an
 * optional label, full screen or inside a card.
 */
function Loader({ label = "Loading...", fullScreen = true, size, className = "" }: LoaderProps) {
  const spinnerSize = size ?? (fullScreen ? "lg" : "md");
  const small = spinnerSize === "xs" || spinnerSize === "sm";
  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center ${small ? "flex-row gap-2 py-3" : "flex-col gap-3 py-6"} ${className}`}
    >
      <Spinner size={spinnerSize} label="" />
      {label ? (
        <p className={`font-semibold text-gray-600 ${small ? "text-sm" : "text-sm tracking-wide"}`}>{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm">
      <div className="rounded-2xl bg-white/90 px-10 py-6 shadow-xl ring-1 ring-gray-200">{content}</div>
    </div>
  );
}

export default Loader;
