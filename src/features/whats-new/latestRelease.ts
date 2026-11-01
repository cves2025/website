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
  id: "2026-11-promotion-permissions-website",
  title: "Promotion, Permissions & Website Settings",
  description:
    "Move students into the next session, control what teachers can use, and update the school website yourself - banner, news, gallery, school photo and downloads - without any code change.",
  highlights: [
    "Promote Students (Student > Promote Student) - move one student or a whole class into the next session. Pass / Fail from all exams suggests the new class; class and section can be changed for every student, Class 8 can be marked Passed Out / TC, and any promotion can be undone.",
    "Permissions (click your name in the sidebar) - switch features ON or OFF for all teachers, for class teachers, or for one teacher. Changes apply at once, without logging out.",
    "My Profile (click your name in the sidebar) - teachers can now see their own details: personal, job and contact details and their classes & subjects.",
    "Home Banner (click your name in the sidebar) - change the slides at the top of the website: photo, title, description, order, show / hide and how long each slide stays. Visitors can now use arrows or swipe on a phone to move the slides.",
    "News (click your name in the sidebar) - add, edit, hide or delete the Latest News on the Home page, with an optional picture. News without a picture shows the school logo.",
    "Gallery (click your name in the sidebar) - upload many photos at once, add a caption, hide or delete them. The school photo of the Home and About pages can be changed here too.",
    "Downloads (click your name in the sidebar) - upload the Syllabus and Time Table PDF of every class for any session. The website's Downloads page shows the current session, and the Downloads menu now opens that page directly.",
    "Sidebar - it now stays collapsed and opens when you move the mouse over it, then closes again when you move away. Use the arrow button to keep it open.",
    "Searchable dropdowns - choosing a student or a teacher now has a search box, so you can find them by name, enrollment number or email.",
    "The admin header now shows the school name.",
  ],
};
