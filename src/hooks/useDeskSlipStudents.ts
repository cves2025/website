import { useEffect, useState } from "react";
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";

import { db } from "../firebase/config";
import { COLLECTION } from "../constants";
import type { DeskSlipStudent } from "../utils/type";

/* ---------- Shared caches (page se bahar bhi zinda rehte hain) ---------- */
const studentsCache = new Map<string, DeskSlipStudent[]>();
const photoCache = new Map<string, string>(); // studentId -> photo url
const inflight = new Map<string, Promise<DeskSlipStudent[]>>();

export function clearDeskSlipCache() {
  studentsCache.clear();
  photoCache.clear();
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// Sirf wahi photos fetch hoti hain jo cache mein nahi hain
async function fetchMissingPhotos(studentIds: string[]) {
  const missing = studentIds.filter((id) => !photoCache.has(id));
  if (missing.length === 0) return;

  await Promise.all(
    chunk(missing, 30).map(async (ids) => {
      const snap = await getDocs(
        query(
          collection(db, COLLECTION.STUDENTS),
          where(documentId(), "in", ids)
        )
      );
      snap.forEach((docSnap) => {
        const photo = docSnap.data().studentPhoto;
        photoCache.set(docSnap.id, typeof photo === "string" ? photo : "");
      });
      // jo docs mile hi nahi unhe bhi cache kar do, taaki dobara read na ho
      ids.forEach((id) => {
        if (!photoCache.has(id)) photoCache.set(id, "");
      });
    })
  );
}

async function loadDeskSlipStudents(
  academicYear: string,
  className: string,
  section: string
): Promise<DeskSlipStudent[]> {
  const key = `${academicYear}|${className}|${section}`;

  const cached = studentsCache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = (async () => {
    // Filters Firestore mein hi lagte hain, isliye sirf zaroori docs read honge
    const constraints: QueryConstraint[] = [
      where("academicYear", "==", academicYear),
    ];
    if (className !== "all") {
      constraints.push(where("className", "==", className));
    }
    if (section !== "all") {
      constraints.push(where("section", "==", section));
    }

    const snapshot = await getDocs(
      query(collection(db, COLLECTION.ENROLLMENTS), ...constraints)
    );

    const rows = snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          isDeleted: data.isDeleted === true,
          studentId: data.studentId ?? "",
          admissionNo: data.enrollment ?? "",
          studentName:
            data.studentName ||
            `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
          fatherName: data.fatherName ?? "",
          className: data.className ?? "",
          section: data.section ?? "",
        };
      })
      .filter((row) => !row.isDeleted)
      .map(({ isDeleted, ...rest }) => rest);

    rows.sort((a, b) => {
      if (a.className !== b.className)
        return a.className.localeCompare(b.className);
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      return a.studentName.localeCompare(b.studentName);
    });

    const ids = Array.from(
      new Set(rows.map((row) => row.studentId).filter(Boolean))
    );
    await fetchMissingPhotos(ids);

    const result: DeskSlipStudent[] = rows.map((row) => ({
      ...row,
      photoUrl: photoCache.get(row.studentId) ?? "",
    }));

    studentsCache.set(key, result);
    return result;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, request);
  return request;
}

/* ---------- Hook ---------- */
interface Options {
  academicYear: string;
  className: string; // "all" = sab classes
  section: string; // "all" = sab sections
  enabled: boolean;
}

export function useDeskSlipStudents({
  academicYear,
  className,
  section,
  enabled,
}: Options) {
  const [students, setStudents] = useState<DeskSlipStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !academicYear) {
      setStudents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadDeskSlipStudents(academicYear, className, section)
      .then((data) => {
        if (!cancelled) setStudents(data);
      })
      .catch((err) => {
        console.error("Failed to load desk slip students:", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error("Failed to load students")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [academicYear, className, section, enabled]);

  return { students, loading, error };
}

export default useDeskSlipStudents;