import type { StudentDocumentSummary, StudentDocumentType, StudentDocumentVersion } from "../utils/type";
import {
  EMPTY_SUMMARY,
  loadDocumentSummaries,
  loadDocumentTypes,
  loadStudentDocuments,
} from "../utils/studentDocumentsService";
import useAsyncData from "./useAsyncData";

/** The school's document types (Settings > Student documents), in order. */
export function useDocumentTypes(enabled = true) {
  const { data, setData, loading, error, reload } = useAsyncData<StudentDocumentType[]>(loadDocumentTypes, [], {
    initial: [],
    enabled,
    errorMessage: "The document types could not be loaded.",
  });
  return { types: data, setTypes: setData, loading, error, reload };
}

/** One student's summary and versions (the Documents modal / Student View). */
export function useStudentDocuments(studentId: string) {
  const { data, loading, error, reload } = useAsyncData<{
    summary: StudentDocumentSummary;
    versions: StudentDocumentVersion[];
  }>(() => loadStudentDocuments(studentId), [studentId], {
    initial: { summary: EMPTY_SUMMARY, versions: [] },
    enabled: Boolean(studentId),
    errorMessage: "The documents could not be loaded.",
  });
  return { ...data, loading, error, reload };
}

/** Summaries of the students on the Student List page (30 per query). */
export function useDocumentSummaries(studentIds: string[], enabled = true) {
  const key = [...studentIds].sort().join(",");
  const { data, loading, reload } = useAsyncData<Record<string, StudentDocumentSummary>>(
    () => loadDocumentSummaries(studentIds),
    [key],
    { initial: {}, enabled: enabled && studentIds.length > 0, errorMessage: "Document counts could not be loaded." }
  );
  return { summaries: data, loading, reload };
}
