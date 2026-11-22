/** Student List > Documents: the student's documents panel in the app's Modal. */
import Modal from "../../../../custom-components/Modal";
import StudentDocumentsPanel from "./StudentDocumentsPanel";

interface StudentDocumentsModalProps {
  student: { studentId: string; studentName: string; className: string; section: string } | null;
  onClose: () => void;
}

function StudentDocumentsModal({ student, onClose }: StudentDocumentsModalProps) {
  return (
    <Modal
      isOpen={student !== null}
      onClose={onClose}
      title={student ? `Documents · ${student.studentName}` : "Documents"}
      description={student ? `${student.className} ${student.section}`.trim() : undefined}
      cancelText="Close"
      onSubmit={onClose}
      hideSubmit
      modalClassName="max-w-3xl"
    >
      {/* The Modal scrolls by itself: no scroll box of its own here. */}
      {student && <StudentDocumentsPanel studentId={student.studentId} />}
    </Modal>
  );
}

export default StudentDocumentsModal;
