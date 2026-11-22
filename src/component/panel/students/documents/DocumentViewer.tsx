/**
 * Shows one document file (photo or PDF) over the page. The file is read with
 * getBlob (through the Storage rules) into an object URL, freed on close; no
 * link to the file is ever kept. Esc, x or a click outside closes it.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";

import { Spinner } from "../../../../custom-components/Loader";
import { documentFileName, openDocumentFile } from "../../../../utils/studentDocumentsService";
import type { StudentDocumentFile } from "../../../../utils/type";

interface DocumentViewerProps {
  file: StudentDocumentFile | null;
  title: string;
  onClose: () => void;
  /** Admin: a Download button (saves the file already opened; no link is kept). */
  canDownload?: boolean;
}

const downloadName = (title: string, file: StudentDocumentFile) => documentFileName(title, file.contentType);

function DocumentViewer({ file, title, onClose, canDownload = false }: DocumentViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let made = "";
    setUrl(null);
    setError("");
    openDocumentFile(file.path)
      .then((next) => {
        made = next;
        if (cancelled) URL.revokeObjectURL(next);
        else setUrl(next);
      })
      .catch((cause) => {
        console.error("Document could not be opened.", cause);
        if (!cancelled) setError("The file could not be opened. Check the internet and try again.");
      });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, onClose]);

  if (!file) return null;
  const isPdf = file.contentType === "application/pdf";

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/70 p-4 print:hidden"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
          <p className="mr-auto min-w-0 truncate text-sm font-bold text-gray-900">{title}</p>
          {canDownload && url && (
            <a
              href={url}
              download={downloadName(title, file)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-light"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-700 hover:text-[#ad1a6f]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50">
          {error ? (
            <p className="p-6 text-sm font-medium text-red-600">{error}</p>
          ) : !url ? (
            <Spinner size="md" label="Opening the file" />
          ) : isPdf ? (
            <iframe src={url} title={title} className="h-full w-full border-0" />
          ) : (
            <img src={url} alt={title} className="max-h-full max-w-full object-contain" />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DocumentViewer;
