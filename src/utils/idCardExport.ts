/** Turning drawn ID cards into image files (PNG, several in a ZIP). */
import { getFontEmbedCSS, toBlob } from "html-to-image";
import JSZip from "jszip";

import { ID_CARD_EXPORT_DPI } from "../constants";
import type { IdCardPerson } from "./type";

/** CSS pixels are 96 per inch. */
const PIXEL_RATIO = ID_CARD_EXPORT_DPI / 96;

/** A file-name safe piece of text ("Rahul Kumar" -> "Rahul-Kumar"). */
const safe = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

/** "1156-Rahul-Kumar.png" (number first, so files sort by it). */
export function cardFileName(person: IdCardPerson): string {
  const code = person.values.enrollment || person.values.employeeId || "";
  return `${[safe(code), safe(person.name)].filter(Boolean).join("-") || person.id}.png`;
}

/** Waits until every picture in the card has loaded (or failed). */
export async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((image) =>
      image.complete && image.naturalWidth > 0
        ? image.decode().catch(() => undefined)
        : new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          })
    )
  );
  await document.fonts.ready;
}

/** A 1x1 see-through GIF: what a picture that cannot be copied becomes. */
const BLANK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Pictures already turned into data URLs (null = could not be copied). */
const inlined = new Map<string, Promise<string | null>>();

function toDataUrl(url: string): Promise<string | null> {
  let result = inlined.get(url);
  if (!result) {
    result = fetch(url, { mode: "cors" })
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          })
      )
      .catch((cause) => {
        console.warn(`ID card export: could not copy ${url}`, cause);
        return null;
      });
    inlined.set(url, result);
  }
  return result;
}

/**
 * Puts every picture of the card into the card itself (data URLs), so the
 * image library has nothing to fetch. A picture that cannot be copied
 * (Storage without CORS) is left blank instead of breaking the export.
 * Returns how many could not be copied.
 */
export async function inlineImages(node: HTMLElement): Promise<number> {
  let missing = 0;
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map(async (image) => {
      const src = image.currentSrc || image.src;
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
      const data = await toDataUrl(src);
      if (data === null) missing += 1;
      image.src = data ?? BLANK_IMAGE;
      await image.decode().catch(() => undefined);
    })
  );
  return missing;
}

/** Font rules for the images, read once; "" when they cannot be read. */
let fontCss: Promise<string> | null = null;

/** The drawn card as a print-quality PNG (without fonts if they cannot be added). */
export async function cardToPng(node: HTMLElement): Promise<Blob> {
  if (!fontCss) {
    fontCss = getFontEmbedCSS(node).catch((cause) => {
      console.warn("ID card export: fonts could not be embedded.", cause);
      return "";
    });
  }
  const css = await fontCss;
  const options = { pixelRatio: PIXEL_RATIO, cacheBust: false, imagePlaceholder: BLANK_IMAGE };
  let blob: Blob | null;
  try {
    blob = await toBlob(node, css ? { ...options, fontEmbedCSS: css } : { ...options, skipFonts: true });
  } catch (cause) {
    // Second try without fonts (the most common trouble).
    console.warn("ID card export: retrying without embedded fonts.", cause);
    blob = await toBlob(node, { ...options, skipFonts: true });
  }
  if (!blob) throw new Error("The card could not be turned into an image.");
  return blob;
}

/** Saves a file through the browser's download. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** All cards in one ZIP; a name used twice gets "-2", "-3" ... */
export async function zipCards(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const zip = new JSZip();
  const used = new Map<string, number>();
  files.forEach(({ name, blob }) => {
    const count = (used.get(name) ?? 0) + 1;
    used.set(name, count);
    zip.file(count === 1 ? name : name.replace(/\.png$/, `-${count}.png`), blob);
  });
  return zip.generateAsync({ type: "blob" });
}
