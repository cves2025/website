import PageHeader from "../../../custom-components/PageHeader";
import AllClassLists from "./AllClassLists";
import ExamRulesSection from "./ExamRulesSection";

/**
 * Settings page of the CVES panel.
 *
 * Reached from the account menu (mini sidebar) at the bottom of the sidebar.
 * Hosts the "All Class Lists" section - the number of students of every class
 * with the delete / recycle-bin action for each class - and the "Exam" section
 * with the school-wide rank scope / pass rule settings.
 */
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

