import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";

interface PhotoUploadBoxProps {
  label: string;
  /** Existing (already uploaded) photo URL, if any. */
  photoUrl?: string;
  /** Fires with the picked file, or null when the user removes the photo. */
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
  /**
   * Optional key identifying this box in the parent's copy-paste routing
   * (e.g. "student" | "mother" | "father"). When set together with
   * `registerPasteTarget`, the box registers its internal file handler, so the
   * parent can push an image pasted from the clipboard into this box exactly
   * like a file pick. Focus changes are reported through `onActiveChange`.
   */
  pasteKey?: string;
  /** Registers (key -> handler) or unregisters (key -> null) this box. */
  registerPasteTarget?: (
    key: string,
    handler: ((file: File | null) => void) | null
  ) => void;
  /** Reports whether this box (or something inside it) has keyboard focus. */
  onActiveChange?: (active: boolean) => void;
}

/**
 * Pulls the first image file from a drag-and-drop payload. Works for image
 * files dragged in from the OS file manager (`dataTransfer.files`) as well as
 * images dragged out of another page or browser tab (`dataTransfer.items`).
 */
function imageFileFromDrop(
  dataTransfer: DataTransfer | null | undefined
): File | null {
  if (!dataTransfer) return null;

  const file = Array.from(dataTransfer.files).find((entry) =>
    entry.type.toLowerCase().startsWith("image/")
  );
  if (file) return file;

  for (const item of Array.from(dataTransfer.items)) {
    if (item.type.toLowerCase().startsWith("image/")) {
      const droppedFile = item.getAsFile();
      if (droppedFile) return droppedFile;
    }
  }
  return null;
}

/**
 * Click-to-upload photo box used for the student/father/mother photos on the
 * admission form. Supports clicking to pick a file, dragging & dropping an
 * image onto the box, and (once wired up by the parent) clipboard paste.
 * Purely a UI + local-preview component — it never talks to Firebase itself,
 * so it can be reused anywhere a photo needs picking. The parent owns the
 * actual upload (see studentPhotos.ts) and passes the resulting URL back in
 * as `photoUrl` once known.
 */
function PhotoUploadBox({
  label,
  photoUrl,
  onFileSelected,
  disabled,
  className = "",
  pasteKey,
  registerPasteTarget,
  onActiveChange,
}: PhotoUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Local object URLs must be revoked to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleFile = (file: File | null) => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    if (file) {
      setLocalPreview(URL.createObjectURL(file));
    }
    onFileSelected(file);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    // Without preventDefault() the browser refuses the drop entirely.
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    // Crossing over the inner button/links still fires dragleave on the box,
    // so only clear the highlight once the cursor truly leaves this box.
    const leavingTo = event.relatedTarget as Node | null;
    if (leavingTo && event.currentTarget.contains(leavingTo)) return;
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setIsDragOver(false);
    handleFile(imageFileFromDrop(event.dataTransfer));
  };

  // Lets the parent form push an image pasted from the clipboard into this box
  // through the exact same path as a file pick (preview + onFileSelected).
  useEffect(() => {
    if (!pasteKey || !registerPasteTarget) return;
    registerPasteTarget(pasteKey, handleFile);
    return () => registerPasteTarget(pasteKey, null);
  });

  const displayUrl = localPreview || photoUrl;

  return (
    <div
      data-photo-upload={pasteKey}
      onFocusCapture={() => onActiveChange?.(true)}
      onBlurCapture={() => onActiveChange?.(false)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col items-center gap-1 ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`relative h-28 w-24 overflow-hidden border-2 text-center text-xs font-semibold text-slate-600 transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${
          isDragOver
            ? "border-blue-500 ring-2 ring-blue-400 ring-offset-1"
            : "border-pink-600"
        }`}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center whitespace-pre-line px-1">
            {label}
          </span>
        )}

        {isDragOver && (
          <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-blue-500/40 text-[11px] font-bold text-white">
            Drop to upload
          </span>
        )}
      </button>

      {displayUrl && !disabled && (
        <button
          type="button"
          onClick={() => {
            handleFile(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="text-[11px] font-semibold text-red-600 hover:underline"
        >
          Remove
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          handleFile(file);
        }}
      />
    </div>
  );
}

export default PhotoUploadBox;