import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";

import { COLLECTION, CVES_ON_HOVER } from "../../../../constants";
import { db } from "../../../../firebase/config";
import Button from "../../../../custom-components/Button";
import SelectDropdown from "../../../../custom-components/SelectDropdown";
import { Label } from "@/components/ui/label";
import { useTeachers } from "../../../../hooks/useTeachers";
import {
  cleanPermissionList,
  isClassTeacherProfile,
  teacherDefaultPermissions,
  type Permission,
} from "../../../../permissions";
import { saveTeacherOverrides } from "../../../../utils/permissionSettingsService";
import PermissionSwitchList, {
  TAG_CLASS_TEACHER,
  TAG_CUSTOM,
  TAG_DEFAULT,
} from "./PermissionSwitchList";
import { useTeacherRoleDefaults } from "./useTeacherRoleDefaults";
import Loader from "../../../../custom-components/Loader";

interface Overrides {
  grant: Permission[];
  revoke: Permission[];
}

interface TeacherProfile {
  overrides: Overrides;
  isClassTeacher: boolean;
}

const sameSet = (a: readonly Permission[], b: readonly Permission[]) =>
  a.length === b.length && a.every((p) => b.includes(p));

/**
 * "Individual Teacher" tab: switch permissions ON / OFF for one teacher.
 * A switch that differs from the teacher's default (All Teachers tab +
 * class-teacher extras) is saved in users/{uid}.permissionOverrides; putting
 * it back to the default removes it from there again.
 */
function IndividualTeacherTab() {
  const { teachers, loading: teachersLoading } = useTeachers();
  const {
    defaults,
    loading: defaultsLoading,
    error: defaultsError,
  } = useTeacherRoleDefaults();

  const [teacherUid, setTeacherUid] = useState("");
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Overrides | null>(null);
  const [saving, setSaving] = useState(false);

  // The selected teacher's document, live (overrides + class-teacher flag).
  useEffect(() => {
    setProfile(null);
    setProfileError(null);
    setDraft(null);
    if (!teacherUid) return;

    return onSnapshot(
      doc(db, COLLECTION.USERS, teacherUid),
      (snapshot) => {
        const data = (snapshot.data() ?? {}) as Record<string, unknown>;
        const overrides = (data.permissionOverrides ?? {}) as {
          grant?: unknown;
          revoke?: unknown;
        };
        setProfile({
          overrides: {
            grant: cleanPermissionList(overrides.grant),
            revoke: cleanPermissionList(overrides.revoke),
          },
          isClassTeacher: isClassTeacherProfile(data),
        });
      },
      (error) => {
        console.error("Failed to load the teacher:", error);
        setProfileError("This teacher could not be loaded.");
      }
    );
  }, [teacherUid]);

  const teacherOptions = useMemo(
    () =>
      teachers.map((teacher) => ({
        value: teacher.uid,
        label: [
          `${teacher.firstName} ${teacher.lastName}`.trim() || teacher.email,
          teacher.employeeId ? `(${teacher.employeeId})` : "",
          teacher.status !== "Active" ? `- ${teacher.status}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        keywords: `${teacher.email} ${teacher.designation}`,
      })),
    [teachers]
  );

  const { base, classTeacher } = teacherDefaultPermissions(
    defaults,
    profile?.isClassTeacher ?? false
  );
  const isDefaultOn = (p: Permission) => base.has(p) || classTeacher.has(p);

  const saved = profile?.overrides ?? { grant: [], revoke: [] };
  const current = draft ?? saved;
  const dirty =
    draft !== null &&
    (!sameSet(draft.grant, saved.grant) || !sameSet(draft.revoke, saved.revoke));

  // Same order as resolvePermissions: default + grant - revoke.
  const isOn = (p: Permission) =>
    (isDefaultOn(p) || current.grant.includes(p)) &&
    !current.revoke.includes(p);

  const handleToggle = (p: Permission, on: boolean) => {
    const grant = current.grant.filter((item) => item !== p);
    const revoke = current.revoke.filter((item) => item !== p);
    if (on !== isDefaultOn(p)) (on ? grant : revoke).push(p);
    setDraft({ grant, revoke });
  };

  const tagFor = (p: Permission) => {
    if (current.grant.includes(p) || current.revoke.includes(p)) {
      return TAG_CUSTOM;
    }
    if (classTeacher.has(p) && !base.has(p)) return TAG_CLASS_TEACHER;
    return TAG_DEFAULT;
  };

  const handleSave = async () => {
    if (!teacherUid) return;
    setSaving(true);
    try {
      await saveTeacherOverrides(teacherUid, current);
      setDraft(null);
      toast.success("Permissions of the teacher saved.");
    } catch (error) {
      console.error("Failed to save the teacher's permissions:", error);
      toast.error("Failed to save the permissions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const loadError = defaultsError ?? profileError;
  const customCount = current.grant.length + current.revoke.length;

  return (
    <div className="space-y-4">
      <div className="max-w-xl">
        <Label htmlFor="permission-teacher" className="mb-1 block font-bold">
          Teacher
        </Label>
        <SelectDropdown
          id="permission-teacher"
          searchable
          value={teacherUid}
          onValueChange={setTeacherUid}
          options={teacherOptions}
          placeholder={teachersLoading ? "Loading teachers..." : "Select teacher"}
          searchPlaceholder="Search by name, employee id or email"
          disabled={teachersLoading || teachers.length === 0}
        />
      </div>

      {!teacherUid ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          Select a teacher to change their permissions.
        </div>
      ) : loadError ? (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {loadError} Saving is disabled. Please reload the page.
        </div>
      ) : !profile || defaultsLoading ? (
        <Loader fullScreen={false} size="sm" label="Loading permissions..." />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {profile.isClassTeacher
              ? "This teacher is a class teacher, so the class-teacher extras are included in the defaults."
              : "This teacher is not a class teacher."}{" "}
            Switches marked <b>Custom</b> differ from the All Teachers settings.
          </p>

          <PermissionSwitchList
            isOn={isOn}
            onToggle={handleToggle}
            tagFor={tagFor}
            disabled={saving}
          />

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-white py-3">
            <span className="mr-auto text-xs text-gray-500">
              {customCount === 0
                ? "Same as the All Teachers settings."
                : `${customCount} custom permission(s).`}
            </span>
            <Button
              buttonName="Reset to default"
              variant="outline"
              size="sm"
              buttonStyle={CVES_ON_HOVER}
              disabled={saving || customCount === 0}
              onClick={() => setDraft({ grant: [], revoke: [] })}
            />
            <Button
              buttonName="Discard"
              variant="ghost"
              size="sm"
              disabled={!dirty || saving}
              onClick={() => setDraft(null)}
            />
            <Button
              buttonName={saving ? "Saving..." : "Save"}
              variant="cves"
              size="sm"
              disabled={!dirty || saving}
              onClick={handleSave}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default IndividualTeacherTab;
