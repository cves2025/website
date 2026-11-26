/**
 * UDISE+ (testing): the answers our students need on the UDISE+ SDMS portal
 * (General / Enrolment / Facility Profile). A separate module: it reads the
 * students and keeps its own answers and settings. See docs/features/udise.md.
 */
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { FlaskConical, Pencil } from "lucide-react";

import { ADMISSION_SECTIONS, CLASS_OPTIONS, CVES_ON_HOVER, TABLE_HEAD_CLASS } from "../../../constants";
import CustomSelect from "../../../custom-components/CustomSelect";
import Loader from "../../../custom-components/Loader";
import PageHeader from "../../../custom-components/PageHeader";
import { useUdiseSection, useUdiseSettings } from "../../../hooks/useUdise";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { udiseAnswers, udiseMissing } from "../../../utils/udiseRecord";
import type { UdiseStudentRow, UdiseValues } from "../../../utils/type";
import UdiseSettingsTab from "./UdiseSettingsTab";
import UdiseStudentEditor from "./UdiseStudentEditor";

const sessions = generateAcademicYears();
const CLASS_FILTER = CLASS_OPTIONS.map((option) => ({ ...option, label: toOrdinalLabel(option.label) }));
const SECTION_OPTIONS = ADMISSION_SECTIONS.map((section) => ({ value: section, label: section }));
const TABS = [
  { value: "students", label: "Students" },
  { value: "settings", label: "UDISE Settings" },
] as const;

interface Filters {
  session: string;
  className: string;
  section: string;
}

function UdisePage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "settings" ? "settings" : "students";
  const { settings, setSettings, loading: settingsLoading, error: settingsError } = useUdiseSettings();

  const filters = useForm<Filters>({
    defaultValues: { session: sessions[0]?.value ?? "", className: "", section: ADMISSION_SECTIONS[0] },
  });
  const [session, className, section] = useWatch({ control: filters.control, name: ["session", "className", "section"] });
  const { rows, setRows, loading, error } = useUdiseSection(
    session,
    className,
    section,
    settings.classCodes,
    !settingsLoading && tab === "students"
  );
  const [editing, setEditing] = useState<UdiseStudentRow | null>(null);

  // How many portal fields each student still lacks.
  const missing = useMemo(
    () => new Map(rows.map((row) => [row.studentId, udiseMissing(udiseAnswers(row.records, row.saved, settings))])),
    [rows, settings]
  );
  const ready = rows.filter((row) => (missing.get(row.studentId)?.length ?? 0) === 0).length;

  const onSaved = (studentId: string, saved: UdiseValues) => {
    setRows((current) => current.map((row) => (row.studentId === studentId ? { ...row, saved } : row)));
    setEditing((current) => (current && current.studentId === studentId ? { ...current, saved } : current));
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="UDISE+"
        titleStyle="text-primaryBlue"
        description="Answers for the UDISE+ SDMS portal (GP, EP, FP), from our records and the UDISE settings. Our student records are only read."
        button={
          <span className="flex items-center gap-1.5 rounded-full bg-[#f7e8ee] px-3 py-1 text-xs font-bold text-[#ad1a6f]">
            <FlaskConical className="h-3.5 w-3.5" />
            Testing
          </span>
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="UDISE+">
        {TABS.map((option) => {
          const active = option.value === tab;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ tab: option.value }, { replace: true })}
              className={`rounded-md border px-4 py-2 text-sm font-bold transition ${
                active ? "border-transparent bg-cves text-white shadow-sm" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {settingsError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{settingsError}</div>}

      {settingsLoading ? (
        <Loader label="Loading UDISE settings..." fullScreen={false} />
      ) : tab === "settings" ? (
        <UdiseSettingsTab settings={settings} onSaved={setSettings} />
      ) : (
        <>
          <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-3">
            <CustomSelect control={filters.control} name="session" label="Session" placeholder={null} options={sessions} />
            <CustomSelect control={filters.control} name="className" label="Class" placeholder="Pick a class" options={CLASS_FILTER} />
            <CustomSelect control={filters.control} name="section" label="Section" placeholder={null} options={SECTION_OPTIONS} />
          </section>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

          {!className ? (
            <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow-sm">Pick a class to see its students.</p>
          ) : loading ? (
            <Loader label="Loading students..." fullScreen={false} />
          ) : rows.length === 0 ? (
            <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow-sm">No students in this section.</p>
          ) : (
            <section className="overflow-hidden rounded-lg bg-white shadow-sm">
              <p className="px-4 py-3 text-sm text-gray-600">
                <span className="font-bold text-navy">
                  {ready} / {rows.length}
                </span>{" "}
                students have every portal answer.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={TABLE_HEAD_CLASS}>
                      <th className="px-3 py-2">Roll</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Adm. No.</th>
                      <th className="px-3 py-2">PEN</th>
                      <th className="px-3 py-2">Still needed</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const lacking = missing.get(row.studentId) ?? [];
                      return (
                        <tr key={row.enrollmentId} className="border-t border-gray-100 align-top">
                          <td className="px-3 py-2">{row.rollNumber || "-"}</td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-gray-900">{row.studentName}</p>
                            <p className="text-xs text-gray-500">{row.fatherName}</p>
                          </td>
                          <td className="px-3 py-2">{row.admissionNo || "-"}</td>
                          <td className="px-3 py-2">
                            {row.pen || <span className="text-xs font-semibold text-red-600">No PEN</span>}
                          </td>
                          <td className="px-3 py-2">
                            {lacking.length === 0 ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">All set</span>
                            ) : (
                              <span className="text-xs text-gray-600">{lacking.map((field) => field.label).join(", ")}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => setEditing(row)}
                              className={`inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy ${CVES_ON_HOVER}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Answers
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <UdiseStudentEditor
            row={editing}
            settings={settings}
            className={className}
            onClose={() => setEditing(null)}
            onSaved={onSaved}
          />
        </>
      )}
    </div>
  );
}

export default UdisePage;
