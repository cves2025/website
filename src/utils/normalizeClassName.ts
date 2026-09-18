import { CLASSES } from "../constants";

/**
 * Spreadsheets rarely use the exact class spellings stored by the panel
 * ("5", "Nursery", "LKG" ...). This helper maps the common variants
 * ("5th", "Class 5", "grade-5", "05", "V", "NUR", "L.K.G") onto the matching
 * `CLASSES` entry so bulk uploaded students land in the same class bucket as
 * the manually added ones.
 *
 * Returns "" when the value cannot be recognised, so callers can decide
 * whether to keep the original text or reject the row.
 */

/** Roman numerals used by schools for classes 1 to 8. */
const ROMAN_NUMERALS: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
};

/** Word based class names, most specific first. */
const CLASS_KEYWORDS: { key: string; value: string }[] = [
  { key: "play group", value: "PG" },
  { key: "playgroup", value: "PG" },
  { key: "play way", value: "PG" },
  { key: "pre nursery", value: "Nursery" },
  { key: "nursery", value: "Nursery" },
  { key: "nur", value: "Nursery" },
  { key: "lkg", value: "LKG" },
  { key: "ukg", value: "UKG" },
  { key: "pg", value: "PG" },
];

/** Removes a leading "class" / "grade" / "std" word ("Class 5" -> "5"). */
function stripClassPrefix(value: string): string {
  return value.replace(/^(class|cls|grade|std|standard)\s*/, "").trim();
}

export function normalizeClassName(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // 1. Already one of the stored class names (case-insensitive).
  const exact = CLASSES.find(
    (className) => className.toLowerCase() === raw.toLowerCase()
  );
  if (exact) return exact;

  const compact = raw.toLowerCase().replace(/[\s._-]+/g, " ").trim();
  const withoutPrefix = stripClassPrefix(compact);
  /** "l k g" / "play group" -> "lkg" / "playgroup" for the word checks. */
  const squashed = compact.replace(/\s+/g, "");

  // 2. Any value that carries a class number: "5th", "Class 5", "grade-5", "05".
  const digits = withoutPrefix.match(/\d+/);
  if (digits) {
    const numeric = CLASSES.find(
      (className) => className === String(Number(digits[0]))
    );
    if (numeric) return numeric;
  }

  // 3. Roman numerals: "V", "class viii".
  const letters = withoutPrefix.replace(/[^a-z]/g, "");
  if (letters && ROMAN_NUMERALS[letters]) return ROMAN_NUMERALS[letters];

  // 4. Pre-primary / kindergarten names: "NUR", "Nursery", "L.K.G", "UKG".
  const keyword = CLASS_KEYWORDS.find(
    (item) => squashed === item.key || squashed.includes(item.key)
  );
  if (keyword) return keyword.value;

  return "";
}

/** True when both values point at the same class of the `CLASSES` list. */
export function isSameClassName(a: unknown, b: unknown): boolean {
  const left = normalizeClassName(a) || String(a ?? "").trim().toLowerCase();
  const right = normalizeClassName(b) || String(b ?? "").trim().toLowerCase();
  return left !== "" && left === right;
}