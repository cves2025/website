/**
 * Generates academic-year labels starting from `startYear` (default 2026,
 * the first session managed in this app) up to the CURRENT academic session,
 * newest first, e.g. ["2027-28", "2026-27"]. Older sessions are not offered.
 *
 * An academic session runs April -> March (Indian school calendar), so
 * between 1 Jan and 31 Mar the "current" session is still the one that
 * started in the previous calendar year (e.g. in Jan 2026 -> 2025-26).
 */
export function generateAcademicYears(
  startYear: number = 2026
): { value: string; label: string }[] {
  const today = new Date();
  const currentSessionStart =
    today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;

  const years: { value: string; label: string }[] = [];
  for (let year = startYear; year <= currentSessionStart; year++) {
    // "2026-27" style label (4-digit start, 2-digit end).
    const label = `${year}-${String(year + 1).slice(-2)}`;
    years.push({ value: label, label });
  }

  // Newest session first so the current academic year is the first option.
  return years.reverse();
}

/**
 * The session that follows `academicYear`, e.g. "2026-27" -> "2027-28".
 * Used by the promotion page, which must offer the next session before it has
 * started (promotions are usually done in March). Returns "" for bad input.
 */
export function nextAcademicYear(academicYear: string): string {
  const start = Number.parseInt(academicYear.slice(0, 4), 10);
  if (!Number.isFinite(start)) return "";
  return `${start + 1}-${String(start + 2).slice(-2)}`;
}

/** The session before `academicYear`, e.g. "2026-27" -> "2025-26". "" for bad input. */
export function previousAcademicYear(academicYear: string): string {
  const start = Number.parseInt(academicYear.slice(0, 4), 10);
  if (!Number.isFinite(start)) return "";
  return `${start - 1}-${String(start).slice(-2)}`;
}
