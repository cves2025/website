import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_STAFF_ATTENDANCE_SETTINGS,
  loadStaffDay,
  loadStaffDevices,
  loadStaffLeaves,
  loadStaffLog,
  loadStaffMonth,
  loadStaffSelfie,
  loadStaffSettings,
  loadOfficeQr,
  type OfficeQr,
} from "../utils/staffAttendanceService";
import type { StaffLeave, StaffPerson } from "../utils/type";
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

/** Every leave of a session (admin). */
export function useStaffLeaves(session: string) {
  const { data, loading, error, reload } = useAsyncData(() => loadStaffLeaves(session), [session], {
    initial: [] as StaffLeave[],
    enabled: Boolean(session),
    errorMessage: "Leave requests could not be loaded.",
  });
  return { leaves: data, loading, error, reload };
}

/** Every record of a month ("yyyy-MM"), by uid and date (admin). */
export function useStaffMonth(month: string) {
  const { data, loading, error, reload } = useAsyncData(() => loadStaffMonth(month), [month], {
    initial: {} as Awaited<ReturnType<typeof loadStaffMonth>>,
    enabled: Boolean(month),
    errorMessage: "The month's attendance could not be loaded.",
  });
  return { records: data, loading, error, reload };
}

/**
 * The office QR, refreshed just after it changes (every 20 s); a failed
 * load is tried again after a few seconds. `secondsLeft` ticks for the bar.
 */
export function useOfficeQr(enabled: boolean) {
  const [qr, setQr] = useState<OfficeQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const load = () => {
      loadOfficeQr()
        .then((next) => {
          if (stopped) return;
          setQr(next);
          setError(null);
          timer = setTimeout(load, Math.max(next.expiresAt - Date.now(), 0) + 300);
        })
        .catch((cause: unknown) => {
          if (stopped) return;
          setError(cause instanceof Error ? cause.message : "The QR could not be loaded.");
          timer = setTimeout(load, 5000);
        });
    };
    load();
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [enabled]);

  const secondsLeft = qr ? Math.max(Math.ceil((qr.expiresAt - now) / 1000), 0) : 0;
  return { qr, error, secondsLeft };
}
