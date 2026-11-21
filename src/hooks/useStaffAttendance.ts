import { useMemo } from "react";

import {
  DEFAULT_STAFF_ATTENDANCE_SETTINGS,
  loadStaffDay,
  loadStaffDevices,
  loadStaffLog,
  loadStaffSelfie,
  loadStaffSettings,
} from "../utils/staffAttendanceService";
import type { StaffPerson } from "../utils/type";
import { useAsyncData } from "./useAsyncData";
import { useTeachers } from "./useTeachers";

/** Staff attendance settings (defaults until saved). */
export function useStaffAttendanceSettings() {
  const { data, setData, loading, error, reload } = useAsyncData(loadStaffSettings, [], {
    initial: DEFAULT_STAFF_ATTENDANCE_SETTINGS,
    errorMessage: "Staff attendance settings could not be loaded.",
  });
  return { settings: data, setSettings: setData, loading, error, reload };
}

/** The records, log and linked phones for one date. */
export function useStaffDay(date: string) {
  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [records, log, devices] = await Promise.all([loadStaffDay(date), loadStaffLog(date), loadStaffDevices()]);
      return { records, log, devices };
    },
    [date],
    {
      initial: { records: {}, log: [], devices: {} },
      enabled: Boolean(date),
      errorMessage: "Staff attendance could not be loaded.",
    }
  );
  return { ...data, loading, error, reload };
}

/** Teachers, and non-teaching staff when the setting allows them, by name. */
export function useStaffPeople(includeStaff: boolean) {
  const teachers = useTeachers("teacher");
  const staff = useTeachers(includeStaff ? "staff" : "");
  const people = useMemo<StaffPerson[]>(() => {
    const list = [...teachers.teachers, ...(includeStaff ? staff.teachers : [])]
      .filter((item) => !item.isDeleted && (item.status || "Active") === "Active")
      .map(
        (item): StaffPerson => ({
          uid: item.uid || item.id,
          name: `${item.firstName} ${item.lastName}`.trim(),
          personType: item.role === "staff" ? "staff" : "teacher",
          jobRole: item.jobRole,
          employeeId: item.employeeId,
          photo: item.photo,
        })
      );
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers.teachers, staff.teachers, includeStaff]);
  return {
    people,
    loading: teachers.loading || (includeStaff && staff.loading),
    error: teachers.error || (includeStaff ? staff.error : null),
  };
}

/** A check-in / out selfie (data URL, "" = none); loads only when `enabled`. */
export function useStaffSelfie(recordId: string, action: "in" | "out", enabled: boolean) {
  const { data, loading, error } = useAsyncData(() => loadStaffSelfie(recordId, action), [recordId, action], {
    initial: "",
    enabled: enabled && Boolean(recordId),
    errorMessage: "The selfie could not be loaded.",
  });
  return { image: data, loading, error };
}
