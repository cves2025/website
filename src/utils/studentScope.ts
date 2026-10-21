/**
 * Which (class, section) pairs a user may see in the Student List, and the
 * smallest set of Firestore queries that covers what is shown on screen.
 * Pure logic: no Firestore and no React.
 */
import { CLASSES, SECTIONS } from "../constants";
import { scopedClasses, scopedSections, type AccessScope } from "../permissions";

export interface ClassSectionPair {
  className: string;
  section: string;
}

/** What one enrollments query filters on besides the academic year ("" = no filter). */
export interface EnrollmentQuerySpec {
  className: string;
  section: string;
}

/** Every class + section the scope may see. null = unrestricted (admin). */
export function allowedClassSections(
  scope: AccessScope
): ClassSectionPair[] | null {
  if (scope.kind === "all") return null;
  const pairs: ClassSectionPair[] = [];
  scopedClasses(scope, CLASSES).forEach((className) => {
    scopedSections(scope, className, SECTIONS).forEach((section) => {
      pairs.push({ className, section });
    });
  });
  return pairs;
}

export const pairKey = (className: string, section: string): string =>
  `${className}|${section}`;

/**
 * The queries needed for the filters chosen on screen.
 * - Admin: the chosen class / section is the query.
 * - Teacher: only the allowed pairs that match the chosen filters; when every
 *   section of a class is allowed and no section is chosen, one class query.
 */
export function buildQuerySpecs(
  pairs: ClassSectionPair[] | null,
  selectedClass: string,
  selectedSection: string
): EnrollmentQuerySpec[] {
  if (pairs === null) {
    return [{ className: selectedClass, section: selectedSection }];
  }

  const wanted = pairs.filter(
    (pair) =>
      (!selectedClass || pair.className === selectedClass) &&
      (!selectedSection || pair.section === selectedSection)
  );

  const sectionsByClass = new Map<string, string[]>();
  wanted.forEach((pair) => {
    const list = sectionsByClass.get(pair.className) ?? [];
    list.push(pair.section);
    sectionsByClass.set(pair.className, list);
  });

  const specs: EnrollmentQuerySpec[] = [];
  sectionsByClass.forEach((sections, className) => {
    if (!selectedSection && sections.length === SECTIONS.length) {
      specs.push({ className, section: "" });
    } else {
      sections.forEach((section) => specs.push({ className, section }));
    }
  });
  return specs;
}

export const specKey = (year: string, spec: EnrollmentQuerySpec): string =>
  `${year}|${spec.className}|${spec.section}`;

/**
 * Rows already loaded that contain everything `spec` asks for, or null when a
 * Firestore read is needed. A wider query (whole year / whole class / one
 * section) answers a narrower one, so changing the filters costs no reads.
 */
export function rowsFromCache<T extends { className: string; section: string }>(
  cache: ReadonlyMap<string, T[]>,
  year: string,
  spec: EnrollmentQuerySpec
): T[] | null {
  const candidates: EnrollmentQuerySpec[] = [spec];
  if (spec.section) {
    candidates.push({ className: spec.className, section: "" });
  }
  if (spec.className) {
    candidates.push({ className: "", section: spec.section });
  }
  if (spec.className || spec.section) {
    candidates.push({ className: "", section: "" });
  }

  for (const candidate of candidates) {
    const cached = cache.get(specKey(year, candidate));
    if (!cached) continue;
    return cached.filter(
      (row) =>
        (!spec.className || row.className === spec.className) &&
        (!spec.section || row.section === spec.section)
    );
  }
  return null;
}