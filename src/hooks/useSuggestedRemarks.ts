import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTION, PRE_DEFINED_DOC_ID } from "../constants";
import type {
  SavedDistributionMap,
  SavedMap,
  SavedRange,
  SuggestedRemarksDoc,
} from "../utils/type";

type RangeLike = Pick<SavedRange, "from" | "to" | "remark">;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function findRemark(
  ranges: RangeLike[] | undefined,
  percentage: number,
): string {
  if (!ranges?.length || !Number.isFinite(percentage)) return "";
  const p = Math.floor(percentage + 1e-9);
  return ranges.find((range) => p >= range.from && p <= range.to)?.remark ?? "";
}

/** "2026-10-16" -> "16.10.2026" (the format the result card already uses for dates). */
export function formatDistributionDate(isoDate: string | undefined): string {
  if (!isoDate || !ISO_DATE_PATTERN.test(isoDate)) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

export function useSuggestedRemarks() {
  const [savedRemarks, setSavedRemarks] = useState<SavedMap>({});
  const [savedDates, setSavedDates] = useState<SavedDistributionMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ref = doc(db, COLLECTION.PANEL_SETTINGS, PRE_DEFINED_DOC_ID.SUGGESTED_REMARKS);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.exists() ? (snapshot.data() as SuggestedRemarksDoc) : {};
        setSavedRemarks(data.remarksByExam ?? {});
        setSavedDates(data.dateByExam ?? {});
        setError("");
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Failed to load result card settings:", snapshotError);
        setError("Result card settings could not be loaded.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  // Keep only valid ranges per exam, so lookups stay cheap and safe
  const rangesByExam = useMemo(() => {
    const map: Record<string, SavedRange[]> = {};
    Object.entries(savedRemarks).forEach(([examId, value]) => {
      const valid = (value?.ranges ?? []).filter(
        (range) =>
          typeof range.from === "number" &&
          typeof range.to === "number" &&
          typeof range.remark === "string" &&
          range.remark.trim() !== "",
      );
      if (valid.length) map[examId] = valid;
    });
    return map;
  }, [savedRemarks]);

  const getRemark = useCallback(
    (examId: string | undefined, percentage: number): string =>
      examId ? findRemark(rangesByExam[examId], percentage) : "",
    [rangesByExam],
  );

  /** Returns the display date ("DD.MM.YYYY") of an exam, or "" when not set. */
  const getDistributionDate = useCallback(
    (examId: string | undefined): string =>
      examId ? formatDistributionDate(savedDates[examId]?.date) : "",
    [savedDates],
  );

  return {
    savedRemarks,
    savedDates,
    getRemark,
    getDistributionDate,
    loading,
    error,
  };
}