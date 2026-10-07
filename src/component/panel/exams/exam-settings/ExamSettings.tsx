import { useNavigate } from "react-router-dom";
import Button from "../../../../custom-components/Button";
import PageHeader from "../../../../custom-components/PageHeader";

function ExamSettings() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <PageHeader
        title="Exam Settings"
        titleStyle="text-primaryBlue"
        description="Configure exam-wide settings."
        descriptionStyle="text-gray-500"
        buttonDropdown={
          <div className="flex flex-col gap-1">
            <Button
              buttonName="Admit Card Template"
              variant="success"
              size="md"
              buttonStyle="w-full justify-start rounded-md"
              onClick={() => navigate("/welcome/exam-settings/admit-card-template")}
            />

            <Button
              buttonName="Result Template"
              variant="success"
              size="md"
              buttonStyle="w-full justify-start rounded-md bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate("/welcome/exam-settings/result-template")}
            />
          </div>
        }
      />
      <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        Exam Settings UI is not implemented yet.
      </div>
    </div>
  );
}

export default ExamSettings;
