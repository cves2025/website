import { useEffect } from "react";
import Modal from "../../custom-components/Modal";
import { latestRelease } from "./latestRelease";

interface WhatsNewModalProps {
  open: boolean;
  /** Single dismiss handler - every close action goes through this. */
  onClose: () => void;
}

/**
 * One-time "What's New" release announcement.
 *
 * Reuses the shared Modal: the X icon and the footer "Got it" button, plus the
 * Escape key, all call the same `onClose` handler supplied by `useWhatsNew`,
 * so the seen-state write can never run twice.
 */
function WhatsNewModal({ open, onClose }: WhatsNewModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      onSubmit={onClose}
      title="What's New"
      titleStyle="text-left"
      hideSubmit
      cancelText="Got it"
      modalClassName="max-w-lg"
    >
      <h3 className="mt-3 text-lg font-bold text-gray-800">
        {latestRelease.title}
      </h3>

      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
        {latestRelease.description}
      </p>

      {latestRelease.highlights.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm text-gray-700">
          {latestRelease.highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default WhatsNewModal;
