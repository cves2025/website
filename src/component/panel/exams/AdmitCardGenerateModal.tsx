import { useNavigate } from "react-router-dom";
import Modal from "../../../custom-components/Modal";
import { GENERATED_ADMIT_CARDS_PATH } from "./examScheduleShared";
import { useAdmitCardGenerator } from "./useAdmitCardGenerator";
import { SelectExamStep, GenerateAdmitCardStep } from "./AdmitCardSteps";

interface AdmitCardGenerateModalProps {
  onClose: () => void;
}

/**
 * "Generate Admit Card" modal opened from the Admit Card hub header.
 *
 * Step 1 shows the exam picker. As soon as an exam is picked, step 2 (class +
 * students) replaces it. Submitting closes the modal and moves to the
 * generated-admit-cards page, passing the whole selection through the URL so
 * the page (and a refresh) re-builds the same cards.
 */
function AdmitCardGenerateModal({ onClose }: AdmitCardGenerateModalProps) {
  const gen = useAdmitCardGenerator({});
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const ok = await gen.handleGenerate(false);
    if (!ok) return;

    const params = new URLSearchParams();
    if (gen.selectedExamId) params.set("exam", gen.selectedExamId);
    if (gen.selectedYear) params.set("year", gen.selectedYear);
    if (gen.selectedClass) params.set("class", gen.selectedClass);
    if (gen.allStudents) {
      params.set("students", "all");
    } else if (gen.selectedEnrollments.length > 0) {
      params.set("students", gen.selectedEnrollments.join(","));
    }

    navigate(`${GENERATED_ADMIT_CARDS_PATH}?${params.toString()}`);
    onClose();
  };

  const studentCount = gen.allStudents
    ? gen.visibleStudents.length
    : gen.selectedEnrollments.length;

  const canGenerate =
    Boolean(gen.selectedExam) &&
    Boolean(gen.selectedClass) &&
    studentCount > 0;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Generate Admit Card"
      description="Pick the exam, the class and the student(s). The admit cards open on a new page that can be printed and refreshed later."
      cancelText="Cancel"
      onSubmit={() => void handleSubmit()}
      submitText={
        studentCount > 1
          ? `Generate ${studentCount} Admit Cards`
          : "Generate Admit Card"
      }
      submitDisabled={!canGenerate}
      hideSubmit={!gen.selectedExamId}
      submitClassName="bg-amber-600 hover:bg-amber-700"
      modalClassName="max-w-2xl"
    >
      {!gen.selectedExamId ? (
        <SelectExamStep generator={gen} />
      ) : (
        <GenerateAdmitCardStep
          generator={gen}
          showGenerateButton={false}
          onChangeExam={() => gen.handleExamChange("")}
        />
      )}
    </Modal>
  );
}

export default AdmitCardGenerateModal;