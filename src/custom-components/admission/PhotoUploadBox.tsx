import { useEffect, useRef, useState } from "react";

interface PhotoUploadBoxProps {
  label: string;
  /** Existing (already uploaded) photo URL, if any. */
  photoUrl?: string;
  /** Fires with the picked file, or null when the user removes the photo. */
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
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

  const displayUrl = localPreview || photoUrl;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
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