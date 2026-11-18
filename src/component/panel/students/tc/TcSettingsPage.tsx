import { useContext, useEffect } from "react";
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
import { readTcSettings } from "../../../../utils/transferCertificate";
import type { TcSettings } from "../../../../utils/type";

type SettingsForm = Omit<TcSettings, "showQr" | "principalSign"> & {
  showQr: string;
  principalSign: string;
};

const toForm = (settings: TcSettings): SettingsForm => ({
  ...settings,
  showQr: settings.showQr ? "yes" : "no",
  principalSign: settings.principalSign ? "yes" : "no",
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
  { name: "preparedBy", label: "Prepared By (name, printed on every TC)" },
  { name: "checkedBy", label: "Checked By (name, printed on every TC)" },
];

/**
 * TC Settings (admin only): the letterhead of the TC and the default school
 * category. Book No. / Sr. No. are typed on each TC. Issued TCs keep the
 * letterhead they were issued with.
 */
function TcSettingsPage() {
  const navigate = useNavigate();
  const { user } = useContext(myContext);
  const { settings, setSettings, loading, error } = useTcSettings();
  const form = useForm<SettingsForm>({ defaultValues: toForm(settings) });
  const {
    control,
    reset,
    handleSubmit,
    setValue,
    formState: { isDirty, isSubmitting },
  } = form;

  useEffect(() => {
    if (!loading) reset(toForm(settings));
  }, [loading, settings, reset]);

  const save = handleSubmit(async (values) => {
    const next = readTcSettings({
      ...values,
      showQr: values.showQr === "yes",
      principalSign: values.principalSign === "yes",
    });
    try {
      await saveTcSettings(next, user?.uid ?? "");
      // The saved values become the new defaults, so Save is off again.
      reset(toForm(next));
      setSettings(next);
      toast.success("TC settings saved.");
    } catch (cause) {
      console.error("TC settings could not be saved.", cause);
      toast.error("TC settings could not be saved.");
    }
  });

  if (loading) return <Loader label="Loading TC settings..." fullScreen={false} />;

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <PageHeader
        title="TC Settings"
        titleStyle="text-primaryBlue"
        description="School details and names printed on every Transfer Certificate."
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

      <div className="flex justify-end">
        <button
          type="submit"
          // Off until a field is changed (RHF isDirty), and while saving.
          disabled={!isDirty || isSubmitting}
          className={`flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${CVES_BUTTON}`}
        >
          {isSubmitting && <Spinner size="xs" tone="white" />}
          Save Settings
        </button>
      </div>
    </form>
  );
}

export default TcSettingsPage;
