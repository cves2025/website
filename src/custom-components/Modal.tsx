import React from "react";
import Button from "./Button";
import { Button as UIButton } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  /** Optional second action shown between Cancel and Submit (e.g. "Move to Recycle Bin"). */
  secondaryText?: string;
  /** Callback of the secondary action button. */
  onSecondarySubmit?: () => void;
  /** Extra Tailwind classes merged onto the secondary action button. */
  secondaryClassName?: string;
  /** Shows "Please wait..." on the secondary button and disables it. */
  secondaryLoading?: boolean;
  /** Extra Tailwind classes for the dialog box (default "max-w-md"). */
  modalClassName?: string;
  /** When set, a "Change Exam" action button is shown in the footer. */
  onChangeExam?: () => void;
}

/**
 * App-wide modal built on the shadcn/ui Dialog.
 *
 * The dialog is non-modal in Radix terms (`modal={false}`) and draws its own
 * backdrop: this keeps the old behaviour of no focus trap / no body
 * pointer-lock, so dropdowns that portal to document.body (e.g.
 * SearchableMultiSelect) keep working inside the modal.
 */
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
  secondaryText,
  onSecondarySubmit,
  secondaryClassName = "",
  secondaryLoading = false,
  modalClassName = "max-w-md",
  onChangeExam,
}) => {
  return (
    <Dialog
      open={isOpen}
      modal={false}
      onOpenChange={(open) => {
        // Only the cross reaches here (outside click / Esc are blocked below);
        // like the old disabled cross, it does nothing while loading.
        if (!open && !loading) onClose();
      }}
    >
      {isOpen && (
        <DialogPortal>
          <div className="fixed inset-0 z-50 bg-black/50" aria-hidden="true" />
        </DialogPortal>
      )}
      <DialogContent
        // The modal closes ONLY through the cross or Cancel button so a
        // half-filled form is never lost by an accidental outside click / Esc.
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 rounded-lg border-0 bg-white p-0 shadow-xl sm:rounded-lg [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:z-10 [&>button:last-child>svg]:h-5 [&>button:last-child>svg]:w-5",
          modalClassName
        )}
      >
        <div className="overflow-y-auto p-6">
          {/* Title */}
          <div className={titleStyle}>
            <DialogTitle className="pr-8 text-lg font-semibold text-gray-900">
              {title}
            </DialogTitle>
          </div>

          {/* Description */}
          {description && (
            <DialogDescription className="mt-2 text-sm text-gray-600">
              {description}
            </DialogDescription>
          )}

          {/* Body content */}
          {children}

          {/* Actions */}
          <DialogFooter className="mt-6 flex-row justify-end gap-3 sm:space-x-0">
            <UIButton
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {cancelText}
            </UIButton>

            {secondaryText && (
              <UIButton
                type="button"
                variant="outline"
                onClick={() => onSecondarySubmit?.()}
                disabled={loading || secondaryLoading}
                className={cn(
                  "border-gray-300 text-gray-700 hover:bg-gray-50",
                  secondaryClassName
                )}
              >
                {secondaryLoading ? "Please wait..." : secondaryText}
              </UIButton>
            )}

            {!hideSubmit && (
              <UIButton
                type="button"
                onClick={() => onSubmit()}
                disabled={loading || submitDisabled}
                className={cn(
                  "bg-blue-600 text-white hover:bg-blue-700",
                  submitClassName
                )}
              >
                {loading ? "Please wait..." : submitText}
              </UIButton>
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
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
