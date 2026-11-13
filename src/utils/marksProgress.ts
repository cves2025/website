/** Marks entry progress of an exam (dashboard card): reading and summing up. Pure. */
import type { MarksPendingRow, MarksProgressDoc, MarksProgressSection } from "./type";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const progressKey = (className: string, section: string) => `${className}|${section}`;

/** A `marksProgress` document with every value checked. */
export function readMarksProgress(raw: unknown): MarksProgressDoc {
  const data = record(raw);
  const sections: Record<string, MarksProgressSection> = {};
  Object.entries(record(data.sections)).forEach(([key, value]) => {
    const item = record(value);
    const [keyClass = "", keySection = ""] = key.split("|");
    const subjects: Record<string, string> = {};
    Object.entries(record(item.subjects)).forEach(([id, name]) => {
      if (typeof name === "string") subjects[id] = name;
    });
    const entered: Record<string, number> = {};
    Object.entries(record(item.entered)).forEach(([id, count]) => {
      const number = Number(count);
      if (Number.isFinite(number)) entered[id] = Math.max(0, number);
    });
    sections[key] = {
      className: typeof item.className === "string" ? item.className : keyClass,
      section: typeof item.section === "string" ? item.section : keySection,
      students: Number.isFinite(Number(item.students)) ? Number(item.students) : 0,
      subjects,
      entered,
    };
  });
  return {
    session: typeof data.session === "string" ? data.session : "",
    examId: typeof data.examId === "string" ? data.examId : "",
    sections,
  };
}

interface PendingInput {
  progress: MarksProgressDoc | null;
  classes: readonly string[];
  sections: readonly string[];
  /** Students of a class + section (from the progress, or counted). */
  studentsOf: (className: string, section: string) => number;
  /** May this user see the class + section at all? */
  seesSection: (className: string, section: string) => boolean;
  /** May this user see this subject of the class + section? */
  seesSubject: (className: string, section: string, subjectName: string) => boolean;
}

/**
 * Every class + section of the exam the user may see, with its state:
 * complete (every subject has a mark for every student), in progress, or
 * not started (no mark yet). Sections without students are left out.
 */
export function marksPendingRows(input: PendingInput): MarksPendingRow[] {
  const rows: MarksPendingRow[] = [];
  input.classes.forEach((className) =>
    input.sections.forEach((section) => {
      if (!input.seesSection(className, section)) return;
      const students = input.studentsOf(className, section);
      if (students <= 0) return;
      const entry = input.progress?.sections[progressKey(className, section)];
      const subjects = Object.entries(entry?.subjects ?? {}).filter(([, name]) =>
        input.seesSubject(className, section, name)
      );
      const entered = (id: string) => Math.min(students, entry?.entered[id] ?? 0);
      const anyEntered = subjects.some(([id]) => entered(id) > 0) ||
        Object.values(entry?.entered ?? {}).some((count) => count > 0);
      if (!entry || subjects.length === 0 || !anyEntered) {
        rows.push({ className, section, students, status: "notStarted", pending: [], missingMarks: 0 });
        return;
      }
      const pending = subjects
        .map(([id, name]) => ({ name, missing: students - entered(id) }))
        .filter((item) => item.missing > 0);
      rows.push({
        className,
        section,
        students,
        status: pending.length === 0 ? "complete" : "progress",
        pending,
        missingMarks: pending.reduce((total, item) => total + item.missing, 0),
      });
    })
  );
  return rows;
}
