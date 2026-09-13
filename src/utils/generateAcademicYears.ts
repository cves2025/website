/**
 * Generates academic-year labels starting from `startYear` (default 2023)
 * up to the CURRENT academic session, newest first, e.g.
 * ["2026-27", "2025-26", "2024-25", "2023-24"].
 *
 * An academic session runs April -> March (Indian school calendar), so
 * between 1 Jan and 31 Mar the "current" session is still the one that
 * started in the previous calendar year (e.g. in Jan 2026 -> 2025-26).
 */
export function generateAcademicYears(
  startYear: number = 2023
): { value: string; label: string }[] {
  const today = new Date();
  const currentSessionStart =
    today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;

  const years: { value: string; label: string }[] = [];
  for (let year = startYear; year <= currentSessionStart; year++) {
    // "2023-24" style label (4-digit start, 2-digit end).
    const label = `${year}-${String(year + 1).slice(-2)}`;
    years.push({ value: label, label });
  }

  // Newest session first so the current academic year is the first option.
  return years.reverse();
}
