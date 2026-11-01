/**
 * The Home page banner (the slider at the top), in ONE document:
 *
 *   settings/homeBanner -> {
 *     slides: [{ id, imageUrl, title, description, showSession, isPublished }],
 *     intervalSeconds, updatedAt, updatedBy
 *   }
 *
 * The order of `slides` is the order of the slider. Every image lives in
 * Storage at banner/{slideId}.jpg. A missing document means the slides
 * bundled with the code are shown (see legacyBanner.ts).
 */
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { COLLECTION, HOME_BANNER_SETTINGS_DOC } from "../constants";
import { db, storage } from "../firebase/config";
import { compressImage } from "./compressImage";
import type { LegacyBannerSlide } from "./legacyBanner";

/**
 * "cover" fills the screen (the photo may be cut at the edges); "contain"
 * shows the whole photo with a blurred copy of it filling the empty space.
 */
export type BannerFit = "cover" | "contain";

/** Which part of the photo stays in view. */
export type BannerPosition = "top" | "center" | "bottom";

export interface BannerSlide {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  /** Show the current session after the title (e.g. "ADMISSION OPEN 2026-27"). */
  showSession: boolean;
  isPublished: boolean;
  fit: BannerFit;
  position: BannerPosition;
}

/** Tailwind classes that place a banner photo by its fit and position. */
export function bannerImageClasses(
  fit: BannerFit,
  position: BannerPosition
): string {
  const placement = {
    top: "object-top",
    center: "object-center",
    bottom: "object-bottom",
  }[position];
  return `${fit === "contain" ? "object-contain" : "object-cover"} ${placement}`;
}

export interface HomeBanner {
  slides: BannerSlide[];
  intervalSeconds: number;
  /**
   * True once the slides bundled with the code were imported. Until then the
   * Home page falls back to them whenever no saved slide is shown.
   */
  legacyImported: boolean;
}

export const DEFAULT_INTERVAL_SECONDS = 5;
export const MIN_INTERVAL_SECONDS = 2;
export const MAX_INTERVAL_SECONDS = 30;

const bannerRef = () => doc(db, COLLECTION.SETTINGS, HOME_BANNER_SETTINGS_DOC);

const bannerImagePath = (slideId: string) => `banner/${slideId}.jpg`;

export function clampInterval(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_INTERVAL_SECONDS;
  return Math.min(
    MAX_INTERVAL_SECONDS,
    Math.max(MIN_INTERVAL_SECONDS, Math.round(value))
  );
}

function toSlide(value: unknown): BannerSlide | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const text = (field: unknown) => (typeof field === "string" ? field : "");
  if (!text(data.id) || !text(data.imageUrl)) return null;
  return {
    id: text(data.id),
    imageUrl: text(data.imageUrl),
    title: text(data.title),
    description: text(data.description),
    showSession: data.showSession === true,
    isPublished: data.isPublished !== false,
    fit: data.fit === "contain" ? "contain" : "cover",
    position:
      data.position === "top" || data.position === "bottom"
        ? data.position
        : "center",
  };
}

/** Live banner (`null` = never saved: the bundled slides are shown). */
export function subscribeHomeBanner(
  onData: (banner: HomeBanner | null) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    bannerRef(),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      const slides = (Array.isArray(data.slides) ? data.slides : [])
        .map(toSlide)
        .filter((slide): slide is BannerSlide => slide !== null);
      onData({
        slides,
        intervalSeconds: clampInterval(Number(data.intervalSeconds)),
        // Imported slides have the ids legacy-1 ... legacy-8.
        legacyImported:
          data.legacyImported === true ||
          slides.some((slide) => slide.id.startsWith("legacy-")),
      });
    },
    onError
  );
}

/** Banner photos fill the whole screen, so they keep a large size. */
export async function uploadBannerImage(
  slideId: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file, {
    maxDimension: 1920,
    quality: 0.82,
  });
  const storageRef = ref(storage, bannerImagePath(slideId));
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

export async function deleteBannerImage(slideId: string): Promise<void> {
  try {
    await deleteObject(ref(storage, bannerImagePath(slideId)));
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== "storage/object-not-found") throw error;
  }
}

export async function saveHomeBanner(
  banner: HomeBanner,
  updatedBy: string
): Promise<void> {
  await setDoc(bannerRef(), {
    slides: banner.slides.map((slide) => ({
      id: slide.id,
      imageUrl: slide.imageUrl,
      title: slide.title.trim(),
      description: slide.description.trim(),
      showSession: slide.showSession,
      isPublished: slide.isPublished,
      fit: slide.fit,
      position: slide.position,
    })),
    intervalSeconds: clampInterval(banner.intervalSeconds),
    legacyImported: banner.legacyImported,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

export function newSlideId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * One-time import of the bundled slides: uploads their images (fixed ids
 * legacy-1 ... legacy-8, so a retry overwrites) and adds them AFTER the
 * slides already saved. The banner is saved only when every image made it.
 */
export async function importLegacyBanner(
  slides: readonly LegacyBannerSlide[],
  existing: HomeBanner | null,
  importedBy: string,
  onProgress: (done: number, total: number) => void
): Promise<void> {
  const imported: BannerSlide[] = [];
  for (const [index, slide] of slides.entries()) {
    const response = await fetch(slide.img);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const id = `legacy-${index + 1}`;
    const imageUrl = await uploadBannerImage(
      id,
      new File([blob], `${id}.jpg`, { type: blob.type })
    );
    imported.push({
      id,
      imageUrl,
      title: slide.title,
      description: slide.description,
      showSession: slide.showSession,
      isPublished: true,
      fit: "cover",
      position: "center",
    });
    onProgress(index + 1, slides.length);
  }
  const kept = (existing?.slides ?? []).filter(
    (slide) => !slide.id.startsWith("legacy-")
  );
  await saveHomeBanner(
    {
      slides: [...kept, ...imported],
      intervalSeconds: existing?.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS,
      legacyImported: true,
    },
    importedBy
  );
}
