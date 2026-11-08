import { useEffect, useState } from "react";
import {
  collection,
  DocumentData,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  where,
} from "firebase/firestore";

import {
  COLLECTION,
  DEFAULT_ADMIN_JOB_ROLE,
  DEFAULT_TEACHER_JOB_ROLE,
  STAFF_ROLE,
} from "../constants";
import { db } from "../firebase/config";
import type { TeacherRecord } from "../utils/type";
import { toDateOrNull } from "../utils/toDateOrNull";
import {
  sectionAssignmentsFromDoc,
  toLegacyTeacherFields,
} from "../utils/teacherSections";

export interface UseTeachersResult {
  teachers: TeacherRecord[];
  loading: boolean;
  error: string | null;
}

function toTeacherRecord(
  snapshot: QueryDocumentSnapshot<DocumentData>
): TeacherRecord {
  return teacherRecordFromData(snapshot.id, snapshot.data());
}

/** A users/{uid} document as a TeacherRecord (also used by the Profile page). */
export function teacherRecordFromData(
  id: string,
  data: DocumentData
): TeacherRecord {
  const stringField = (key: string) =>
    typeof data[key] === "string" ? data[key] : "";

  const role = stringField("role") || "teacher";
  // Staff have none; they are not teachers.
  const sectionAssignments = role === STAFF_ROLE ? [] : sectionAssignmentsFromDoc(data);
  const legacyFields = toLegacyTeacherFields(sectionAssignments);
  // Records saved before Job Roles existed.
  const jobRole =
    stringField("jobRole") ||
    (role === "admin" ? DEFAULT_ADMIN_JOB_ROLE : role === STAFF_ROLE ? "" : DEFAULT_TEACHER_JOB_ROLE);

  return {
    id,
    uid: id,
    role,
    jobRole,
    // An admin profile may only carry `fullName`.
    firstName: stringField("firstName") || stringField("fullName").trim(),
    lastName: stringField("lastName"),
    gender: stringField("gender"),
    dateOfBirth: toDateOrNull(data.dateOfBirth),
    employeeId: stringField("employeeId"),
    designation: stringField("designation"),
    status: stringField("status") || "Active",
    email: stringField("email"),
    phone: stringField("phone"),
    joiningDate: toDateOrNull(data.joiningDate),
    address: stringField("address"),
    photo: stringField("photo"),
    qualification: stringField("qualification"),
    sectionAssignments,
    assignedClasses: legacyFields.assignedClasses,
    isClassTeacher: legacyFields.isClassTeacher,
    classTeacherOf: legacyFields.classTeacherOf,
    isDeleted: data.isDeleted === true,
    createdAt: stringField("createdAt"),
    updatedAt: stringField("updatedAt"),
  };
}

/**
 * Live list of the users with `role` (teachers by default; also used for
 * the staff and the admins), newest first, deleted ones left out. An empty
 * `role` reads nothing (for a hook that is not needed on this screen).
 */
export function useTeachers(role: string = "teacher"): UseTeachersResult {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) {
      setTeachers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const teachersQuery = query(
      collection(db, COLLECTION.USERS),
      where("role", "==", role)
    );

    const unsubscribe = onSnapshot(
      teachersQuery,
      (snapshot) => {
        setTeachers(
          snapshot.docs
            .map(toTeacherRecord)
            .filter((teacher) => !teacher.isDeleted)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Failed to load teachers:", snapshotError);
        setError(snapshotError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [role]);

  return { teachers, loading, error };
}