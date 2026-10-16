import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTION, PRE_DEFINED_DOC_ID } from "../constants";
import { SavedMap, SavedRange } from "../utils/type";

type RangeLike = Pick<SavedRange, "from" | "to" | "remark">;

export function findRemark(
  ranges: RangeLike[] | undefined,
  percentage: number,
): string {
  if (!ranges?.length || !Number.isFinite(percentage)) return "";
  const p = Math.floor(percentage + 1e-9);
  return ranges.find((range) => p >= range.from && p <= range.to)?.remark ?? "";
}

export function useSuggestedRemarks() {
  const [saved, setSaved] = useState<SavedMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ref = doc(db, COLLECTION.PANEL_SETTINGS, PRE_DEFINED_DOC_ID.SUGGESTED_REMARKS);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setSaved(snapshot.exists() ? ((snapshot.data().remarksByExam as SavedMap) ?? {}) : {});
        setError("");
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Failed to load suggested remarks:", snapshotError);
        setError("Suggested remarks could not be loaded.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  // Keep only valid ranges per exam, so lookups stay cheap and safe
  const rangesByExam = useMemo(() => {
    const map: Record<string, SavedRange[]> = {};
    Object.entries(saved).forEach(([examId, value]) => {
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
  }, [saved]);

  const getRemark = useCallback(
    (examId: string | undefined, percentage: number): string =>
      examId ? findRemark(rangesByExam[examId], percentage) : "",
    [rangesByExam],
  );

  return { getRemark, loading, error };
}