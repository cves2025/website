# Student documents (Aadhaar, birth certificate ...): upload, versions, verified

Website: built. Mobile app: still to build (see the end).

## Rules agreed with the school

- Upload a student's documents: photos (front + back) or one PDF, nothing else: the photo fields take
  only JPG / PNG / WEBP and the PDF field only a PDF (`STUDENT_DOCUMENT_PHOTO_TYPES`,
  `STUDENT_DOCUMENT_PDF_TYPE`); a video, Excel ... picked via "All files" is refused at the field and in
  `prepare`, and storage.rules takes only `front.jpg` / `back.jpg` (image/jpeg) or `file.pdf`. 2 MB per file
  (`STUDENT_DOCUMENT_MAX_BYTES`, also in storage.rules); photos are made smaller first
  (`compressImage` with `STUDENT_DOCUMENT_IMAGE`: 1800 px, JPEG 0.82).
- Document types: **Settings > Student documents** (admin): name, Required, Active, order.
  `DEFAULT_STUDENT_DOCUMENT_TYPES` (Student Aadhaar, Birth Certificate, Father Aadhaar,
  Mother Aadhaar) until saved. A type's id never changes; a type is switched off, never removed.
- A new upload is a **new version**; versions are never changed and stay viewable. Only the **admin**
  can delete a version for good (a wrong upload): Delete on the version, then the password
  (`usePasswordConfirm`); the summary moves to the newest version left, a Verified tick on it goes,
  then its files are deleted (`deleteDocumentVersion`).
- **Verified** (admin): for one version; a newer version is "Not verified" until checked again.
- Who: every staff member **views**; admin or `student.documents` ("Upload Student Documents",
  off by default) **uploads**; only the admin deletes (password). The UI shows a teacher only their own students
  (Student List scope).
- Where: Student List (Documents button -> modal; "N/M docs" badge of required types;
  "Documents missing only" tick), Student View (Documents section, `print:hidden`).

## Data

| Path | Fields | Write |
|---|---|---|
| `panelSettings/studentDocuments` | `types: [{ id, name, required, order, active }]`, `updatedAt`, `updatedBy` | admin |
| `studentDocuments/{studentId}` | `uploaded: { <typeId>: { versions, lastVersionId, lastAt } }`, `verified: { <typeId>: { versionId, by, byName, at } }`, `updatedAt` | admin (all); `student.documents` only `uploaded` + `updatedAt` |
| `studentDocuments/{studentId}/versions/{versionId}` | `typeId, files: [{ path, name, contentType, size, side }]` (front / back / file), `uploadedBy, uploadedByName, uploadedAt, note` | create (`student.documents`, `uploadedBy` = self, 1-2 files); never update; delete: admin |

Storage: `studentDocuments/{studentId}/{typeId}/{versionId}/{front|back|file}.{jpg|pdf}`; create
only (admin / `student.documents`, image or PDF, 2 MB), never replaced, deleted by the admin; read by staff
(the catch-all read). **No download URL is stored**: a file is opened with `getBlob` (through the
rules) as an object URL, freed on close. CORS (`storage-cors.json`, GET) is set on both buckets.

`canUploadDocuments()` in storage.rules re-does firestore.rules' `teacherCan('student.documents')`
for a permission that is not a built-in default: granted to the teacher, or in
`panelSettings/rolePermissions.teacher` / `.classTeacher` (class teacher), and not revoked.

## Files (website)

| File | What it does |
|---|---|
| `src/utils/studentDocumentsService.ts` | Types load / save, `documentTypeId`, summaries (`loadDocumentSummaries`, 30 per `in` query), `loadStudentDocuments`, `uploadDocumentVersion` (files, then version + summary in one batch), `verifyDocument` / `unverifyDocument`, `openDocumentFile` (getBlob), `isVerified`, `requiredDone` |
| `src/hooks/useStudentDocuments.ts` | `useDocumentTypes`, `useStudentDocuments(studentId)`, `useDocumentSummaries(ids)` |
| `src/component/panel/students/documents/StudentDocumentsPanel.tsx` | One block per type: Missing / Not verified / Verified, latest version's files, Upload new version (photos or PDF, note; Save off until a file; error at the field), Mark / Remove verified (admin), Older versions |
| `.../documents/DocumentViewer.tsx` | The file over the page (image / PDF iframe from an object URL); Esc, x, outside closes; admin: Download (saves that object URL as e.g. `Student-Aadhaar_Front_22-Nov-2026-340-PM.jpg`, no link kept) |
| `.../documents/StudentDocumentsModal.tsx` | Student List's modal around the panel |
| `src/component/panel/students/StudentList.tsx` | Documents button (every staff member), badge in the Name cell, "Documents missing only" tick (reads the summaries of every listed student; otherwise only the page's) |
| `src/component/panel/students/StudentView.tsx` | Documents section under the sheets, `print:hidden` |
| `src/component/panel/settings/StudentDocumentTypesSection.tsx` | Settings section (useFieldArray; Required / Active ticks, arrows; new id from the name on Save) |
| `src/permissions` | `STUDENT_DOCUMENTS` + catalog row (Students group) |

## Cost

Modal / View: types (1) + summary (1) + the student's versions. List badge: the page's
summaries (30 per query); the "missing" tick reads every listed student's summary once.

## Mobile (to build)

`features/students`: a Documents screen per student like the photo update (types, upload from
camera / gallery / PDF picker, versions, open); `services/studentDocumentsService.ts` mirrors
the website service; same rules.
