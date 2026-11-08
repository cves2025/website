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
      {/* The app's page header; the two tabs sit on its right. */}
      <PageHeader
        title="Permissions"
        titleStyle="text-primaryBlue"
        description="Choose what teachers can use. A teacher's own settings win over the All Teachers settings."
        descriptionStyle="text-gray-500"
        button={
          <div className="flex gap-1 rounded-xl bg-[#e7eaf2] p-1" role="tablist" aria-label="Whose permissions">
            {TABS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={tab === option.value}
                onClick={() => setTab(option.value)}
                className={`min-h-10 rounded-[9px] px-4 text-sm font-semibold transition-colors ${
                  tab === option.value
                    ? "bg-white text-[#1d4fd8] shadow-sm"
                    : "text-[#3b465c] hover:bg-white/60"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      {tab === "all" ? <TeacherDefaultsTab /> : <IndividualTeacherTab />}
    </div>
  );
}

export default Permissions;
