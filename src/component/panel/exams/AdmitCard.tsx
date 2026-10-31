import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EXAM_SCHEDULE_PATH,
} from "./examScheduleShared";
import PageHeader from "../../../custom-components/PageHeader";
import Button from "../../../custom-components/Button";
import AdmitCardGenerateModal from "./AdmitCardGenerateModal";

function AdmitCard() {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Admit Card"
        titleStyle="text-primaryBlue"
        description="Prepare the exam schedule (subject, date, time and applicable classes) and then generate the admit card of any student."
        descriptionStyle="text-gray-500"
        button={
          <div className="flex gap-4">
          <Button
            buttonName="+ Admit Card"
            variant="success"
            size="md"
            buttonStyle="rounded-full"
            onClick={() => setModalOpen(true)}
          />
          <Button
            buttonName="+ Exam Schedule"
            variant="success"
            size="md"
            buttonStyle="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate(EXAM_SCHEDULE_PATH)}
          />
          </div>
        }
      />

      {modalOpen && (
        <AdmitCardGenerateModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

export default AdmitCard;
