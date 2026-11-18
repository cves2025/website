import { useContext, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { FileText, Search, Settings2 } from "lucide-react";

import {
  ADMISSION_SECTIONS,
  CLASS_OPTIONS,
  CVES_BUTTON,
  CVES_ON_HOVER,
  TC_EDIT_PATH,
  TC_REGISTER_CLASS,
  TC_SETTINGS_PATH,
  TC_STATUS_META,
} from "../../../../constants";
import CustomInput from "../../../../custom-components/CustomInput";
import CustomSelect from "../../../../custom-components/CustomSelect";
import Loader from "../../../../custom-components/Loader";
import PageHeader from "../../../../custom-components/PageHeader";
import { PERMISSIONS } from "../../../../permissions";
import { myContext } from "../../../context/MyContextProvider";
import useTcRows from "../../../../hooks/useTcRows";
import { generateAcademicYears } from "../../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../../utils/toOrdinalLabel";
import { tcDateText } from "../../../../utils/transferCertificate";
import type { TcStatus, TcStudentRow } from "../../../../utils/type";

interface Filters {
  session: string;
  className: string;
  section: string;
  status: TcStatus | "none" | "";
  search: string;
}

const sessions = generateAcademicYears();
const CLASS_FILTER = [
  { value: TC_REGISTER_CLASS, label: "All classes (TC register)" },
  ...CLASS_OPTIONS.map((option) => ({ ...option, label: toOrdinalLabel(option.label) })),
];
const SECTION_OPTIONS = ADMISSION_SECTIONS.map((section) => ({ value: section, label: section }));
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  ...(["none", "draft", "issued", "cancelled"] as const).map((value) => ({
    value,
    label: TC_STATUS_META[value].label,
  })),
];

const editLink = (row: TcStudentRow) =>
  `${TC_EDIT_PATH}?${new URLSearchParams({
    enrollment: row.enrollmentId,
    ...(row.tc ? { id: row.tc.id } : {}),
  }).toString()}`;

/**
 * Transfer Certificate page: pick a class and section to see its students
 * with their TC status, or "All classes" for every TC of the session
 * (TC register). A row opens the TC editor.
 */
function TcList() {
  const { can } = useContext(myContext);
  const canIssue = can(PERMISSIONS.TC_ISSUE);
  const filters = useForm<Filters>({
    defaultValues: {
      session: sessions[0]?.value ?? "",
      className: "",
      section: ADMISSION_SECTIONS[0],
      status: "",
      search: "",
    },
  });
  const { session, className, section, status, search } = useWatch({ control: filters.control }) as Filters;
  const isRegister = className === TC_REGISTER_CLASS;
  const { rows, loading, error } = useTcRows(session, className, section);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowStatus = row.tc?.status ?? "none";
      if (status && rowStatus !== status) return false;
      if (!needle) return true;
      return [row.studentName, row.admissionNo, row.fatherName, row.tc?.tcNo ?? ""].some((value) =>
        value.toLowerCase().includes(needle)
      );
    });
  }, [rows, status, search]);

  const counts = useMemo(() => {
    const result = { none: 0, draft: 0, issued: 0, cancelled: 0 };
    rows.forEach((row) => {
      result[row.tc?.status ?? "none"] += 1;
    });
    return result;
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Transfer Certificate"
        titleStyle="text-primaryBlue"
        description="Make, issue and print the TC of any student. Saved TCs open again as they were saved."
        button={
          can(PERMISSIONS.TC_SETTINGS) ? (
            <Link
              to={TC_SETTINGS_PATH}
              className={`flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 ${CVES_ON_HOVER}`}
            >
              <Settings2 className="h-4 w-4" />
              TC Settings
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <CustomSelect control={filters.control} name="session" label="Session" placeholder={null} options={sessions} />
        <CustomSelect control={filters.control} name="className" label="Class" placeholder="Select class" options={CLASS_FILTER} />
        <CustomSelect
          control={filters.control}
          name="section"
          label="Section"
          placeholder={null}
          options={SECTION_OPTIONS}
          disabled={isRegister}
        />
        <CustomSelect control={filters.control} name="status" label="TC status" placeholder={null} options={STATUS_OPTIONS} />
        <div className="relative self-end">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <CustomInput control={filters.control} name="search" placeholder="Name, scholar no. or TC no." className="pl-9" />
        </div>
      </div>

      {!className ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <FileText className="h-8 w-8 text-gray-400" />
          <p className="font-semibold text-gray-700">Pick a class and section</p>
          <p className="text-sm">Or choose "All classes (TC register)" to see every TC of the session.</p>
        </div>
      ) : loading ? (
        <Loader label="Loading students..." fullScreen={false} />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 px-4 py-3 text-xs font-semibold">
            {(["none", "draft", "issued", "cancelled"] as const)
              .filter((key) => !isRegister || key !== "none")
              .map((key) => (
                <span key={key} className={`rounded-full px-2.5 py-1 ${TC_STATUS_META[key].className}`}>
                  {TC_STATUS_META[key].label}: {counts[key]}
                </span>
              ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-navy text-left text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">{isRegister ? "Sr. No." : "Roll"}</th>
                  <th className="px-4 py-3">Scholar No.</th>
                  <th className="px-4 py-3">Student</th>
                  {isRegister && <th className="px-4 py-3">Class</th>}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">TC No. / Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {rows.length === 0
                        ? isRegister
                          ? "No TC has been made in this session yet."
                          : "No students in this section."
                        : "No student matches the filters."}
                    </td>
                  </tr>
                ) : (
                  shown.map((row) => {
                    const meta = TC_STATUS_META[row.tc?.status ?? "none"];
                    const canOpen = Boolean(row.tc) || canIssue;
                    const actionLabel = !row.tc
                      ? "Generate TC"
                      : row.tc.status === "cancelled"
                        ? canIssue
                          ? "Open / New TC"
                          : "Open"
                        : row.tc.status === "draft"
                          ? "Continue"
                          : "Open";
                    return (
                      <tr key={`${row.enrollmentId}-${row.tc?.id ?? ""}`} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">
                          {isRegister ? row.tc?.srNo || "-" : row.rollNumber || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.admissionNo || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{row.studentName}</div>
                          <div className="text-xs text-gray-500">
                            {row.fatherName}
                            {row.left && row.tc?.status === "issued" && " · Left"}
                          </div>
                        </td>
                        {isRegister && (
                          <td className="px-4 py-3 text-gray-700">
                            {toOrdinalLabel(row.className)}-{row.section}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.tc?.tcNo ? (
                            <>
                              <div className="font-medium">{row.tc.tcNo}</div>
                              <div className="text-xs text-gray-500">{tcDateText(row.tc.fields.issueDate)}</div>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canOpen ? (
                            <Link
                              to={editLink(row)}
                              className={
                                row.tc
                                  ? `inline-flex rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 ${CVES_ON_HOVER}`
                                  : `inline-flex rounded-md px-3 py-1.5 text-xs font-semibold text-white ${CVES_BUTTON}`
                              }
                            >
                              {actionLabel}
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-400">No TC</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TcList;
