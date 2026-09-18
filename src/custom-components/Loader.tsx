interface LoaderProps {
  /** Text shown under the spinner. Pass an empty string to hide it. */
  label?: string;
  /**
   * true (default) covers the whole viewport with a centered loader - used
   * while the app is restoring the login session. false renders just the
   * spinner so it can be dropped inside a card or a section.
   */
  fullScreen?: boolean;
  className?: string;
}

/**
 * Reusable loading indicator (spinner + optional label).
 */
function Loader({
  label = "Loading...",
  fullScreen = true,
  className = "",
}: LoaderProps) {
  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <span
        role="status"
        aria-label={label || "Loading"}
        className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
      />
      {label && (
        <p className="text-sm font-semibold text-gray-600">{label}</p>
      )}
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/90">
      {content}
    </div>
  );
}

export default Loader;
