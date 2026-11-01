import { useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { COLLECTION } from "../../../../constants";
import { db } from "../../../../firebase/config";
import PageHeader from "../../../../custom-components/PageHeader";
import { teacherRecordFromData } from "../../../../hooks/useTeachers";
import {
  formatSectionLabel,
  sortClassSubjects,
  toClassLabel,
} from "../../../../utils/teacherSections";
import type { TeacherRecord } from "../../../../utils/type";
import { myContext } from "../../../context/MyContextProvider";

function formatDate(value: Date | null): string {
  return value
    ? value.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "-";
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-gray-800">{title}</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {children}
      </dl>
    </div>
  );
}

function InfoItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-gray-800">
        {value.trim() || "-"}
      </dd>
    </div>
  );
}

/** Classes and subjects of every section the teacher is assigned to. */
function AssignmentsCard({ teacher }: { teacher: TeacherRecord }) {
  const sections = teacher.sectionAssignments.filter(
    (assignment) => assignment.isClassTeacher || assignment.classes.length > 0
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-gray-800">
        Classes &amp; Subjects
      </h2>
      {sections.length === 0 ? (
        <p className="text-sm text-gray-500">No classes assigned yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sections.map((assignment) => (
            <div
              key={assignment.section}
              className="rounded-lg border border-gray-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
                <h3 className="text-sm font-bold text-gray-700">
                  {formatSectionLabel(assignment.section)}
                </h3>
                {assignment.isClassTeacher && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                    Class teacher
                    {assignment.classTeacherOf
                      ? ` of ${toClassLabel(assignment.classTeacherOf)}`
                      : ""}
                  </span>
                )}
              </div>
              {assignment.classes.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">
                  No subjects assigned in this section.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 px-4">
                  {sortClassSubjects(assignment.classes).map((entry) => (
                    <li
                      key={entry.className}
                      className="flex flex-wrap items-start gap-2 py-2.5"
                    >
                      <span className="w-20 shrink-0 text-sm font-semibold text-gray-700">
                        {toClassLabel(entry.className)}
                      </span>
                      <span className="flex flex-1 flex-wrap gap-1.5">
                        {entry.subjects.length === 0 ? (
                          <span className="text-sm text-gray-400">-</span>
                        ) : (
                          entry.subjects.map((subject) => (
                            <span
                              key={subject}
                              className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-semibold text-primaryPink"
                            >
                              {subject}
                            </span>
                          ))
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * "My Profile": the signed-in user's own users/{uid} document - the same
 * information that is entered on Add Teacher. Read-only; changes are made by
 * the admin on the Add Teacher page. Live, so an admin's edit shows up at once.
 */
function Profile() {
  const { user } = useContext(myContext);
  const uid = user?.uid ?? "";

  const [teacher, setTeacher] = useState<TeacherRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    return onSnapshot(
      doc(db, COLLECTION.USERS, uid),
      (snapshot) => {
        setTeacher(
          snapshot.exists()
            ? teacherRecordFromData(snapshot.id, snapshot.data())
            : null
        );
        setError(null);
        setLoading(false);
      },
      (loadError) => {
        console.error("Failed to load the profile:", loadError);
        setError("Your profile could not be loaded. Please try again.");
        setLoading(false);
      }
    );
  }, [uid]);

  const fullName = teacher
    ? `${teacher.firstName} ${teacher.lastName}`.trim() ||
      user?.fullName ||
      teacher.email
    : "";
  const isActive = teacher?.status === "Active";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="My Profile"
        titleStyle="text-primaryBlue"
        description="Your details as saved by the school. Please contact the admin if anything needs to be changed."
        descriptionStyle="text-gray-500"
      />

      {loading ? (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500">
          Loading your profile...
        </p>
      ) : error ? (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : !teacher ? (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500">
          No profile has been saved for your account yet.
        </p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            {teacher.photo ? (
              <img
                src={teacher.photo}
                alt={`Photo of ${fullName}`}
                className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-pink-600 text-3xl font-bold text-white">
                {(fullName || "U").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 text-center sm:text-left">
              <p className="truncate text-xl font-bold text-gray-800">
                {fullName}
              </p>
              <p className="text-sm text-gray-500">
                {[teacher.designation, capitalize(teacher.role)]
                  .filter((part) => part && part !== "-")
                  .join(" · ")}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                {teacher.employeeId && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                    Employee ID: {teacher.employeeId}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {teacher.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoCard title="Personal Details">
              <InfoItem label="First Name" value={teacher.firstName} />
              <InfoItem label="Last Name" value={teacher.lastName} />
              <InfoItem label="Gender" value={capitalize(teacher.gender)} />
              <InfoItem
                label="Date of Birth"
                value={formatDate(teacher.dateOfBirth)}
              />
              <InfoItem
                label="Qualification"
                value={teacher.qualification}
                wide
              />
            </InfoCard>

            <InfoCard title="Job Details">
              <InfoItem label="Employee ID" value={teacher.employeeId} />
              <InfoItem label="Designation" value={teacher.designation} />
              <InfoItem
                label="Joining Date"
                value={formatDate(teacher.joiningDate)}
              />
              <InfoItem label="Status" value={teacher.status} />
            </InfoCard>

            <InfoCard title="Contact Details">
              <InfoItem label="Email" value={teacher.email} />
              <InfoItem label="Phone Number" value={teacher.phone} />
              <InfoItem label="Address" value={teacher.address} wide />
            </InfoCard>
          </div>

          <AssignmentsCard teacher={teacher} />
        </>
      )}
    </div>
  );
}

export default Profile;
