import { useEffect, useRef, useState } from "react";

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
 * Click-to-upload photo box used for the student/father/mother photos on the
 * admission form. Purely a UI + local-preview component — it never talks to
 * Firebase itself, so it can be reused anywhere a photo needs picking. The
 * parent owns the actual upload (see studentPhotos.ts) and passes the
 * resulting URL back in as `photoUrl` once known.
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
      className={`flex flex-col items-center gap-1 ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="relative h-28 w-24 overflow-hidden border-2 border-pink-600 text-center text-xs font-semibold text-slate-600 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
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