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
  id: "2026-11-new-look",
  title: "A Fresh New Look",
  description:
    "The whole panel has a cleaner, consistent design - dropdowns, tables, buttons, toggles and forms now look and work the same on every page. Your data and the way you work stay the same.",
  highlights: [
    "Easier dates & times - Exam Schedule and Result Card Settings now open a calendar to pick a date, and a simple Hour / Minute / AM-PM picker for paper timings.",
    "Admission Form - pressing Next now scrolls straight to the first required field that is still empty, so nothing is missed.",
    "Marks Entry & Cross List - a clearer table with the header and student name always visible while scrolling, plus Pass / Fail and percentage badges.",
    "Student List, Subjects, Exams & Settings - edit and delete are now small icon buttons, and the student list header stays visible while you scroll.",
    "Safer changes - removing a remark range or deleting saved settings now asks for confirmation, and Save / Update buttons turn on only after you change something.",
    "Suggested Remarks - the Add Range button hides once your ranges cover 0% to 100%.",
    "Academic Year lists now start from the current session, 2026-27.",
  ],
};
