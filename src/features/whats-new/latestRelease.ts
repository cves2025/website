/**
 * The one release announcement shown by the "What's New" modal.
 *
 * Only the LATEST release lives here. For the next release, replace this
 * object (and its `id`) - no history is kept and only the newest release is
 * ever shown to users who have not seen it yet.
 */
export interface LatestRelease {
  /** Unique id per release, e.g. "2026-10-feature-name". */
  id: string;
  title: string;
  description: string;
  highlights: string[];
}

export const latestRelease: LatestRelease = {
  id: "2026-10-photo-drag-drop",
  title: "Photo Upload & Student Updates",
  description:
    "This release adds drag & drop photo upload to the admission form, alongside the faster student list and smoother admit card workflow.",
  highlights: [
    "Admission Form - drag & drop a photo directly onto the Student / Father / Mother photo boxes to attach it faster; click-to-choose and copy-paste still work exactly as before.",
    "Student List - each student now shows their photo in a new Photo column so you can identify records at a glance.",
    "Student List - show 25 / 50 / 75 / 100 records per page, sort by any column, and filter by class or section.",
    "Edit mode - after updating a student the form automatically opens the next student, and a new \"Next Student\" button is available on both pages.",
    "Admit Cards - cards print alphabetically by student name with a roll number, and you can now generate them section-wise.",
  ],
};
