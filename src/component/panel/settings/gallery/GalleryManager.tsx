import { useContext, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";

import Button from "../../../../custom-components/Button";
import Modal from "../../../../custom-components/Modal";
import PageHeader from "../../../../custom-components/PageHeader";
import { Button as UIButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  deleteGalleryPhoto,
  importLegacyGallery,
  setGalleryCaption,
  setGalleryPublished,
  subscribeGallery,
  subscribeGalleryImported,
  uploadGalleryPhotos,
  type GalleryPhoto,
} from "../../../../utils/galleryService";
import { LEGACY_GALLERY_PHOTOS } from "../../../../utils/legacyGallery";
import { myContext } from "../../../context/MyContextProvider";
import SchoolPhotoCard from "./SchoolPhotoCard";

interface Progress {
  label: string;
  done: number;
  total: number;
}

/**
 * Settings > Gallery: upload photos (many at once), show / hide, add a
 * caption and delete them. Until the photos bundled with the code are
 * imported, a banner offers the one-time import.
 */
function GalleryManager() {
  const { user } = useContext(myContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<boolean | null>(null);

  const [progress, setProgress] = useState<Progress | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [captionPhoto, setCaptionPhoto] = useState<GalleryPhoto | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [toDelete, setToDelete] = useState<GalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const stopPhotos = subscribeGallery(
      { publishedOnly: false },
      (next) => {
        setPhotos(next);
        setError(null);
        setLoading(false);
      },
      (loadError) => {
        console.error("Failed to load the gallery:", loadError);
        setError("The gallery could not be loaded. Please reload the page.");
        setLoading(false);
      }
    );
    const stopImported = subscribeGalleryImported(setImported, (loadError) =>
      console.error("Failed to read the gallery import status:", loadError)
    );
    return () => {
      stopPhotos();
      stopImported();
    };
  }, []);

  const busy = progress !== null;

  const handleFilesPicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );
    event.target.value = "";
    if (files.length === 0) return;

    setProgress({ label: "Uploading", done: 0, total: files.length });
    try {
      const result = await uploadGalleryPhotos(files, user?.uid ?? "", (done, total) =>
        setProgress({ label: "Uploading", done, total })
      );
      if (result.uploaded > 0) {
        toast.success(`${result.uploaded} photo(s) uploaded.`);
      }
      if (result.failed.length > 0) {
        toast.error(`Could not upload: ${result.failed.join(", ")}`);
      }
    } finally {
      setProgress(null);
    }
  };

  const handleImport = async () => {
    const total = LEGACY_GALLERY_PHOTOS.length;
    setProgress({ label: "Importing old photos", done: 0, total });
    try {
      const result = await importLegacyGallery(
        LEGACY_GALLERY_PHOTOS,
        user?.uid ?? "",
        (done, count) =>
          setProgress({ label: "Importing old photos", done, total: count })
      );
      if (result.failed.length === 0) {
        toast.success(`${result.imported} old photos imported.`);
      } else {
        toast.error(
          `${result.failed.length} photo(s) could not be imported. Click Import again to retry.`
        );
      }
    } catch (importError) {
      console.error("Gallery import failed:", importError);
      toast.error("The import failed. Please try again.");
    } finally {
      setProgress(null);
    }
  };

  const handleToggle = async (photo: GalleryPhoto, next: boolean) => {
    setTogglingId(photo.id);
    try {
      await setGalleryPublished(photo.id, next);
    } catch (toggleError) {
      console.error("Failed to change photo visibility:", toggleError);
      toast.error("Could not change it. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveCaption = async () => {
    if (!captionPhoto) return;
    setSavingCaption(true);
    try {
      await setGalleryCaption(captionPhoto.id, captionDraft);
      toast.success("Caption saved.");
      setCaptionPhoto(null);
    } catch (saveError) {
      console.error("Failed to save the caption:", saveError);
      toast.error("Failed to save the caption. Please try again.");
    } finally {
      setSavingCaption(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteGalleryPhoto(toDelete.id);
      toast.success("Photo deleted.");
      setToDelete(null);
    } catch (deleteError) {
      console.error("Failed to delete the photo:", deleteError);
      toast.error("Failed to delete the photo. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const publishedCount = photos.filter((photo) => photo.isPublished).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Gallery"
        titleStyle="text-primaryBlue"
        description="The school photo of the Home and About pages, and the photos of the Gallery page. You can pick many gallery photos at once; switch a photo OFF to hide it without deleting it."
        descriptionStyle="text-gray-500"
        button={
          <Button
            buttonName="+ Upload Photos"
            variant="success"
            size="md"
            buttonStyle="rounded-full bg-blue-600 hover:bg-blue-700"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          />
        }
      />
      <SchoolPhotoCard />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void handleFilesPicked(event)}
      />

      {imported === false && LEGACY_GALLERY_PHOTOS.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            {LEGACY_GALLERY_PHOTOS.length} old photos are still shown from the
            website code and cannot be managed here. Import them once to hide
            or delete them like any other photo.
          </span>
          <Button
            buttonName={`Import old photos (${LEGACY_GALLERY_PHOTOS.length})`}
            variant="warning"
            size="sm"
            disabled={busy}
            onClick={() => void handleImport()}
          />
        </div>
      )}

      {progress && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {progress.label}... {progress.done} of {progress.total}. Please keep
          this page open.
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500">
          Loading photos...
        </p>
      ) : error ? (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          No photos uploaded yet. Click "+ Upload Photos" to add some.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {publishedCount} of {photos.length} photos shown on the Gallery page.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm ${
                  photo.isPublished
                    ? "border-gray-200"
                    : "border-dashed border-gray-300 opacity-70"
                }`}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.caption || "Gallery photo"}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
                <div className="flex flex-1 flex-col gap-2 p-2">
                  <p
                    className={`line-clamp-2 text-xs ${
                      photo.caption ? "text-gray-700" : "italic text-gray-400"
                    }`}
                  >
                    {photo.caption || "No caption"}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <Switch
                        checked={photo.isPublished}
                        onCheckedChange={(next) => void handleToggle(photo, next)}
                        disabled={togglingId === photo.id}
                        aria-label="Show on the Gallery page"
                      />
                      {photo.isPublished ? "ON" : "OFF"}
                    </label>
                    <div className="flex gap-1.5">
                      <UIButton
                        type="button"
                        size="icon"
                        title="Edit caption"
                        aria-label="Edit caption"
                        onClick={() => {
                          setCaptionPhoto(photo);
                          setCaptionDraft(photo.caption);
                        }}
                        className="h-7 w-7 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </UIButton>
                      <UIButton
                        type="button"
                        size="icon"
                        variant="destructive"
                        title="Delete"
                        aria-label="Delete photo"
                        onClick={() => setToDelete(photo)}
                        className="h-7 w-7 bg-red-600 text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </UIButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={captionPhoto !== null}
        onClose={() => setCaptionPhoto(null)}
        title="Photo Caption"
        description="Shown under the photo when it is opened on the Gallery page. Leave empty for no caption."
        submitText="Save"
        loading={savingCaption}
        submitDisabled={captionDraft.trim() === (captionPhoto?.caption ?? "")}
        onSubmit={handleSaveCaption}
      >
        {captionPhoto && (
          <div className="mt-3 flex flex-col gap-3">
            <img
              src={captionPhoto.imageUrl}
              alt=""
              className="max-h-48 w-full rounded-lg object-contain"
            />
            <Input
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              placeholder="e.g. Annual Day 2026"
              maxLength={150}
              aria-label="Caption"
            />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete Photo"
        description="Delete this photo from the gallery? This cannot be undone."
        submitText="Delete"
        submitClassName="bg-red-600 hover:bg-red-700"
        loading={deleting}
        onSubmit={handleDelete}
      >
        {toDelete && (
          <img
            src={toDelete.imageUrl}
            alt=""
            className="mt-3 max-h-48 w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </div>
  );
}

export default GalleryManager;
