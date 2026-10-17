import PageHeader from "../../../custom-components/PageHeader";
import AllClassLists from "./AllClassLists";
import ExamRulesSection from "./ExamRulesSection";

function Settings() {
  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Settings"
        titleStyle="text-primaryBlue"
        description="School-wide settings. Manage class data such as the students enrolled in each class, or the exam rules used by marks and the cross list."
        descriptionStyle="text-gray-500"
      />

      <AllClassLists />

      <ExamRulesSection />
    </div>
  );
}

export default Settings;

