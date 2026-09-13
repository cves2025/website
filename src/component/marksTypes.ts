// Shared types for the marksheet/result components.
// Shapes mirror the JSON returned by the backend `/api/result` endpoint
// and the per-class renderers that consume it.

export interface StudentProfileRow {
  enrollment_no?: string;
  class?: string;
  name?: string;
  section?: string;
  fatherName?: string;
  issueDate?: string;
  classTeacher?: string;
}

export interface MarksRow {
  subject?: string;
  unit_I?: string | number;
  halfYearly?: string | number;
  term_I?: string | number;
  unit_II?: string | number;
  annual?: string | number;
  term_II?: string | number;
  term_I_II?: string | number;
  examType?: string;
}

export interface SubjectMark {
  name?: string;
  marks?: {
    written?: number;
    oral?: number;
    grade?: string;
  };
}

export interface UnitTest1MarksRow {
  subjects?: SubjectMark[];
}

/** Shape of `data.studentData` returned by the result API. */
export interface StudentResultData {
  class: string;
  filteredStudent?: StudentProfileRow[];
  filteredMarks?: MarksRow[];
  unitTest1Marks?: UnitTest1MarksRow[];
  enrollment?: string;
  name?: string;
  section?: string;
  fatherName?: string;
}