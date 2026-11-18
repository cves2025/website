import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

import { CVES_BUTTON, CVES_ON_HOVER, TC_PATH, TC_SUGGESTIONS } from "../../../../constants";
import CustomInput from "../../../../custom-components/CustomInput";
import CustomTextarea from "../../../../custom-components/CustomTextarea";
import CustomToggle from "../../../../custom-components/CustomToggle";
import Loader, { Spinner } from "../../../../custom-components/Loader";
import PageHeader from "../../../../custom-components/PageHeader";
import { myContext } from "../../../context/MyContextProvider";
import useTcSettings from "../../../../hooks/useTcSettings";
import { saveTcSettings } from "../../../../utils/tcService";
import { formatTcNo, readTcSettings } from "../../../../utils/transferCertificate";
import { generateAcademicYears } from "../../../../utils/generateAcademicYears";
import type { TcSettings } from "../../../../utils/type";

type SettingsForm = Omit<TcSettings, "showQr" | "principalSign" | "lastSerial"> & {
  showQr: string;
  principalSign: string;
  lastSerial: string;
};

const toForm = (settings: TcSettings): SettingsForm => ({
  ...settings,
  showQr: settings.showQr ? "yes" : "no",
  principalSign: settings.principalSign ? "yes" : "no",
  lastSerial: String(settings.lastSerial),
});

const TEXT_FIELDS: { name: keyof SettingsForm; label: string; placeholder?: string; wide?: boolean }[] = [
  { name: "schoolName", label: "School name", wide: true },
  { name: "affiliationText", label: "Affiliation line", placeholder: "e.g. Affiliated to C.B.S.E. New Delhi", wide: true },
  { name: "affiliationNo", label: "Affiliation No." },
  { name: "schoolCode", label: "School Code" },
  { name: "udiseCode", label: "U-DISE Code" },
  { name: "phone", label: "Phone (printed when there is no e-mail / website)" },
  { name: "email", label: "E-mail" },
  { name: "website", label: "Website" },
];

/**
 * TC Settings (admin only): the letterhead of the TC, the default school
 * category, the Book No. and the last Sr. No. issued (to continue from a
 * paper register). Issued TCs keep the letterhead they were issued with.
 */
function TcSettingsPage() {
  const navigate = useNavigate();
  const { user } = useContext(myContext);
  const { settings, setSettings, loading, error } = useTcSettings();
  const form = useForm<SettingsForm>({ defaultValues: toForm(settings) });
  const { control, reset, handleSubmit, setValue, watch } = form;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) reset(toForm(settings));
  }, [loading, settings, reset]);

  const bookNo = watch("bookNo");
  const lastSerial = Number(watch("lastSerial")) || 0;
  const session = generateAcademicYears()[0]?.value ?? "";

  const save = handleSubmit(async (values) => {
    const next = readTcSettings({
      ...values,
      showQr: values.showQr === "yes",
      principalSign: values.principalSign === "yes",
      lastSerial: Number(values.lastSerial) || 0,
    });
    setSaving(true);
    try {
      await saveTcSettings(next, user?.uid ?? "");
      setSettings(next);
      toast.success("TC settings saved.");
    } catch (cause) {
      console.error("TC settings could not be saved.", cause);
      toast.error("TC settings could not be saved.");
    } finally {
      setSaving(false);
    }
  });

  if (loading) return <Loader label="Loading TC settings..." fullScreen={false} />;

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <PageHeader
        title="TC Settings"
        titleStyle="text-primaryBlue"
        description="School details printed on the Transfer Certificate, and its numbering."
        button={
          <button
            type="button"
            onClick={() => navigate(TC_PATH)}
            className={`flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 ${CVES_ON_HOVER}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to TC
          </button>
        }
      />
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Letterhead</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {TEXT_FIELDS.map((field) => (
            <CustomInput
              key={field.name}
              control={control}
              name={field.name}
              label={field.label}
              placeholder={field.placeholder}
              wrapperClassName={field.wide ? "md:col-span-2" : ""}
            />
          ))}
          <CustomTextarea control={control} name="note" label="Note under the signatures" rows={3} wrapperClassName="md:col-span-2" />
        </div>
      </section>

      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">On every TC</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <CustomInput control={control} name="schoolCategory" label="School category (row 20)" />
            <div className="flex flex-wrap gap-1.5">
              {TC_SUGGESTIONS.schoolCategory?.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setValue("schoolCategory", option, { shouldDirty: true })}
                  className="rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-600 hover:border-navy hover:text-navy"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <CustomToggle
            control={control}
            name="showQr"
            label="QR code on the TC"
            activeValue="yes"
            inactiveValue="no"
            activeLabel="Shown"
            inactiveLabel="Hidden"
            onChange={(value) => setValue("showQr", value, { shouldDirty: true })}
          />
          <CustomToggle
            control={control}
            name="principalSign"
            label="Principal's signature + stamp"
            activeValue="yes"
            inactiveValue="no"
            activeLabel="Printed (from Admit Card settings)"
            inactiveLabel="Signed by hand"
            onChange={(value) => setValue("principalSign", value, { shouldDirty: true })}
          />
        </div>
      </section>

      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Numbering</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <CustomInput control={control} name="bookNo" label="Book No." rules={{ required: "Enter the Book No." }} />
          <CustomInput
            control={control}
            name="lastSerial"
            type="number"
            min={0}
            label="Last Sr. No. issued"
            rules={{ validate: (value) => (Number.isInteger(Number(value)) && Number(value) >= 0) || "Enter 0 or more" }}
          />
          <div className="flex flex-col justify-end rounded-md bg-navy-soft px-3 py-2 text-sm text-navy">
            <span className="text-xs">Next TC No. will be</span>
            <b>{formatTcNo(session, bookNo || "1", lastSerial + 1)}</b>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Sr. No. goes up by one with every issued TC and is never used twice (a cancelled TC keeps its number). Change
          "Last Sr. No." only to continue from the old paper register.
        </p>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className={`flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${CVES_BUTTON}`}
        >
          {saving && <Spinner size="xs" tone="white" />}
          Save Settings
        </button>
      </div>
    </form>
  );
}

export default TcSettingsPage;
