/**
 * PDFs of the Downloads page (syllabus, time table ...), managed on
 * Settings > Downloads. One file per type + session + class:
 *
 *   downloads/{category}_{academicYear}_{className}
 *     -> { category, academicYear, className, fileUrl, fileName, fileSize,
 *          isPublished, updatedAt, updatedBy }
 *
 * `className` is a class of CLASSES or ALL_CLASSES. The PDF lives in Storage
 * at downloads/{docId}.pdf, so uploading again replaces it. Files of every
 * session are kept; the public page shows the current session only.
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
import type {
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { CLASSES, COLLECTION } from "../constants";
import { db, storage } from "../firebase/config";
import { toClassLabel } from "./teacherSections";

/**
 * The download types. To add one later (e.g. a holiday list), add an entry
 * here - the admin page and the Downloads page pick it up automatically.
 */
export const DOWNLOAD_CATEGORIES = [
  { value: "syllabus", label: "Syllabus", fileLabel: "Syllabus" },
  { value: "timeTable", label: "Time Table", fileLabel: "Time-Table" },
] as const;

export type DownloadCategory = (typeof DOWNLOAD_CATEGORIES)[number]["value"];

/** `className` of a file meant for the whole school. */
export const ALL_CLASSES = "ALL";

/** "All Classes" first, then the classes in school order. */
export const DOWNLOAD_CLASS_ROWS: string[] = [ALL_CLASSES, ...CLASSES];

/** Largest PDF accepted (in bytes). */
export const MAX_DOWNLOAD_FILE_SIZE = 10 * 1024 * 1024;

export interface DownloadFile {
  id: string;
  category: DownloadCategory;
  academicYear: string;
  className: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  isPublished: boolean;
  /** Milliseconds; 0 while the server timestamp is still pending. */
  updatedAt: number;
}

export function downloadClassLabel(className: string): string {
  return className === ALL_CLASSES ? "All Classes" : toClassLabel(className);
}

export function downloadCategoryLabel(category: string): string {
  return (
    DOWNLOAD_CATEGORIES.find((item) => item.value === category)?.label ??
    category
  );
}

export const downloadDocId = (
  category: DownloadCategory,
  academicYear: string,
  className: string
) => `${category}_${academicYear}_${className}`;

/** Name the PDF is saved under, e.g. "Class-3_Syllabus_2026-27.pdf". */
function downloadFileName(
  category: DownloadCategory,
  academicYear: string,
  className: string
): string {
  const fileLabel =
    DOWNLOAD_CATEGORIES.find((item) => item.value === category)?.fileLabel ??
    category;
  const classPart = downloadClassLabel(className).replace(/\s+/g, "-");
  return `${classPart}_${fileLabel}_${academicYear}.pdf`;
}

function toDownloadFile(
  snapshot: QueryDocumentSnapshot<DocumentData>
): DownloadFile {
  const data = snapshot.data();
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    id: snapshot.id,
    category: text(data.category) as DownloadCategory,
    academicYear: text(data.academicYear),
    className: text(data.className),
    fileUrl: text(data.fileUrl),
    fileName: text(data.fileName),
    fileSize: typeof data.fileSize === "number" ? data.fileSize : 0,
    isPublished: data.isPublished === true,
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0,
  };
}

/** Live files of one session (only the published ones for the public page). */
export function subscribeDownloads(
  options: { academicYear: string; publishedOnly: boolean },
  onData: (files: DownloadFile[]) => void,
  onError: (error: Error) => void
): () => void {
  const constraints: QueryConstraint[] = [
    where("academicYear", "==", options.academicYear),
  ];
  if (options.publishedOnly) {
    constraints.push(where("isPublished", "==", true));
  }
  return onSnapshot(
    query(collection(db, COLLECTION.DOWNLOADS), ...constraints),
    (snapshot) =>
      onData(
        snapshot.docs.map(toDownloadFile).filter((file) => file.fileUrl)
      ),
    onError
  );
}

/** Uploads (or replaces) the PDF of one type + session + class. */
export async function uploadDownloadFile(params: {
  category: DownloadCategory;
  academicYear: string;
  className: string;
  file: File;
  isPublished: boolean;
  updatedBy: string;
}): Promise<void> {
  const { category, academicYear, className, file, isPublished, updatedBy } =
    params;
  const docId = downloadDocId(category, academicYear, className);
  const fileName = downloadFileName(category, academicYear, className);
  const storageRef = ref(storage, `downloads/${docId}.pdf`);

  // "attachment" makes the link download the file under its proper name
  // instead of only opening it in the browser.
  await uploadBytes(storageRef, file, {
    contentType: "application/pdf",
    contentDisposition: `attachment; filename="${fileName}"`,
  });
  const url = await getDownloadURL(storageRef);
  const separator = url.includes("?") ? "&" : "?";

  await setDoc(doc(db, COLLECTION.DOWNLOADS, docId), {
    category,
    academicYear,
    className,
    fileUrl: `${url}${separator}v=${Date.now()}`,
    fileName,
    fileSize: file.size,
    isPublished,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}

export async function setDownloadPublished(
  fileId: string,
  isPublished: boolean
): Promise<void> {
  await updateDoc(doc(db, COLLECTION.DOWNLOADS, fileId), {
    isPublished,
    updatedAt: serverTimestamp(),
  });
}

/** Deletes the file record and the PDF. */
export async function deleteDownloadFile(fileId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION.DOWNLOADS, fileId));
  try {
    await deleteObject(ref(storage, `downloads/${fileId}.pdf`));
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== "storage/object-not-found") throw error;
  }
}
