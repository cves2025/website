/**
 * The gallery photos that are still bundled with the website code
 * (assets/image/gallery). They are shown until they have been imported into
 * Firestore once per environment (Settings > Gallery > Import old photos).
 *
 * TODO: remove this file and the assets/image/gallery folder once the photos
 * are imported in both the dev and the prod environment.
 */
const imageModules = import.meta.glob<string>(
  "../assets/image/gallery/*.{png,jpg,jpeg,svg,gif}",
  { eager: true, query: "?url", import: "default" }
);

export interface LegacyGalleryPhoto {
  /** File name, e.g. "12.jpg". */
  name: string;
  url: string;
}

/** The bundled photos in their file-name order (1, 2, 3 ... 99). */
export const LEGACY_GALLERY_PHOTOS: LegacyGalleryPhoto[] = Object.entries(
  imageModules
)
  .map(([path, url]) => ({ name: path.split("/").pop() ?? path, url }))
  .sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
