/**
 * A student's documents, one block per type (Settings > Student documents):
 * Missing / Not verified / Verified, the latest version's files (open in the
 * viewer), "Upload new version" (photos front + back, or one PDF; admin or
 * student.documents), Verify (admin) and the older versions, kept forever.
 * Used by the Student List's Documents modal and by Student View (never printed).
 */
import { useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { BadgeCheck, ChevronDown, Download, FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";

import {
  CVES_BUTTON,
  STUDENT_DOCUMENT_MAX_BYTES,
  STUDENT_DOCUMENT_PDF_TYPE,
  STUDENT_DOCUMENT_PHOTO_TYPES,
} from "../../../../constants";
import CircleCheckbox from "../../../../custom-components/CircleCheckbox";
import Loader, { Spinner } from "../../../../custom-components/Loader";
import Tooltip from "../../../../custom-components/Tooltip";
import { useDocumentTypes, useStudentDocuments } from "../../../../hooks/useStudentDocuments";
import { usePasswordConfirm } from "../../../../hooks/usePasswordConfirm";
import { PERMISSIONS } from "../../../../permissions";
import {
  deleteDocumentVersion,
  documentFileName,
  downloadDocumentFile,
  isVerified,
  unverifyDocument,
  uploadDocumentVersion,
  verifyDocument,
  type DocumentUpload,
} from "../../../../utils/studentDocumentsService";
import type { StudentDocumentFile, StudentDocumentType, StudentDocumentVersion } from "../../../../utils/type";
import { myContext } from "../../../context/MyContextProvider";
import DocumentViewer from "./DocumentViewer";

const MAX_MB = STUDENT_DOCUMENT_MAX_BYTES / 1024 / 1024;
const PHOTO_TEXT = "a JPG, PNG or WEBP photo";
const when = (at: number | null) => (at ? format(new Date(at), "d MMM yyyy, h:mm a") : "just now");
const SIDE_LABEL: Record<StudentDocumentFile["side"], string> = { front: "Front", back: "Back", file: "PDF" };

/* ---------------------------------------------------------- upload form -- */

interface UploadValues {
  kind: "photos" | "pdf";
  front: File | null;
  back: File | null;
  pdf: File | null;
  note: string;
}

const ERROR_BORDER = "border-red-500 ring-1 ring-red-500";

function FileField({
  id,
  label,
  types,
  kindText,
  required = false,
  value,
  error,
  onChange,
  onReject,
}: {
  id: string;
  label: string;
  /** The only file types taken (the picker's "All files" is refused too). */
  types: string[];
  /** "a JPG, PNG or WEBP photo" / "a PDF", for the error. */
  kindText: string;
  required?: boolean;
  value: File | null;
  error?: string;
  onChange: (file: File | null) => void;
  onReject: (message: string) => void;
}) {
  const pick = (input: HTMLInputElement) => {
    const file = input.files?.[0] ?? null;
    if (file && !types.includes(file.type)) {
      // A video, Excel, Word ... file: refused at the field and taken out of the input.
      input.value = "";
      onChange(null);
      onReject(`${file.name} cannot be uploaded. Choose ${kindText}.`);
      return;
    }
    onChange(file);
  };
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={id}
        type="file"
        accept={types.join(",")}
        aria-invalid={Boolean(error)}
        onChange={(event) => pick(event.target)}
        className={`block w-full rounded-md border bg-white text-xs text-gray-700 file:mr-3 file:cursor-pointer file:border-0 file:bg-navy-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-navy hover:file:bg-[#dbe2f3] ${
          error ? ERROR_BORDER : "border-gray-300"
        }`}
      />
      {value && !error && <span className="truncate text-[11px] text-gray-500">{(value.size / 1024).toFixed(0)} KB before upload</span>}
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </div>
  );
}

function UploadForm({
  studentId,
  type,
  onDone,
  onCancel,
}: {
  studentId: string;
  type: StudentDocumentType;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user } = useContext(myContext);
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    formState: { isDirty, isSubmitting, errors },
  } = useForm<UploadValues>({ defaultValues: { kind: "photos", front: null, back: null, pdf: null, note: "" } });
  const kind = watch("kind");
  const ids = { front: `doc-${type.id}-front`, back: `doc-${type.id}-back`, pdf: `doc-${type.id}-pdf` };

  /** Error at the field, scrolled into view and focused (required-field rule). */
  const fail = (name: "front" | "back" | "pdf", message: string) => {
    setError(name, { message });
    const field = document.getElementById(ids[name]);
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  };

  const save = handleSubmit(async (values) => {
    const uploads: DocumentUpload[] =
      values.kind === "pdf"
        ? values.pdf
          ? [{ file: values.pdf, side: "file" }]
          : []
        : [
            ...(values.front ? [{ file: values.front, side: "front" as const }] : []),
            ...(values.back ? [{ file: values.back, side: "back" as const }] : []),
          ];
    if (values.kind === "pdf" && !values.pdf) return fail("pdf", "Choose the PDF.");
    if (values.kind === "photos" && !values.front) return fail("front", "Choose the front photo.");
    try {
      await uploadDocumentVersion(studentId, type.id, uploads, { uid: user?.uid ?? "", name: user?.fullName ?? "" }, values.note);
      toast.success(`${type.name}: new version saved.`);
      onDone();
    } catch (cause) {
      console.error("Document upload failed.", cause);
      toast.error(cause instanceof Error ? cause.message : "The document could not be uploaded.");
    }
  });

  return (
    <form onSubmit={(event) => void save(event)} noValidate className="mt-3 flex flex-col gap-3 rounded-xl bg-gray-50 p-3">
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <CircleCheckbox
              id={`doc-${type.id}-kind-photos`}
              label="Photos (front + back)"
              checked={field.value === "photos"}
              onCheckedChange={(on) => on && (clearErrors(), field.onChange("photos"))}
              className="text-xs font-semibold"
            />
            <CircleCheckbox
              id={`doc-${type.id}-kind-pdf`}
              label="One PDF"
              checked={field.value === "pdf"}
              onCheckedChange={(on) => on && (clearErrors(), field.onChange("pdf"))}
              className="text-xs font-semibold"
            />
          </div>
        )}
      />
      {kind === "photos" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="front"
            render={({ field }) => (
              <FileField
                id={ids.front}
                label="Front"
                types={STUDENT_DOCUMENT_PHOTO_TYPES}
                kindText={PHOTO_TEXT}
                required
                value={field.value}
                error={errors.front?.message}
                onChange={(file) => (clearErrors("front"), field.onChange(file))}
                onReject={(message) => fail("front", message)}
              />
            )}
          />
          <Controller
            control={control}
            name="back"
            render={({ field }) => (
              <FileField
                id={ids.back}
                label="Back (if any)"
                types={STUDENT_DOCUMENT_PHOTO_TYPES}
                kindText={PHOTO_TEXT}
                value={field.value}
                error={errors.back?.message}
                onChange={(file) => (clearErrors("back"), field.onChange(file))}
                onReject={(message) => fail("back", message)}
              />
            )}
          />
        </div>
      ) : (
        <Controller
          control={control}
          name="pdf"
          render={({ field }) => (
            <FileField
              id={ids.pdf}
              label={`PDF (up to ${MAX_MB} MB)`}
              types={[STUDENT_DOCUMENT_PDF_TYPE]}
              kindText="a PDF"
              required
              value={field.value}
              error={errors.pdf?.message}
              onChange={(file) => (clearErrors("pdf"), field.onChange(file))}
              onReject={(message) => fail("pdf", message)}
            />
          )}
        />
      )}
      <Controller
        control={control}
        name="note"
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label htmlFor={`doc-${type.id}-note`} className="text-xs font-semibold text-gray-700">
              Note (optional)
            </label>
            <input
              id={`doc-${type.id}-note`}
              {...field}
              maxLength={300}
              placeholder="e.g. Name corrected by the parents"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#ad1a6f]"
            />
          </div>
        )}
      />
      <p className="text-[11px] text-gray-500">Photos are made smaller before upload. Up to {MAX_MB} MB per file. The old version is kept.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${CVES_BUTTON}`}
        >
          {isSubmitting && <Spinner size="xs" tone="white" />}
          {isSubmitting ? "Uploading..." : "Save version"}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- rows -- */

function FileButtons({
  version,
  typeName,
  onOpen,
  canDownload,
}: {
  version: StudentDocumentVersion;
  typeName: string;
  onOpen: (file: StudentDocumentFile, title: string) => void;
  /** Admin: a download icon next to each file. */
  canDownload: boolean;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const titleOf = (file: StudentDocumentFile) => `${typeName} · ${SIDE_LABEL[file.side]} · ${when(version.uploadedAt)}`;

  const download = async (file: StudentDocumentFile) => {
    setSaving(file.path);
    try {
      await downloadDocumentFile(file.path, documentFileName(titleOf(file), file.contentType));
    } catch (cause) {
      console.error("Document download failed.", cause);
      toast.error("The file could not be downloaded.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <span className="flex flex-wrap gap-1.5">
      {version.files.map((file) => (
        <span key={file.path} className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => onOpen(file, titleOf(file))}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-navy hover:text-[#ad1a6f]"
          >
            {file.side === "file" ? <FileText className="h-3.5 w-3.5" aria-hidden="true" /> : <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            {SIDE_LABEL[file.side]}
          </button>
          {canDownload && (
            <Tooltip content={`Download ${SIDE_LABEL[file.side].toLowerCase()}`}>
              <button
                type="button"
                onClick={() => void download(file)}
                disabled={saving === file.path}
                aria-label={`Download ${typeName} ${SIDE_LABEL[file.side]}`}
                className="grid h-full place-items-center border-l border-gray-200 px-1.5 text-navy hover:bg-navy-soft hover:text-[#ad1a6f] disabled:opacity-50"
              >
                {saving === file.path ? <Spinner size="xs" label="" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            </Tooltip>
          )}
        </span>
      ))}
    </span>
  );
}

interface PanelProps {
  studentId: string;
  /** Hide the upload / verify buttons (e.g. a read-only place). */
  readOnly?: boolean;
}

function StudentDocumentsPanel({ studentId, readOnly = false }: PanelProps) {
  const { user, can } = useContext(myContext);
  const isAdmin = user?.scope?.kind === "all";
  const canUpload = !readOnly && (isAdmin || can(PERMISSIONS.STUDENT_DOCUMENTS));
  const { types, loading: typesLoading, error: typesError } = useDocumentTypes();
  const { summary, versions, loading, error, reload } = useStudentDocuments(studentId);
  const [uploading, setUploading] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ file: StudentDocumentFile; title: string } | null>(null);
  const { confirmPassword, passwordDialog } = usePasswordConfirm();
  const canDelete = isAdmin && !readOnly;

  /** Admin: a version removed for good, after the password (a wrong upload). */
  const removeVersion = async (type: StudentDocumentType, version: StudentDocumentVersion, all: StudentDocumentVersion[]) => {
    const number = all.length - all.findIndex((item) => item.id === version.id);
    const ok = await confirmPassword({
      title: "Delete document",
      message: `Version ${number} of ${type.name} (${when(version.uploadedAt)}) and its files will be removed for good. This cannot be undone.`,
      confirmText: "Delete",
    });
    if (!ok) return;
    setBusy(version.id);
    try {
      await deleteDocumentVersion(
        studentId,
        version,
        all.filter((item) => item.id !== version.id),
        summary.verified[type.id]?.versionId ?? ""
      );
      toast.success(`${type.name}: version ${number} deleted.`);
      reload();
    } catch (cause) {
      console.error("Document version could not be deleted.", cause);
      toast.error("The document could not be deleted.");
    } finally {
      setBusy(null);
    }
  };

  const deleteButton = (type: StudentDocumentType, version: StudentDocumentVersion, all: StudentDocumentVersion[]) =>
    canDelete ? (
      <button
        type="button"
        onClick={() => void removeVersion(type, version, all)}
        disabled={busy === version.id}
        aria-label={`Delete this version of ${type.name}`}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {busy === version.id ? <Spinner size="xs" label="" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
        Delete
      </button>
    ) : null;

  if (typesLoading || loading) return <Loader fullScreen={false} label="Loading documents..." />;
  if (typesError || error) return <p className="text-sm text-red-600">{typesError ?? error}</p>;

  // Active types, and switched-off ones that still have versions.
  const shown = types.filter((type) => type.active || summary.uploaded[type.id]?.versions);
  if (shown.length === 0) return <p className="text-sm text-gray-500">No document types yet. Add them in Settings &gt; Student documents.</p>;

  const toggleVerified = async (type: StudentDocumentType, versionId: string, verified: boolean) => {
    setBusy(type.id);
    try {
      if (verified) await unverifyDocument(studentId, type.id);
      else await verifyDocument(studentId, type.id, versionId, { uid: user?.uid ?? "", name: user?.fullName ?? "" });
      reload();
    } catch (cause) {
      console.error("Verify failed.", cause);
      toast.error("It could not be saved.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {shown.map((type) => {
        const all = versions.filter((version) => version.typeId === type.id);
        const latest = all[0];
        const verified = isVerified(summary, type.id);
        const check = summary.verified[type.id];
        const older = all.slice(1);
        return (
          <section key={type.id} className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900">
                  {type.name}
                  {type.required && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">Required</span>}
                  {!type.active && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">No new uploads</span>}
                </h4>
                {latest ? (
                  <p className="mt-0.5 text-xs text-gray-500">
                    Version {all.length} · {when(latest.uploadedAt)}
                    {latest.uploadedByName ? ` · by ${latest.uploadedByName}` : ""}
                    {latest.note ? ` · ${latest.note}` : ""}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-gray-500">Not uploaded yet.</p>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  !latest ? "bg-[#fce7e7] text-[#b91c1c]" : verified ? "bg-[#e4f4ea] text-[#047857]" : "bg-[#fff0dc] text-[#b45309]"
                }`}
              >
                {verified && <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                {!latest ? "Missing" : verified ? "Verified" : "Not verified"}
              </span>
            </div>

            {latest && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <FileButtons version={latest} typeName={type.name} onOpen={(file, title) => setViewing({ file, title })} canDownload={isAdmin} />
                {deleteButton(type, latest, all)}
                {verified && check && (
                  <span className="text-[11px] text-gray-500">
                    Verified by {check.byName || "the admin"}, {when(check.at)}
                  </span>
                )}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {canUpload && type.active && uploading !== type.id && (
                <button
                  type="button"
                  onClick={() => setUploading(type.id)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-light"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {latest ? "Upload new version" : "Upload"}
                </button>
              )}
              {isAdmin && !readOnly && latest && (
                <button
                  type="button"
                  disabled={busy === type.id}
                  onClick={() => void toggleVerified(type, latest.id, verified)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    verified ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-[#047857] text-[#047857] hover:bg-[#e4f4ea]"
                  }`}
                >
                  {busy === type.id ? <Spinner size="xs" label="" /> : <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                  {verified ? "Remove verified" : "Mark verified"}
                </button>
              )}
              {older.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory(history === type.id ? null : type.id)}
                  aria-expanded={history === type.id}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-navy hover:text-[#ad1a6f]"
                >
                  Older versions ({older.length})
                  <ChevronDown className={`h-3.5 w-3.5 transition ${history === type.id ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              )}
            </div>

            {uploading === type.id && (
              <UploadForm
                studentId={studentId}
                type={type}
                onCancel={() => setUploading(null)}
                onDone={() => {
                  setUploading(null);
                  reload();
                }}
              />
            )}

            {history === type.id && older.length > 0 && (
              <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100">
                {older.map((version, index) => (
                  <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="text-xs text-gray-600">
                      Version {all.length - 1 - index} · {when(version.uploadedAt)}
                      {version.uploadedByName ? ` · ${version.uploadedByName}` : ""}
                      {version.note ? ` · ${version.note}` : ""}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <FileButtons version={version} typeName={type.name} onOpen={(file, title) => setViewing({ file, title })} canDownload={isAdmin} />
                      {deleteButton(type, version, all)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <DocumentViewer file={viewing?.file ?? null} title={viewing?.title ?? ""} onClose={() => setViewing(null)} canDownload={isAdmin} />
      {passwordDialog}
    </div>
  );
}

export default StudentDocumentsPanel;
