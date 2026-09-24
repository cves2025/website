import PageHeader from "../../../custom-components/PageHeader";
import AllClassLists from "./AllClassLists";

/**
 * Settings page of the CVES panel.
 *
 * Reached from the account menu (mini sidebar) at the bottom of the sidebar.
 * Currently it hosts the "All Class Lists" section - the number of students of
 * every class with the delete / recycle-bin action for each class.
 */
function Settings() {
  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Settings"
        titleStyle="text-primaryBlue"
        description="School-wide settings. Manage class data such as the students enrolled in each class."
        descriptionStyle="text-gray-500"
      />

      <AllClassLists />
    </div>
  );
}

export default Settings;

