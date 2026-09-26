import { useEffect, useState } from "react";
import {
  collection,
  DocumentData,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  where,
} from "firebase/firestore";

import { COLLECTION } from "../constants";
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
  const data = snapshot.data();
  const stringField = (key: string) =>
    typeof data[key] === "string" ? data[key] : "";

  const sectionAssignments = sectionAssignmentsFromDoc(data);
  const legacyFields = toLegacyTeacherFields(sectionAssignments);

  return {
    id: snapshot.id,
    uid: snapshot.id,
    role: stringField("role") || "teacher",
    firstName: stringField("firstName"),
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

export function useTeachers(): UseTeachersResult {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const teachersQuery = query(
      collection(db, COLLECTION.USERS),
      where("role", "==", "teacher")
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
  }, []);

  return { teachers, loading, error };
}