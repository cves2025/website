import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import toast from "react-hot-toast";
import { Eye, Trash2, Upload } from "lucide-react";

import Modal from "../../../../custom-components/Modal";
import PageHeader from "../../../../custom-components/PageHeader";
import SelectDropdown from "../../../../custom-components/SelectDropdown";
import { Button as UIButton } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  generateAcademicYears,
  nextAcademicYear,
} from "../../../../utils/generateAcademicYears";
import {
  DOWNLOAD_CATEGORIES,
  DOWNLOAD_CLASS_ROWS,
  MAX_DOWNLOAD_FILE_SIZE,
  deleteDownloadFile,
  downloadCategoryLabel,
  downloadClassLabel,
  downloadDocId,
  setDownloadPublished,
  subscribeDownloads,
  uploadDownloadFile,
  type DownloadCategory,
  type DownloadFile,
} from "../../../../utils/downloadsService";
import { myContext } from "../../../context/MyContextProvider";
import { CVES_BUTTON } from "../../../../constants";

const academicYears = generateAcademicYears();
const CURRENT_YEAR = academicYears[0]?.value ?? "";

/** Every session so far, plus the next one (files are often ready early). */
const SESSION_OPTIONS = [
  ...(nextAcademicYear(CURRENT_YEAR)
    ? [
        {
          value: nextAcademicYear(CURRENT_YEAR),
          label: `${nextAcademicYear(CURRENT_YEAR)} (next session)`,
        },
      ]
    : []),
  ...academicYears.map((year) => ({
    value: year.value,
    label: year.value === CURRENT_YEAR ? `${year.label} (current)` : year.label,
  })),
];

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(ms: number): string {
  return ms
    ? new Date(ms).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";
}

/**
 * Settings > Downloads: one PDF per class (or one for all classes) for every
 * type and session. Files of every session stay saved and can be opened
 * here; the public Downloads page shows the current session only.
 */
function DownloadsManager() {
  const { user } = useContext(myContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<DownloadCategory>(
    DOWNLOAD_CATEGORIES[0].value
  );
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR);
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** The class row whose file picker is open / uploading. */
  const [pickingClass, setPickingClass] = useState<string | null>(null);
  const [uploadingClass, setUploadingClass] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<DownloadFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!academicYear) return;
    setLoading(true);
    return subscribeDownloads(
      { academicYear, publishedOnly: false },
      (next) => {
        setFiles(next);
        setError(null);
        setLoading(false);
      },
      (loadError) => {
        console.error("Failed to load downloads:", loadError);
        setError("The files could not be loaded. Please reload the page.");
        setLoading(false);
      }
    );
  }, [academicYear]);

  const fileByClass = useMemo(() => {
    const map = new Map<string, DownloadFile>();
    files
      .filter((file) => file.category === category)
      .forEach((file) => map.set(file.className, file));
    return map;
  }, [files, category]);

  const openPicker = (className: string) => {
    setPickingClass(className);
    fileInputRef.current?.click();
  };

  const handlePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const className = pickingClass;
    setPickingClass(null);
    if (!file || !className) return;

    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_DOWNLOAD_FILE_SIZE) {
      toast.error(
        `The file is ${formatSize(file.size)}; the limit is ${formatSize(MAX_DOWNLOAD_FILE_SIZE)}.`
      );
      return;
    }

    const existing = fileByClass.get(className);
    setUploadingClass(className);
    try {
      await uploadDownloadFile({
        category,
        academicYear,
        className,
        file,
        // A replaced file keeps its Show / Hide setting; a new one is shown.
        isPublished: existing ? existing.isPublished : true,
        updatedBy: user?.uid ?? "",
      });
      toast.success(
        `${downloadCategoryLabel(category)} of ${downloadClassLabel(className)} ${
          existing ? "replaced" : "uploaded"
        }.`
      );
    } catch (uploadError) {
      console.error("Failed to upload the file:", uploadError);
      toast.error("Failed to upload the file. Please try again.");
    } finally {
      setUploadingClass(null);
    }
  };

  const handleToggle = async (file: DownloadFile, next: boolean) => {
    setTogglingId(file.id);
    try {
      await setDownloadPublished(file.id, next);
    } catch (toggleError) {
      console.error("Failed to change file visibility:", toggleError);
      toast.error("Could not change it. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteDownloadFile(toDelete.id);
      toast.success("File deleted.");
      setToDelete(null);
    } catch (deleteError) {
      console.error("Failed to delete the file:", deleteError);
      toast.error("Failed to delete the file. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const uploadedCount = fileByClass.size;
  const isCurrent = academicYear === CURRENT_YEAR;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Downloads"
        titleStyle="text-primaryBlue"
        description="PDFs of the Downloads page. Files of every session are kept here; the Downloads page shows the current session only."
        descriptionStyle="text-gray-500"
      />

      <div className="flex flex-wrap items-end gap-4 rounded-lg bg-white px-4 py-3">
        <div>
          <Label className="mb-1 block font-bold">Type</Label>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {DOWNLOAD_CATEGORIES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={`rounded-md px-4 py-1.5 text-sm font-bold transition-colors ${
                  category === option.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-56">
          <Label htmlFor="downloads-session" className="mb-1 block font-bold">
            Session
          </Label>
          <SelectDropdown
            id="downloads-session"
            value={academicYear}
            onValueChange={setAcademicYear}
            options={SESSION_OPTIONS}
          />
        </div>
      </div>

      {!isCurrent && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Files of {academicYear} are saved here but are not shown on the
          Downloads page, which only shows the current session ({CURRENT_YEAR}).
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => void handlePicked(event)}
      />

      {loading ? (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500">
          Loading files...
        </p>
      ) : error ? (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
            {downloadCategoryLabel(category)} {academicYear}:{" "}
            <b>{uploadedCount}</b> of {DOWNLOAD_CLASS_ROWS.length} uploaded
          </p>
          <ul className="divide-y divide-gray-100">
            {DOWNLOAD_CLASS_ROWS.map((className) => {
              const file = fileByClass.get(className);
              const uploading = uploadingClass === className;
              const fileId = downloadDocId(category, academicYear, className);
              return (
                <li
                  key={fileId}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span className="w-28 shrink-0 text-sm font-bold text-gray-800">
                    {downloadClassLabel(className)}
                  </span>

                  <div className="min-w-0 flex-1 text-sm">
                    {uploading ? (
                      <span className="font-semibold text-blue-600">Uploading...</span>
                    ) : file ? (
                      <>
                        <p className="truncate font-medium text-gray-800">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatSize(file.fileSize)}
                          {file.updatedAt ? ` · ${formatDate(file.updatedAt)}` : ""}
                        </p>
                      </>
                    ) : (
                      <span className="italic text-gray-400">No file</span>
                    )}
                  </div>

                  {file && (
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <Switch
                        checked={file.isPublished}
                        onCheckedChange={(next) => void handleToggle(file, next)}
                        disabled={togglingId === file.id || uploading}
                        aria-label={`Show ${downloadClassLabel(className)} on the Downloads page`}
                      />
                      {file.isPublished ? "Shown" : "Hidden"}
                    </label>
                  )}

                  <div className="flex gap-1.5">
                    {file && (
                      <UIButton
                        asChild
                        size="icon"
                        title="Open"
                        className="h-8 w-8 bg-gray-600 text-white hover:bg-gray-700"
                      >
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${file.fileName}`}
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </UIButton>
                    )}
                    <UIButton
                      type="button"
                      size="sm"
                      onClick={() => openPicker(className)}
                      disabled={uploadingClass !== null}
                      className={`h-8 gap-1.5 text-white ${CVES_BUTTON}`}
                    >
                      <Upload className="h-4 w-4" />
                      {file ? "Replace" : "Upload"}
                    </UIButton>
                    {file && (
                      <UIButton
                        type="button"
                        size="icon"
                        variant="destructive"
                        title="Delete"
                        aria-label={`Delete ${file.fileName}`}
                        onClick={() => setToDelete(file)}
                        disabled={uploading}
                        className="h-8 w-8 bg-red-600 text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </UIButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Modal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete File"
        description={
          toDelete
            ? `Delete ${toDelete.fileName}? It disappears from the Downloads page. This cannot be undone.`
            : ""
        }
        submitText="Delete"
        submitClassName={CVES_BUTTON}
        loading={deleting}
        onSubmit={handleDelete}
      />
    </div>
  );
}

export default DownloadsManager;
