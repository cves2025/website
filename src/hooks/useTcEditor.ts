import { loadTcSettings, buildTcPrefill, loadStudentTcs, loadTc, loadTcStudent } from "../utils/tcService";
import { currentTc } from "../utils/transferCertificate";
import type { TcFields, TcSettings, TcStudent, TransferCertificate } from "../utils/type";
import useAsyncData from "./useAsyncData";

export interface TcEditorData {
  student: TcStudent | null;
  /** The saved TC (draft / issued / cancelled); null = a new one. */
  tc: TransferCertificate | null;
  /** The saved fields, or a new TC filled from the records. */
  fields: TcFields | null;
  settings: TcSettings | null;
}

const EMPTY: TcEditorData = { student: null, tc: null, fields: null, settings: null };

/**
 * Everything the TC editor opens with. `tcId` opens that TC; otherwise the
 * student's draft / issued TC of the session, else a new one from the records.
 */
export function useTcEditor(enrollmentId: string, tcId: string) {
  const { data, setData, loading, error } = useAsyncData<TcEditorData>(
    async () => {
      const [settings, saved] = await Promise.all([loadTcSettings(), tcId ? loadTc(tcId) : null]);
      const student = await loadTcStudent(saved?.enrollmentId || enrollmentId);
      if (!student) {
        if (!saved) return EMPTY;
        // The enrollment is gone (wrong entry removed): the TC still opens.
        return {
          settings,
          tc: saved,
          fields: saved.fields,
          student: {
            enrollmentId: saved.enrollmentId,
            studentId: saved.studentId,
            session: saved.session,
            className: saved.className,
            section: saved.section,
            studentName: saved.fields.studentName,
            admissionNo: saved.fields.scholarNo,
            fatherName: saved.fields.fatherName,
          },
        };
      }
      let tc = saved;
      if (!tc) {
        const existing = currentTc(await loadStudentTcs(student.studentId, student.session));
        tc = existing && existing.status !== "cancelled" ? existing : null;
      }
      const fields = tc ? tc.fields : await buildTcPrefill(student, settings);
      return { student, tc, fields, settings };
    },
    [enrollmentId, tcId],
    {
      initial: EMPTY,
      enabled: Boolean(enrollmentId || tcId),
      errorMessage: "The transfer certificate could not be loaded.",
    }
  );
  return { data, setData, loading, error };
}

export default useTcEditor;
