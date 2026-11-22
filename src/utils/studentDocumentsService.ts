/**
 * Student documents (Aadhaar, birth certificate ...): docs/features/student-documents.md.
 *
 * - Types: panelSettings/studentDocuments `{ types }` (admin), DEFAULT_STUDENT_DOCUMENT_TYPES
 *   until saved.
 * - studentDocuments/{studentId}: the summary (uploaded / verified per type id).
 * - studentDocuments/{studentId}/versions/{id}: one upload, never changed or deleted.
 * - Files in Storage under studentDocuments/{studentId}/{typeId}/{versionId}/. No download URL
 *   is kept: a file is opened with getBlob (through the Storage rules).
 */
import {
  collection,
  deleteField,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { deleteObject, getBlob, ref, uploadBytes } from "firebase/storage";

import {
  COLLECTION,
  DEFAULT_STUDENT_DOCUMENT_TYPES,
  PRE_DEFINED_DOC_ID,
  STUDENT_DOCUMENT_IMAGE,
  STUDENT_DOCUMENT_MAX_BYTES,
  STUDENT_DOCUMENT_PDF_TYPE,
  STUDENT_DOCUMENT_PHOTO_TYPES,
} from "../constants";
import { db, storage } from "../firebase/config";
import { compressImage } from "./compressImage";
import type {
  StudentDocumentFile,
  StudentDocumentSummary,
  StudentDocumentType,
  StudentDocumentVersion,
} from "./type";

const IN_QUERY_LIMIT = 30;
const ms = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : null);
const text = (value: unknown) => (typeof value === "string" ? value : "");

/* -------------------------------------------------------------- types -- */

const typesRef = () => doc(db, COLLECTION.PANEL_SETTINGS, PRE_DEFINED_DOC_ID.STUDENT_DOCUMENTS);

function toType(raw: DocumentData, index: number): StudentDocumentType | null {
  const id = text(raw?.id).trim();
  const name = text(raw?.name).trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    required: raw.required === true,
    order: typeof raw.order === "number" ? raw.order : index + 1,
    active: raw.active !== false,
  };
}

/** The document types, in their order (the defaults until Settings saves a list). */
export async function loadDocumentTypes(): Promise<StudentDocumentType[]> {
  const snap = await getDoc(typesRef());
  const saved = snap.exists() && Array.isArray(snap.data().types) ? snap.data().types : null;
  const types = saved
    ? saved.map(toType).filter((item: StudentDocumentType | null): item is StudentDocumentType => item !== null)
    : DEFAULT_STUDENT_DOCUMENT_TYPES;
  return [...types].sort((a, b) => a.order - b.order);
}

export async function saveDocumentTypes(types: StudentDocumentType[], uid: string): Promise<void> {
  await setDoc(typesRef(), {
    types: types.map((item, index) => ({ ...item, name: item.name.trim(), order: index + 1 })),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

/** A new type id from its name ("Caste Certificate" -> "casteCertificate"), unique in `taken`. */
export function documentTypeId(name: string, taken: string[]): string {
  const words = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  const base = words.map((word, index) => (index ? word[0].toUpperCase() + word.slice(1) : word)).join("") || "document";
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}${n}`;
  return id;
}

/* ------------------------------------------------------------ summary -- */

const summaryRef = (studentId: string) => doc(db, COLLECTION.STUDENT_DOCUMENTS, studentId);
const versionsRef = (studentId: string) => collection(db, COLLECTION.STUDENT_DOCUMENTS, studentId, "versions");

export const EMPTY_SUMMARY: StudentDocumentSummary = { uploaded: {}, verified: {} };

function toSummary(data: DocumentData | undefined): StudentDocumentSummary {
  const uploaded: StudentDocumentSummary["uploaded"] = {};
  const verified: StudentDocumentSummary["verified"] = {};
  Object.entries((data?.uploaded ?? {}) as Record<string, DocumentData>).forEach(([typeId, value]) => {
    uploaded[typeId] = {
      versions: typeof value?.versions === "number" ? value.versions : 0,
      lastVersionId: text(value?.lastVersionId),
      lastAt: ms(value?.lastAt),
    };
  });
  Object.entries((data?.verified ?? {}) as Record<string, DocumentData>).forEach(([typeId, value]) => {
    verified[typeId] = { versionId: text(value?.versionId), by: text(value?.by), byName: text(value?.byName), at: ms(value?.at) };
  });
  return { uploaded, verified };
}

/** True when the latest version of the type is the verified one. */
export const isVerified = (summary: StudentDocumentSummary, typeId: string) =>
  Boolean(summary.uploaded[typeId]?.lastVersionId) &&
  summary.verified[typeId]?.versionId === summary.uploaded[typeId]?.lastVersionId;

/** Required active types that have at least one version: "N of M" for the list badge. */
export function requiredDone(summary: StudentDocumentSummary, types: StudentDocumentType[]) {
  const required = types.filter((item) => item.required && item.active);
  return { done: required.filter((item) => summary.uploaded[item.id]?.versions).length, of: required.length };
}

/** Summaries of many students (30 per query); a student without uploads gets the empty one. */
export async function loadDocumentSummaries(studentIds: string[]): Promise<Record<string, StudentDocumentSummary>> {
  const ids = [...new Set(studentIds.filter(Boolean))];
  const out: Record<string, StudentDocumentSummary> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_QUERY_LIMIT) chunks.push(ids.slice(i, i + IN_QUERY_LIMIT));
  const snaps = await Promise.all(
    chunks.map((chunk) => getDocs(query(collection(db, COLLECTION.STUDENT_DOCUMENTS), where(documentId(), "in", chunk))))
  );
  snaps.forEach((snap) => snap.docs.forEach((item) => (out[item.id] = toSummary(item.data()))));
  ids.forEach((id) => (out[id] ??= EMPTY_SUMMARY));
  return out;
}

/* ----------------------------------------------------------- versions -- */

function toVersion(id: string, data: DocumentData): StudentDocumentVersion {
  const files = Array.isArray(data.files) ? data.files : [];
  return {
    id,
    typeId: text(data.typeId),
    files: files.map((file: DocumentData) => ({
      path: text(file?.path),
      name: text(file?.name),
      contentType: text(file?.contentType),
      size: typeof file?.size === "number" ? file.size : 0,
      side: file?.side === "back" ? "back" : file?.side === "front" ? "front" : "file",
    })),
    uploadedBy: text(data.uploadedBy),
    uploadedByName: text(data.uploadedByName),
    uploadedAt: ms(data.uploadedAt),
    note: text(data.note),
  };
}

/** A student's summary and every version, newest first. */
export async function loadStudentDocuments(studentId: string) {
  const [summarySnap, versionsSnap] = await Promise.all([
    getDoc(summaryRef(studentId)),
    getDocs(query(versionsRef(studentId), orderBy("uploadedAt", "desc"))),
  ]);
  return {
    summary: summarySnap.exists() ? toSummary(summarySnap.data()) : EMPTY_SUMMARY,
    versions: versionsSnap.docs.map((item) => toVersion(item.id, item.data())),
  };
}

/* ------------------------------------------------------------- upload -- */

export interface DocumentUpload {
  file: File;
  side: StudentDocumentFile["side"];
}

/** A photo made smaller (JPEG), a PDF as it is; refused over STUDENT_DOCUMENT_MAX_BYTES. */
async function prepare(upload: DocumentUpload): Promise<{ blob: Blob; contentType: string; ext: string }> {
  const isPdf = upload.file.type === STUDENT_DOCUMENT_PDF_TYPE;
  const allowed = upload.side === "file" ? isPdf : STUDENT_DOCUMENT_PHOTO_TYPES.includes(upload.file.type);
  if (!allowed) {
    throw new Error(`${upload.file.name}: only ${upload.side === "file" ? "a PDF" : "a JPG, PNG or WEBP photo"} can be uploaded here.`);
  }
  const blob = isPdf ? upload.file : await compressImage(upload.file, STUDENT_DOCUMENT_IMAGE);
  if (blob.size > STUDENT_DOCUMENT_MAX_BYTES) {
    throw new Error(
      `${upload.file.name} is ${(blob.size / 1024 / 1024).toFixed(1)} MB${isPdf ? "" : " even after making it smaller"}. The limit is ${STUDENT_DOCUMENT_MAX_BYTES / 1024 / 1024} MB.`
    );
  }
  return { blob, contentType: isPdf ? "application/pdf" : "image/jpeg", ext: isPdf ? "pdf" : "jpg" };
}

/**
 * Adds a new version of a document: uploads the files, then writes the
 * version and moves the summary in one batch. Old versions stay.
 */
export async function uploadDocumentVersion(
  studentId: string,
  typeId: string,
  uploads: DocumentUpload[],
  by: { uid: string; name: string },
  note = ""
): Promise<void> {
  if (uploads.length === 0) throw new Error("Choose a file first.");
  const versionRef = doc(versionsRef(studentId));
  const prepared = await Promise.all(uploads.map(prepare));
  const files: StudentDocumentFile[] = await Promise.all(
    uploads.map(async (upload, index) => {
      const { blob, contentType, ext } = prepared[index];
      const path = `${COLLECTION.STUDENT_DOCUMENTS}/${studentId}/${typeId}/${versionRef.id}/${upload.side}.${ext}`;
      await uploadBytes(ref(storage, path), blob, { contentType });
      return { path, name: upload.file.name.slice(0, 120), contentType, size: blob.size, side: upload.side };
    })
  );

  const batch = writeBatch(db);
  batch.set(versionRef, {
    typeId,
    files,
    uploadedBy: by.uid,
    uploadedByName: by.name,
    uploadedAt: serverTimestamp(),
    note: note.trim().slice(0, 300),
  });
  batch.set(
    summaryRef(studentId),
    {
      uploaded: { [typeId]: { versions: increment(1), lastVersionId: versionRef.id, lastAt: serverTimestamp() } },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
}

/** Admin: the latest version of the type has been checked against the original. */
export async function verifyDocument(studentId: string, typeId: string, versionId: string, by: { uid: string; name: string }) {
  await updateDoc(summaryRef(studentId), {
    [`verified.${typeId}`]: { versionId, by: by.uid, byName: by.name, at: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
}

/** Admin: takes the Verified tick off the type. */
export async function unverifyDocument(studentId: string, typeId: string) {
  await updateDoc(summaryRef(studentId), { [`verified.${typeId}`]: null, updatedAt: serverTimestamp() });
}

/**
 * Admin, after the password: removes one version for good (a wrong upload).
 * The summary moves to the newest version left (or the type has none), a
 * Verified tick on the removed version goes; then its files are deleted.
 * `left` = the type's other versions, newest first.
 */
export async function deleteDocumentVersion(
  studentId: string,
  version: StudentDocumentVersion,
  left: StudentDocumentVersion[],
  verifiedVersionId: string
): Promise<void> {
  const typeId = version.typeId;
  const newest = left[0];
  const batch = writeBatch(db);
  batch.delete(doc(versionsRef(studentId), version.id));
  batch.update(summaryRef(studentId), {
    [`uploaded.${typeId}`]: newest
      ? {
          versions: left.length,
          lastVersionId: newest.id,
          lastAt: newest.uploadedAt ? Timestamp.fromMillis(newest.uploadedAt) : serverTimestamp(),
        }
      : deleteField(),
    ...(verifiedVersionId === version.id ? { [`verified.${typeId}`]: deleteField() } : {}),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  // The record is gone; a file that cannot be deleted now is only left over in Storage.
  await Promise.all(
    version.files.map((file) =>
      deleteObject(ref(storage, file.path)).catch((cause) => console.error("Document file could not be deleted:", file.path, cause))
    )
  );
}

/** Admin: saves a file to the computer (read through the Storage rules; no link is kept). */
export async function downloadDocumentFile(path: string, fileName: string): Promise<void> {
  const url = URL.createObjectURL(await getBlob(ref(storage, path)));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** "Student Aadhaar · Front · 22 Nov 2026, 3:40 PM" -> "Student-Aadhaar_Front_22-Nov-2026-340-PM.jpg" */
export const documentFileName = (title: string, contentType: string) =>
  `${title.replace(/[,:]/g, "").replace(/\s*·\s*/g, "_").replace(/\s+/g, "-").replace(/[^\w.-]/g, "")}.${
    contentType === "application/pdf" ? "pdf" : "jpg"
  }`;

/** Opens a file through the Storage rules; the caller revokes the URL when done. */
export async function openDocumentFile(path: string): Promise<string> {
  return URL.createObjectURL(await getBlob(ref(storage, path)));
}
