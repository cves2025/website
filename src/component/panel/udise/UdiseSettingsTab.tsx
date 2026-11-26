import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import {
  CLASSES,
  CVES_BUTTON,
  UDISE_CLASS_OPTIONS,
  UDISE_FIELDS,
  UDISE_NONE,
  UDISE_STEP_LABEL,
} from "../../../constants";
import CustomSelect from "../../../custom-components/CustomSelect";
import { Spinner } from "../../../custom-components/Loader";
import { myContext } from "../../context/MyContextProvider";
import { fromUdiseForm, toUdiseForm } from "../../../utils/udiseRecord";
import { saveUdiseSettings } from "../../../utils/udiseService";
import type { UdiseForm, UdiseSettings, UdiseStep } from "../../../utils/type";
import UdiseFieldInput from "./UdiseFieldInput";

const STEPS: UdiseStep[] = ["GP", "EP", "FP"];
const DEFAULT_FIELDS = UDISE_FIELDS.filter((field) => field.defaultable);
const CLASS_CODE_OPTIONS = [{ value: UDISE_NONE, label: "Not on UDISE" }, ...UDISE_CLASS_OPTIONS];

type SettingsForm = UdiseForm & { classCodes: Record<string, string> };

const toForm = (settings: UdiseSettings): SettingsForm => ({
  ...toUdiseForm(settings.defaults, DEFAULT_FIELDS),
  classCodes: Object.fromEntries(CLASSES.map((name) => [name, settings.classCodes[name] || UDISE_NONE])),
});

interface Props {
  settings: UdiseSettings;
  onSaved: (settings: UdiseSettings) => void;
}

/**
 * UDISE Settings: the answer used for every student who has none of their
 * own (most schools answer the same for all), and the portal class of each of
 * our classes. Kept inside the UDISE section, separate from Settings.
 */
function UdiseSettingsTab({ settings, onSaved }: Props) {
  const { user } = useContext(myContext);
  const form = useForm<SettingsForm>({ defaultValues: toForm(settings) });
  const {
    control,
    setValue,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = form;

  useEffect(() => {
    reset(toForm(settings));
  }, [settings, reset]);

  const save = handleSubmit(async (values) => {
    const next: UdiseSettings = {
      defaults: fromUdiseForm(values, DEFAULT_FIELDS),
      classCodes: Object.fromEntries(
        CLASSES.map((name) => [name, values.classCodes[name] === UDISE_NONE ? "" : values.classCodes[name] ?? ""])
      ),
    };
    try {
      await saveUdiseSettings(next, user?.uid ?? "");
      onSaved(next);
      reset(toForm(next));
      toast.success("UDISE settings saved.");
    } catch (cause) {
      console.error("UDISE settings could not be saved.", cause);
      toast.error("UDISE settings could not be saved.");
    }
  });

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      {STEPS.map((step) => (
        <section key={step} className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-navy">{UDISE_STEP_LABEL[step]}: school default</h2>
          <p className="mb-3 text-xs text-gray-500">Used for a student who has no answer of their own and nothing in our records.</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_FIELDS.filter((field) => field.step === step).map((field) => (
              <UdiseFieldInput
                key={field.key}
                field={field}
                // The defaults use the same field names as a student's answers.
                control={control as unknown as Parameters<typeof UdiseFieldInput>[0]["control"]}
                setValue={setValue as unknown as Parameters<typeof UdiseFieldInput>[0]["setValue"]}
                noneLabel="No default"
              />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-navy">Classes on the portal</h2>
        <p className="mb-3 text-xs text-gray-500">Which UDISE+ class each of our classes is (for "class studied last year").</p>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CLASSES.map((name) => (
            <CustomSelect
              key={name}
              control={control}
              name={`classCodes.${name}`}
              label={`Our class ${name}`}
              placeholder={null}
              options={CLASS_CODE_OPTIONS}
            />
          ))}
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

export default UdiseSettingsTab;
