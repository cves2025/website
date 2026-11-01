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
import PermissionSwitchList from "./PermissionSwitchList";
import { useTeacherRoleDefaults } from "./useTeacherRoleDefaults";

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
 * "All Teachers" tab: what every teacher gets, and what class teachers get on
 * top. Changes stay a draft until "Save" and apply to every teacher at once
 * (a teacher's own changes on the other tab still win).
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
    return <p className="py-4 text-sm text-gray-500">Loading permissions...</p>;
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
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">All teachers</h2>
          <p className="text-sm text-gray-500">
            What every teacher can use. Teachers only see the classes and
            sections assigned to them.
          </p>
        </div>
        <PermissionSwitchList
          isOn={(p) => current.teacher.includes(p)}
          onToggle={(p, on) =>
            update({ teacher: toggled(current.teacher, p, on) })
          }
          disabled={saving}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">
            Class teachers get extra
          </h2>
          <p className="text-sm text-gray-500">
            Given on top of the list above, only to teachers who are the class
            teacher of a section.
          </p>
        </div>
        <PermissionSwitchList
          isOn={(p) =>
            current.teacher.includes(p) || current.classTeacher.includes(p)
          }
          onToggle={(p, on) =>
            update({ classTeacher: toggled(current.classTeacher, p, on) })
          }
          lockedReason={(p) =>
            current.teacher.includes(p) ? "Already ON for all teachers." : null
          }
          disabled={saving}
        />
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-white py-3">
        {!defaults && !dirty && (
          <span className="mr-auto text-xs text-gray-500">
            Using the built-in defaults.
          </span>
        )}
        <Button
          buttonName="Restore built-in defaults"
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => setDraft(BUILT_IN_DEFAULTS)}
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
          variant="success"
          size="sm"
          disabled={!dirty || saving}
          onClick={handleSave}
        />
      </div>
    </div>
  );
}

export default TeacherDefaultsTab;
