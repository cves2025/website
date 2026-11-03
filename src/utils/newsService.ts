/**
 * School news, shown on the Home page and managed on Settings > News.
 *
 *   news/{newsId} -> { heading, text, newsDate: "YYYY-MM-DD", imageUrl,
 *                      isPublished, createdAt, updatedAt, createdBy }
 *
 * The optional image lives in Storage at news/{newsId}/image.jpg (see
 * firebase/newsImages.ts); `imageUrl` is "" when there is none. Only
 * `isPublished` news reach the Home page.
 */
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import { deleteNewsImage, uploadNewsImage } from "../firebase/newsImages";
import { isRichText, sanitizeRichText } from "./richText";

export interface NewsItem {
  id: string;
  heading: string;
  text: string;
  /** "YYYY-MM-DD" */
  newsDate: string;
  /** "" = no image (the Home page shows the school logo). */
  imageUrl: string;
  isPublished: boolean;
  /** Milliseconds; 0 while the server timestamp is still pending. */
  createdAt: number;
}

export interface NewsFields {
  heading: string;
  text: string;
  newsDate: string;
  isPublished: boolean;
}

/** What to do with the image when a news item is saved. */
export type NewsImageChange =
  | { kind: "keep" }
  | { kind: "replace"; file: File }
  | { kind: "remove" };

function toNewsItem(snapshot: QueryDocumentSnapshot<DocumentData>): NewsItem {
  const data = snapshot.data();
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    id: snapshot.id,
    heading: text(data.heading),
    text: text(data.text),
    newsDate: text(data.newsDate),
    imageUrl: text(data.imageUrl),
    isPublished: data.isPublished === true,
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0,
  };
}

/** Newest news first (by news date, then by when it was added). */
function sortNews(items: NewsItem[]): NewsItem[] {
  return [...items].sort(
    (a, b) =>
      b.newsDate.localeCompare(a.newsDate) || b.createdAt - a.createdAt
  );
}

/**
 * Live list of news, newest first. `publishedOnly` is what the Home page
 * uses. Sorted client-side, so no composite index is needed.
 */
export function subscribeNews(
  options: { publishedOnly: boolean },
  onData: (items: NewsItem[]) => void,
  onError: (error: Error) => void
): () => void {
  const newsRef = collection(db, COLLECTION.NEWS);
  return onSnapshot(
    options.publishedOnly
      ? query(newsRef, where("isPublished", "==", true))
      : newsRef,
    (snapshot) => onData(sortNews(snapshot.docs.map(toNewsItem))),
    onError
  );
}

function cleanFields(fields: NewsFields) {
  const text = fields.text.trim();
  return {
    heading: fields.heading.trim(),
    text: isRichText(text) ? sanitizeRichText(text) : text,
    newsDate: fields.newsDate,
    isPublished: fields.isPublished,
  };
}

export async function createNews(
  fields: NewsFields,
  image: File | null,
  createdBy: string
): Promise<void> {
  // The id is generated first so the image goes to its final path.
  const newsRef = doc(collection(db, COLLECTION.NEWS));
  const imageUrl = image ? await uploadNewsImage(newsRef.id, image) : "";
  await setDoc(newsRef, {
    ...cleanFields(fields),
    imageUrl,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateNews(
  newsId: string,
  fields: NewsFields,
  image: NewsImageChange
): Promise<void> {
  const imageFields =
    image.kind === "replace"
      ? { imageUrl: await uploadNewsImage(newsId, image.file) }
      : image.kind === "remove"
        ? { imageUrl: "" }
        : {};
  await updateDoc(doc(db, COLLECTION.NEWS, newsId), {
    ...cleanFields(fields),
    ...imageFields,
    updatedAt: serverTimestamp(),
  });
  if (image.kind === "remove") await deleteNewsImage(newsId);
}

export async function setNewsPublished(
  newsId: string,
  isPublished: boolean
): Promise<void> {
  await updateDoc(doc(db, COLLECTION.NEWS, newsId), {
    isPublished,
    updatedAt: serverTimestamp(),
  });
}

/** Deletes the news item and its image. */
export async function deleteNews(newsId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION.NEWS, newsId));
  await deleteNewsImage(newsId);
}
