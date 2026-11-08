import { useContext, useState } from "react";
import toast from "react-hot-toast";

import Button from "../../../../custom-components/Button";
import {
  CLASS_TEACHER_BONUS,
  ROLE_PERMISSIONS,
  isTeacherBlocked,
  type Permission,
  type TeacherRoleDefaults,
} from "../../../../permissions";
import { saveTeacherRoleDefaults } from "../../../../utils/permissionSettingsService";
import { myContext } from "../../../context/MyContextProvider";
import PermissionMatrix, { Chip, PermissionFooter } from "./PermissionMatrix";
import { useTeacherRoleDefaults } from "./useTeacherRoleDefaults";
import Loader from "../../../../custom-components/Loader";
import { CVES_ON_HOVER } from "../../../../constants";

const BUILT_IN_DEFAULTS: TeacherRoleDefaults = {
  teacher: ROLE_PERMISSIONS.teacher.filter((p) => !isTeacherBlocked(p)),
  classTeacher: CLASS_TEACHER_BONUS.filter((p) => !isTeacherBlocked(p)),
};

const sameSet = (a: readonly Permission[], b: readonly Permission[]) =>
  a.length === b.length && a.every((p) => b.includes(p));

const toggled = (list: Permission[], permission: Permission, on: boolean) =>
  on
    ? [...new Set([...list, permission])]
    : list.filter((p) => p !== permission);

/**
 * "All Teachers" tab: one table with what every teacher gets and what class
 * teachers get on top (a permission already ON for all teachers shows
 * "Included" there). Changes stay a draft until "Save" and apply to every
 * teacher at once (a teacher's own changes on the other tab still win).
 */
function TeacherDefaultsTab() {
  const { user } = useContext(myContext);
  const { defaults, loading, error } = useTeacherRoleDefaults();
  const saved = defaults ?? BUILT_IN_DEFAULTS;

  // null = no unsaved edits, so live updates show straight away.
  const [draft, setDraft] = useState<TeacherRoleDefaults | null>(null);
  const [saving, setSaving] = useState(false);
  const current = draft ?? saved;

  const dirty =
    draft !== null &&
    (!sameSet(draft.teacher, saved.teacher) ||
      !sameSet(draft.classTeacher, saved.classTeacher));

  const update = (change: Partial<TeacherRoleDefaults>) =>
    setDraft({ ...current, ...change });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveTeacherRoleDefaults(current, user.uid);
      setDraft(null);
      toast.success("Teacher permissions saved.");
    } catch (saveError) {
      console.error("Failed to save teacher permissions:", saveError);
      toast.error("Failed to save the permissions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader fullScreen={false} size="sm" label="Loading permissions..." />;
  }

  if (error) {
    return (
      <div
        className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        role="alert"
      >
        {error} Saving is disabled so the real settings are never overwritten.
        Please reload the page.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PermissionMatrix
        disabled={saving}
        columns={[
          {
            key: "all",
            title: "All teachers",
            subtitle: "Every teacher",
            countOn: true,
            isOn: (p) => current.teacher.includes(p),
            onToggle: (p, on) => update({ teacher: toggled(current.teacher, p, on) }),
          },
          {
            key: "class",
            title: "Class teachers",
            subtitle: "Extra, on top of All teachers",
            countOn: true,
            isOn: (p) => current.teacher.includes(p) || current.classTeacher.includes(p),
            onToggle: (p, on) => update({ classTeacher: toggled(current.classTeacher, p, on) }),
            // Already ON for every teacher: nothing extra to switch.
            replace: (p) => (current.teacher.includes(p) ? <Chip>Included</Chip> : null),
          },
        ]}
      />

      <PermissionFooter
        note={
          dirty ? (
            <Chip className="bg-amber-100 text-amber-800">Unsaved changes</Chip>
          ) : !defaults ? (
            "Using the built-in defaults."
          ) : (
            "Teachers only see the classes and sections assigned to them."
          )
        }
      >
        <Button
          buttonName="Restore built-in defaults"
          variant="outline"
          size="sm"
          buttonStyle={CVES_ON_HOVER}
          disabled={saving}
          onClick={() => setDraft(BUILT_IN_DEFAULTS)}
        />
        <Button
          buttonName="Discard"
          variant="outline"
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
      </PermissionFooter>
    </div>
  );
}

export default TeacherDefaultsTab;
