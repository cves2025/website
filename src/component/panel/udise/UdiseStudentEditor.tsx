import { useContext, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { Copy } from "lucide-react";

import { UDISE_FIELDS, UDISE_STEP_LABEL } from "../../../constants";
import Modal from "../../../custom-components/Modal";
import { myContext } from "../../context/MyContextProvider";
import { fromUdiseForm, toUdiseForm, udiseAnswerText, udiseAnswers, udiseFieldNeeded } from "../../../utils/udiseRecord";
import { saveUdiseStudent } from "../../../utils/udiseService";
import type { UdiseForm, UdiseSettings, UdiseStep, UdiseStudentRow, UdiseValues } from "../../../utils/type";
import UdiseFieldInput from "./UdiseFieldInput";

const STEPS: UdiseStep[] = ["GP", "EP", "FP"];

const SOURCE_TEXT = { student: "typed here", records: "from records", default: "school default", none: "" } as const;

interface Props {
  row: UdiseStudentRow | null;
  settings: UdiseSettings;
  className: string;
  onClose: () => void;
  onSaved: (studentId: string, saved: UdiseValues) => void;
}

/**
 * The UDISE+ answers of one student: what our records give, the school
 * default, and what is typed here (wins). Saves only to udiseStudents; the
 * student's own record is never changed.
 */
function UdiseStudentEditor({ row, settings, className, onClose, onSaved }: Props) {
  const { user } = useContext(myContext);
  const form = useForm<UdiseForm>({ defaultValues: toUdiseForm(row?.saved ?? {}, UDISE_FIELDS) });
  const {
    control,
    setValue,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = form;

  useEffect(() => {
    reset(toUdiseForm(row?.saved ?? {}, UDISE_FIELDS));
  }, [row, reset]);

  // The final answers follow what is typed, so the "Final" line is live.
  const watched = useWatch({ control }) as UdiseForm;
  const answers = useMemo(
    () => udiseAnswers(row?.records ?? {}, fromUdiseForm(watched ?? { values: {}, multi: {} }, UDISE_FIELDS), settings),
    [row, watched, settings]
  );

  const save = handleSubmit(async (values) => {
    if (!row) return;
    try {
      const saved = await saveUdiseStudent(row.studentId, fromUdiseForm(values, UDISE_FIELDS), {
        uid: user?.uid ?? "",
        name: user?.fullName ?? user?.email ?? "",
      });
      onSaved(row.studentId, saved);
      reset(toUdiseForm(saved, UDISE_FIELDS));
      toast.success("UDISE answers saved.");
    } catch (cause) {
      console.error("UDISE answers could not be saved.", cause);
      toast.error("UDISE answers could not be saved.");
    }
  });

  // For testing the browser helper: the final answers as text to paste.
  const copyForPortal = async () => {
    if (!row) return;
    const final = Object.fromEntries(
      Object.entries(answers)
        .filter(([, answer]) => answer.value)
        .map(([key, answer]) => [key, answer.value])
    );
    const payload = { kind: "cves-udise", version: 1, pen: row.pen, name: row.studentName, className, answers: final };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload));
      toast.success("Copied. Paste it in the UDISE helper on the portal.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  return (
    <Modal
      isOpen={row !== null}
      onClose={onClose}
      title={row ? `UDISE+ answers: ${row.studentName}` : ""}
      description={row ? `Adm. No. ${row.admissionNo || "-"} · PEN ${row.pen || "not in our records"}` : undefined}
      submitText="Save"
      onSubmit={() => void save()}
      loading={isSubmitting}
      // Off until something is changed (RHF isDirty).
      submitDisabled={!isDirty}
      secondaryText="Copy for portal"
      onSecondarySubmit={() => void copyForPortal()}
      modalClassName="max-w-4xl"
    >
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <Copy className="h-3.5 w-3.5" />
          Leave a field "not set" to use our records or the school default. Saved only for UDISE; the student form is not changed.
        </p>
        {STEPS.map((step) => (
          <section key={step}>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy">{UDISE_STEP_LABEL[step]}</h3>
            <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
              {UDISE_FIELDS.filter((field) => field.step === step).map((field) => {
                const answer = answers[field.key];
                const needed = udiseFieldNeeded(field, answers);
                const fromRecords = field.derived ? row?.records[field.key] ?? "" : "";
                const fallback = field.defaultable ? settings.defaults[field.key] ?? "" : "";
                const hint = fromRecords
                  ? `Records: ${udiseAnswerText(field, fromRecords)}`
                  : fallback
                    ? `Default: ${udiseAnswerText(field, fallback)}`
                    : "";
                return (
                  <div
                    key={field.key}
                    className={`rounded-md border p-2.5 ${needed && !answer.value ? "border-red-300 bg-red-50/40" : "border-gray-200"}`}
                  >
                    <UdiseFieldInput
                      field={field}
                      control={control}
                      setValue={setValue}
                      noneLabel={hint ? `Not set (${hint})` : "Not set"}
                      placeholder={hint}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {answer.value ? (
                        <>
                          Final: <span className="font-semibold text-gray-800">{udiseAnswerText(field, answer.value)}</span>
                          {SOURCE_TEXT[answer.source] && ` · ${SOURCE_TEXT[answer.source]}`}
                        </>
                      ) : needed ? (
                        <span className="font-semibold text-red-600">Needed on the portal</span>
                      ) : (
                        "Left empty"
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}

export default UdiseStudentEditor;
