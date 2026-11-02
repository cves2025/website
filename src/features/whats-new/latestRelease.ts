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
  id: "2026-11-student-attendance",
  title: "Student Attendance",
  description:
    "Take daily attendance of every section, see it month by month, keep the school's holidays in one place and fill the attendance on the result card in one click.",
  highlights: [
    "Mark Attendance (Attendance > Mark Attendance) - the class teacher marks today's attendance of their section. Everyone starts as Present; tap Absent or Leave where needed and save. The admin can mark or correct any section and any date.",
    "Attendance Report (Attendance > Attendance Report) - a month of a section on one page: P / A / L for every day, totals and percentage, H on holidays and ? on working days nobody marked. Download it as Excel or print it.",
    "Holiday Calendar (Attendance > Holiday Calendar) - choose the weekly off days and add holidays for the whole school or for some classes only (e.g. winter vacation). Attendance is not taken on these days.",
    "Dashboard - a Today's Attendance card shows which sections have not marked today's attendance yet.",
    "Marks - the new Fill from Daily Attendance button fills Present / Total days of the exam from the daily attendance (from the start of the session to the exam's end date; the dates can be changed). The marks Excel template also comes with the attendance filled in.",
    "Exam attendance on the Marks page and in the Excel upload can now be changed only by the admin and the section's class teacher.",
    "Permissions - Mark Attendance is ON for every teacher, Attendance Report for class teachers, and Holiday Calendar can be given to a teacher from the Permissions page.",
  ],
};
