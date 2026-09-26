import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { COLLECTION } from "../constants";
import { db } from "../firebase/config";
import type { TeacherSubjectOption } from "../utils/type";

export interface UseClassSubjectsResult {
  subjectsOfClass: (className: string) => TeacherSubjectOption[];
  loadingSubjects: boolean;
}

/**
 * Subjects of the Subjects page grouped by class, used to pick what a teacher
 * teaches in every class of a section.
 */
export function useClassSubjects(): UseClassSubjectsResult {
  const [subjectsByClass, setSubjectsByClass] = useState<
    Map<string, TeacherSubjectOption[]>
  >(new Map());
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION.SUBJECTS),
      (snapshot) => {
        const seen = new Set<string>();
        const rows: {
          className: string;
          order: number;
          option: TeacherSubjectOption;
        }[] = [];

        snapshot.docs.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();
          const className =
            typeof data.className === "string" ? data.className.trim() : "";
          const name = typeof data.name === "string" ? data.name.trim() : "";
          if (!className || !name) return;

          const key = `${className.toLowerCase()}::${name.toLowerCase()}`;
          if (seen.has(key)) return;
          seen.add(key);

          rows.push({
            className,
            order:
              typeof data.order === "number"
                ? data.order
                : Number.MAX_SAFE_INTEGER,
            option: {
              name,
              type: typeof data.type === "string" ? data.type : "",
            },
          });
        });

        const grouped = new Map<string, TeacherSubjectOption[]>();
        rows
          .sort(
            (a, b) =>
              a.order - b.order || a.option.name.localeCompare(b.option.name)
          )
          .forEach((row) => {
            const list = grouped.get(row.className) ?? [];
            list.push(row.option);
            grouped.set(row.className, list);
          });

        setSubjectsByClass(grouped);
        setLoadingSubjects(false);
      },
      (error) => {
        console.error("Failed to load subjects:", error);
        setLoadingSubjects(false);
      }
    );

    return unsubscribe;
  }, []);

  const subjectsOfClass = (className: string): TeacherSubjectOption[] =>
    subjectsByClass.get(className.trim()) ?? [];

  return { subjectsOfClass, loadingSubjects };
}
