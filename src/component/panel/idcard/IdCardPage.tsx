/**
 * ID Card page: Students, Teachers, Staff and Admin in one row of tabs (each
 * only for users allowed to print it). Pick people with the checkboxes - a
 * student by session, class and section - and their cards show in the
 * preview, in the tab's template. An admin opens ID Settings beside the
 * preview to change the card size, template, fields and their look.
 */
import { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { Search, Settings2 } from "lucide-react";

import {
  ADMISSION_SECTIONS,
  CLASS_OPTIONS,
  ID_CARD_KIND_OPTIONS,
} from "../../../constants";
import { PERMISSIONS, type Permission } from "../../../permissions";
import CircleCheckbox from "../../../custom-components/CircleCheckbox";
import CustomInput from "../../../custom-components/CustomInput";
import CustomSelect from "../../../custom-components/CustomSelect";
import PageHeader from "../../../custom-components/PageHeader";
import { Spinner } from "../../../custom-components/Loader";
import { myContext } from "../../context/MyContextProvider";
import { useSectionStudents } from "../../../hooks/useSectionStudents";
import { useTeachers } from "../../../hooks/useTeachers";
import useIdCardSettings, { useSchoolSigns } from "../../../hooks/useIdCardSettings";
import { generateAcademicYears } from "../../../utils/generateAcademicYears";
import { saveIdCardSettings } from "../../../utils/idCardService";
import { memberCard, sampleCard, studentCard } from "../../../utils/idCardPeople";
import { readIdCardSettings } from "../../../utils/idCardSettings";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import type { IdCardKind, IdCardPerson, IdCardSettings } from "../../../utils/type";
import IdCardSettingsPanel from "./IdCardSettingsPanel";
import IdCardView, { CardFrame } from "./IdCardView";

const KIND_PERMISSION: Record<IdCardKind, Permission> = {
  student: PERMISSIONS.IDCARD_STUDENT,
  teacher: PERMISSIONS.IDCARD_TEACHER,
  staff: PERMISSIONS.IDCARD_STAFF,
  admin: PERMISSIONS.IDCARD_ADMIN,
};

const sessions = generateAcademicYears();
/** The latest session (the list runs oldest first). */
const currentSession = sessions[sessions.length - 1]?.value ?? "";
const classOptions = CLASS_OPTIONS.map((option) => ({ ...option, label: toOrdinalLabel(option.value) }));
const sectionOptions = ADMISSION_SECTIONS.map((section) => ({ value: section, label: `Section ${section}` }));

/** Cards drawn at once in the preview; the rest still export. */
const PREVIEW_LIMIT = 24;

interface Filters {
  session: string;
  className: string;
  section: string;
  search: string;
}

function IdCardPage() {
  const { user, can } = useContext(myContext);
  const isAdmin = user?.role === "admin";
  const kinds = ID_CARD_KIND_OPTIONS.filter((option) => can(KIND_PERMISSION[option.value]));

  // The open tab lives in the URL (?tab=student), so old links land on it.
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab");
  const kind: IdCardKind = kinds.find((option) => option.value === asked)?.value ?? kinds[0]?.value ?? "student";
  const openTab = (next: IdCardKind) => setParams({ tab: next }, { replace: true });

  // Settings: the saved ones, and the form the panel edits (the preview's source).
  const saved = useIdCardSettings();
  const form = useForm<IdCardSettings>({ defaultValues: saved.settings });
  const { reset, control, getValues, formState } = form;
  useEffect(() => {
    if (!saved.loading) reset(saved.settings);
  }, [saved.loading, saved.settings, reset]);
  const watched = useWatch({ control }) as IdCardSettings;
  // Numbers typed in the panel arrive as text; read them as the card will.
  const draft = useMemo(() => readIdCardSettings(watched), [watched]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const signs = useSchoolSigns();

  const save = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      await saveIdCardSettings(values, user?.uid ?? "");
      const clean = readIdCardSettings(values);
      saved.setSettings(clean);
      reset(clean);
      toast.success("ID card settings saved.");
    } catch (cause) {
      console.error("ID card settings could not be saved.", cause);
      toast.error("ID card settings could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  });

  // Who is on the list: one section's students, or the users of the tab.
  const filters = useForm<Filters>({
    defaultValues: { session: currentSession, className: "", section: ADMISSION_SECTIONS[0], search: "" },
  });
  const { session, className, section, search } = useWatch({ control: filters.control }) as Filters;
  const isStudent = kind === "student";
  const students = useSectionStudents(isStudent ? session : "", className, section);
  const members = useTeachers(isStudent ? "" : kind);
  const loading = isStudent ? students.loading : members.loading;
  const error = isStudent ? students.error : members.error;

  const people = useMemo<IdCardPerson[]>(
    () =>
      isStudent
        ? students.students.map((student) => studentCard(student, className, section))
        : members.teachers.map((member) => memberCard(member, kind)),
    [isStudent, students.students, members.teachers, className, section, kind]
  );
  const term = search.trim().toLowerCase();
  const shown = term
    ? people.filter((person) => `${person.name} ${person.code}`.toLowerCase().includes(term))
    : people;

  // Ticked people; a new tab or list starts empty.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => setPicked(new Set()), [kind, session, className, section]);
  const toggle = (id: string, on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const allShownPicked = shown.length > 0 && shown.every((person) => picked.has(person.id));
  const pickAll = (on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      shown.forEach((person) => (on ? next.add(person.id) : next.delete(person.id)));
      return next;
    });

  const selected = people.filter((person) => picked.has(person.id));
  // Nothing ticked: the first person (or a sample) shows how the card looks.
  const preview = selected.length > 0 ? selected : [people[0] ?? sampleCard(kind)];
  const cardSession = isStudent ? session : currentSession;
  const tab = draft.tabs[kind];

  if (kinds.length === 0) {
    return <p className="rounded-lg bg-white p-6 text-gray-600">You do not have access to any ID cards.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title="ID Card"
        titleStyle="text-primaryBlue"
        description="Pick the people, check the preview, and change the design in ID Settings."
        descriptionStyle="text-gray-500"
        button={
          isAdmin ? (
            <button
              type="button"
              onClick={() => setPanelOpen((open) => !open)}
              aria-pressed={panelOpen}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
                panelOpen ? "bg-cves text-white shadow-sm" : "border border-gray-300 bg-white text-gray-700 hover:border-transparent hover:bg-cves hover:text-white"
              }`}
            >
              <Settings2 className="h-4 w-4" />
              ID Settings
            </button>
          ) : undefined
        }
      />

      {/* Students | Teachers | Staff | Admin */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Whose ID cards">
        {kinds.map((option) => {
          const active = option.value === kind;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => openTab(option.value)}
              className={`rounded-md border px-4 py-2 text-sm font-bold transition ${
                active ? "border-transparent bg-cves text-white shadow-sm" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* With ID Settings open, the settings sit beside the preview; the list
          comes back beside them on a very wide screen. */}
      <div
        className={`grid items-start gap-4 ${
          panelOpen
            ? "lg:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[19rem_minmax(0,1fr)_23rem]"
            : "lg:grid-cols-[19rem_minmax(0,1fr)]"
        }`}
      >
        {/* People */}
        <section
          className={`flex-col gap-3 rounded-lg bg-white p-4 shadow-sm lg:sticky lg:top-2 ${
            panelOpen ? "flex lg:hidden 2xl:flex" : "flex"
          }`}
        >
          {isStudent && (
            <div className="grid grid-cols-2 gap-2">
              <CustomSelect control={filters.control} name="session" label="Session" placeholder={null} options={sessions} wrapperClassName="col-span-2" className="py-1.5" />
              <CustomSelect control={filters.control} name="className" label="Class" placeholder="Select class" options={classOptions} className="py-1.5" />
              <CustomSelect control={filters.control} name="section" label="Section" placeholder={null} options={sectionOptions} className="py-1.5" />
            </div>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <CustomInput
              control={filters.control}
              name="search"
              placeholder={isStudent ? "Name or enrollment no." : "Name or employee ID"}
              className="py-1.5 pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" label="Loading" />
            </div>
          ) : error ? (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : isStudent && !className ? (
            <p className="py-4 text-center text-sm text-gray-500">Select a class to list its students.</p>
          ) : shown.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">{term ? "No one matches the search." : "No one to show here yet."}</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <CircleCheckbox id={`${kind}-all`} label={`Select all (${shown.length})`} checked={allShownPicked} onCheckedChange={pickAll} className="font-semibold" />
                <span className="text-xs text-gray-500">{picked.size} selected</span>
              </div>
              <ul className="-mx-1 flex max-h-[55vh] flex-col overflow-y-auto">
                {shown.map((person) => (
                  <li key={person.id} className="rounded-md px-1 py-1.5 hover:bg-gray-50">
                    <CircleCheckbox
                      id={`${kind}-${person.id}`}
                      label={
                        `${person.name}${person.code && person.code !== person.id ? ` · ${person.code}` : ""}` +
                        (isStudent && person.values.rollNumber ? ` · Roll ${person.values.rollNumber}` : "")
                      }
                      checked={picked.has(person.id)}
                      onCheckedChange={(on) => toggle(person.id, on)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Preview */}
        <section className="flex min-w-0 flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-gray-900">
              Preview{" "}
              <span className="text-sm font-normal text-gray-500">
                {selected.length > 0
                  ? `· ${selected.length} card${selected.length === 1 ? "" : "s"}${selected.length > PREVIEW_LIMIT ? `, first ${PREVIEW_LIMIT} shown` : ""}`
                  : "· sample, tick people to see their cards"}
              </span>
            </h2>
          </div>
          {saved.loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="md" label="Loading settings" />
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-5 overflow-x-auto rounded-lg bg-gray-100 p-5">
              {preview.slice(0, PREVIEW_LIMIT).map((person) => (
                <CardFrame key={person.id} caption={selected.length > 0 ? person.name : undefined}>
                  <IdCardView person={person} tab={tab} settings={draft} session={cardSession} signs={signs} />
                </CardFrame>
              ))}
            </div>
          )}
        </section>

        {panelOpen && isAdmin && (
          <div className="lg:sticky lg:top-2 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <IdCardSettingsPanel
              kind={kind}
              control={control}
              getValues={getValues}
              reset={reset}
              dirty={formState.isDirty}
              saving={saving}
              onSave={() => void save()}
              onClose={() => setPanelOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default IdCardPage;
