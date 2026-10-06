import PageHeader from "../../../custom-components/PageHeader";

/**
 * Exam Settings (admin only - gated by the examSettings.access permission via
 * the /welcome/exam-settings route rule and RequireRoutePermission).
 *
 * NOTE: UI deliberately not implemented yet - this is only the page scaffold.
 * TODO: add the exam-wide configuration (result dates, etc.).
 */
function ExamSettings() {
  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <PageHeader
        title="Exam Settings"
        titleStyle="text-primaryBlue"
        description="Configure exam-wide settings."
        descriptionStyle="text-gray-500"
      />
      <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        Exam Settings UI is not implemented yet.
      </div>
    </div>
  );
}

export default ExamSettings;