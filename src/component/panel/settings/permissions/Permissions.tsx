import { useState } from "react";

import PageHeader from "../../../../custom-components/PageHeader";
import IndividualTeacherTab from "./IndividualTeacherTab";
import TeacherDefaultsTab from "./TeacherDefaultsTab";

type PermissionsTab = "all" | "teacher";

const TABS: { value: PermissionsTab; label: string }[] = [
  { value: "all", label: "All Teachers" },
  { value: "teacher", label: "Individual Teacher" },
];

/**
 * Admin page to switch teacher permissions ON / OFF - for all teachers at
 * once, or for one teacher. Saved changes reach the teachers' open app
 * immediately. Admin-only features (adding teachers / students, promotion,
 * exams, exam settings, settings) are never offered here.
 */
function Permissions() {
  const [tab, setTab] = useState<PermissionsTab>("all");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Permissions"
        titleStyle="text-primaryBlue"
        description="Choose what teachers can use. A teacher's own settings win over the All Teachers settings."
        descriptionStyle="text-gray-500"
      />

      <div className="inline-flex self-start rounded-lg border border-gray-200 bg-white p-1">
        {TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
              tab === option.value
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {tab === "all" ? <TeacherDefaultsTab /> : <IndividualTeacherTab />}
      </div>
    </div>
  );
}

export default Permissions;
