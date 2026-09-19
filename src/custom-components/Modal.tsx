import React from "react";
import { FaTimes } from "react-icons/fa";
import Button from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleStyle?: string;
  description?: string;
  children?: React.ReactNode;
  cancelText?: string;
  submitText?: string;
  onSubmit: () => void;
  loading?: boolean;
  submitDisabled?: boolean;
  /** When true only the Cancel button (and the cross) are shown. */
  hideSubmit?: boolean;
  /** Extra Tailwind classes merged onto the Submit button. */
  submitClassName?: string;
  /** Extra Tailwind classes for the dialog box (default "max-w-md"). */
  modalClassName?: string;
  /** When set, a "Change Exam" action button is shown in the footer. */
  onChangeExam?: () => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  titleStyle,
  description,
  children,
  cancelText = "Cancel",
  submitText = "Submit",
  onSubmit,
  loading = false,
  submitDisabled = false,
  hideSubmit = false,
  submitClassName = "",
  modalClassName = "max-w-md",
  onChangeExam,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${modalClassName} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg bg-white p-6 shadow-xl`}
      >
        {/* Close (cross) button — right top corner */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaTimes className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className={`${titleStyle}`}>
        <h2 className={`pr-8 text-lg font-semibold text-gray-900`}>
          {title}
        </h2>
        </div>

        {/* Description */}
        {description && (
          <p className="mt-2 text-sm text-gray-600">
            {description}
          </p>
        )}

        {/* Body content */}
        {children}

        {/* Actions — the modal closes ONLY through the cross or Cancel button
            so a half-filled form is never lost by an accidental outside click. */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>

          {!hideSubmit && (
            <button
              type="button"
              onClick={() => onSubmit()}
              disabled={loading || submitDisabled}
              className={`rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${submitClassName}`}
            >
              {loading ? "Please wait..." : submitText}
            </button>
          )}

          {onChangeExam && (
            <Button
              type="button"
              buttonName="Change Exam"
              onClick={onChangeExam}
              variant="success"
              size="md"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;