/**
 * Photos of the Gallery page, managed on Settings > Gallery.
 *
 *   gallery/{photoId} -> { imageUrl, caption, isPublished, order,
 *                          source: "upload" | "legacy", createdAt, createdBy }
 *
 * The image lives in Storage at gallery/{photoId}.jpg. The page shows the
 * photos by `order`, highest first: uploads use their upload time, the
 * imported legacy photos small numbers, so they always come after uploads in
 * their old 1, 2, 3 ... order.
 *
 * panelSettings/galleryImport -> { done: true, ... } marks that the photos
 * bundled with the code were imported; until then the Gallery page also shows
 * the bundled ones.
 */
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import { COLLECTION, PRE_DEFINED_DOC_ID } from "../constants";
import { db } from "../firebase/config";
import {
  deleteGalleryImage,
  uploadGalleryImage,
} from "../firebase/galleryImages";
import type { LegacyGalleryPhoto } from "./legacyGallery";

export interface GalleryPhoto {
  id: string;
  imageUrl: string;
  caption: string;
  isPublished: boolean;
  order: number;
}

/** Imported legacy photos get `LEGACY_ORDER_BASE - index` as their order. */
const LEGACY_ORDER_BASE = 1_000_000;

const importStatusRef = () =>
  doc(db, COLLECTION.PANEL_SETTINGS, PRE_DEFINED_DOC_ID.GALLERY_IMPORT);

function toGalleryPhoto(
  snapshot: QueryDocumentSnapshot<DocumentData>
): GalleryPhoto {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
    caption: typeof data.caption === "string" ? data.caption : "",
    isPublished: data.isPublished === true,
    order: typeof data.order === "number" ? data.order : 0,
  };
}

/**
 * Live list of gallery photos, highest `order` first. `publishedOnly` is what
 * the Gallery page uses; sorted client-side, so no composite index is needed.
 */
export function subscribeGallery(
  options: { publishedOnly: boolean },
  onData: (photos: GalleryPhoto[]) => void,
  onError: (error: Error) => void
): () => void {
  const galleryRef = collection(db, COLLECTION.GALLERY);
  return onSnapshot(
    options.publishedOnly
      ? query(galleryRef, where("isPublished", "==", true))
      : galleryRef,
    (snapshot) =>
      onData(
        snapshot.docs
          .map(toGalleryPhoto)
          .filter((photo) => photo.imageUrl)
          .sort((a, b) => b.order - a.order)
      ),
    onError
  );
}

/** Live "were the bundled photos imported?" flag (false until known). */
export function subscribeGalleryImported(
  onData: (imported: boolean) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    importStatusRef(),
    (snapshot) => onData(snapshot.exists() && snapshot.data().done === true),
    onError
  );
}

/**
 * Uploads the files one after another (so a big batch never floods the
 * connection). Failed files are skipped and returned, the rest are saved.
 */
export async function uploadGalleryPhotos(
  files: File[],
  createdBy: string,
  onProgress: (done: number, total: number) => void
): Promise<{ uploaded: number; failed: string[] }> {
  const failed: string[] = [];
  let uploaded = 0;

  for (const [index, file] of files.entries()) {
    try {
      const photoRef = doc(collection(db, COLLECTION.GALLERY));
      const imageUrl = await uploadGalleryImage(photoRef.id, file);
      await setDoc(photoRef, {
        imageUrl,
        caption: "",
        isPublished: true,
        // Later files of one batch end up first, like a newer upload.
        order: Date.now() + index,
        source: "upload",
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      uploaded += 1;
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      failed.push(file.name);
    }
    onProgress(index + 1, files.length);
  }

  return { uploaded, failed };
}

/**
 * One-time import of the photos bundled with the code. Every photo gets a
 * fixed id (legacy-<file name>), so running it again after a partial failure
 * overwrites instead of creating duplicates. The import is only marked done
 * when every photo made it.
 */
export async function importLegacyGallery(
  photos: readonly LegacyGalleryPhoto[],
  importedBy: string,
  onProgress: (done: number, total: number) => void
): Promise<{ imported: number; failed: string[] }> {
  const failed: string[] = [];
  let imported = 0;

  for (const [index, photo] of photos.entries()) {
    try {
      const response = await fetch(photo.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], photo.name, { type: blob.type });

      const photoId = `legacy-${photo.name.replace(/\.[^.]+$/, "")}`;
      const imageUrl = await uploadGalleryImage(photoId, file);
      await setDoc(doc(db, COLLECTION.GALLERY, photoId), {
        imageUrl,
        caption: "",
        isPublished: true,
        order: LEGACY_ORDER_BASE - index,
        source: "legacy",
        createdBy: importedBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      imported += 1;
    } catch (error) {
      console.error(`Failed to import ${photo.name}:`, error);
      failed.push(photo.name);
    }
    onProgress(index + 1, photos.length);
  }

  if (failed.length === 0) {
    await setDoc(importStatusRef(), {
      done: true,
      count: imported,
      importedBy,
      importedAt: serverTimestamp(),
    });
  }

  return { imported, failed };
}

export async function setGalleryPublished(
  photoId: string,
  isPublished: boolean
): Promise<void> {
  await updateDoc(doc(db, COLLECTION.GALLERY, photoId), {
    isPublished,
    updatedAt: serverTimestamp(),
  });
}

export async function setGalleryCaption(
  photoId: string,
  caption: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION.GALLERY, photoId), {
    caption: caption.trim(),
    updatedAt: serverTimestamp(),
  });
}

/** Deletes the photo and its image file. */
export async function deleteGalleryPhoto(photoId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION.GALLERY, photoId));
  await deleteGalleryImage(photoId);
}
