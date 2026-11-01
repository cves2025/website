import { useEffect, useState } from "react";
import type { TeacherRoleDefaults } from "../../../../permissions";
import { subscribeTeacherRoleDefaults } from "../../../../utils/permissionSettingsService";

export interface TeacherRoleDefaultsState {
  /** `null` = never saved (the built-in defaults apply). */
  defaults: TeacherRoleDefaults | null;
  loading: boolean;
  /** Set when the document could not be read; saving must stay disabled. */
  error: string | null;
}

/** Live school-wide teacher defaults for the Permissions page. */
export function useTeacherRoleDefaults(): TeacherRoleDefaultsState {
  const [state, setState] = useState<TeacherRoleDefaultsState>({
    defaults: null,
    loading: true,
    error: null,
  });

  useEffect(
    () =>
      subscribeTeacherRoleDefaults(
        (defaults) => setState({ defaults, loading: false, error: null }),
        () =>
          setState({
            defaults: null,
            loading: false,
            error: "The permission settings could not be loaded.",
          })
      ),
    []
  );

  return state;
}
