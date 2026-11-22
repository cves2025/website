/**
 * Settings > Student documents (admin): the kinds of document the school
 * takes (docs/features/student-documents.md). Name, Required (counted in the
 * Student List "N/M docs" badge and filter), Active (off = no new uploads,
 * old versions still shown), order (arrows). A type's id never changes once
 * saved; a type is switched off, never removed (its versions stay).
 * Save is off until something changes; an empty name is shown at its field.
 */
import { useContext, useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";

import { CVES_BUTTON } from "../../../constants";
import CircleCheckbox from "../../../custom-components/CircleCheckbox";
import Loader, { Spinner } from "../../../custom-components/Loader";
import { useDocumentTypes } from "../../../hooks/useStudentDocuments";
import { documentTypeId, saveDocumentTypes } from "../../../utils/studentDocumentsService";
import type { StudentDocumentType } from "../../../utils/type";
import { myContext } from "../../context/MyContextProvider";

interface FormValues {
  types: (StudentDocumentType & { saved: boolean })[];
}

function StudentDocumentTypesSection() {
  const { user } = useContext(myContext);
  const { types, setTypes, loading, error } = useDocumentTypes();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { isDirty, isSubmitting, errors },
  } = useForm<FormValues>({ defaultValues: { types: [] } });
  const { fields, append, move } = useFieldArray({ control, name: "types", keyName: "key" });

  useEffect(() => {
    if (!loading) reset({ types: types.map((type) => ({ ...type, saved: true })) });
  }, [loading, types, reset]);

  const save = handleSubmit(async (values) => {
    const empty = values.types.findIndex((type) => !type.name.trim());
    if (empty !== -1) {
      setError(`types.${empty}.name`, { message: "Write the document's name." });
      const field = document.getElementById(`doc-type-${empty}`);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus({ preventScroll: true });
      return;
    }
    // Saved types keep their id; a new one gets an id from its name.
    const taken = values.types.filter((type) => type.saved).map((type) => type.id);
    const next: StudentDocumentType[] = values.types.map(({ id, name, required, order, active, saved }) => {
      const finalId = saved ? id : documentTypeId(name, taken);
      if (!saved) taken.push(finalId);
      return { id: finalId, name: name.trim(), required, order, active };
    });
    try {
      await saveDocumentTypes(next, user?.uid ?? "");
      setTypes(next);
      toast.success("Document types saved.");
    } catch (cause) {
      console.error("Document types could not be saved.", cause);
      toast.error("The document types could not be saved.");
    }
  });

  const add = () => {
    // The real id is made from the name on Save.
    append({ id: `new${Date.now()}`, name: "", required: false, order: fields.length + 1, active: true, saved: false });
  };

  return (
    <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-gray-800">Student documents</h2>
      <p className="mt-0.5 text-sm text-gray-500">
        The documents the school takes from each student (Student List &gt; Documents). Required ones are counted in the
        &quot;N/M docs&quot; badge. Switch a document off to stop new uploads; its old files stay.
      </p>

      {loading ? (
        <Loader fullScreen={false} label="Loading the document types..." />
      ) : (
        <form onSubmit={(event) => void save(event)} noValidate className="mt-4 flex flex-col gap-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <ul className="flex flex-col gap-2">
            {fields.map((field, index) => {
              const nameError = errors.types?.[index]?.name?.message;
              return (
                <li key={field.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-200 px-3 py-2">
                  <span className="w-6 text-center text-xs font-bold text-gray-400">{index + 1}</span>
                  <Controller
                    control={control}
                    name={`types.${index}.name`}
                    render={({ field: input }) => (
                      <div className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
                        <label htmlFor={`doc-type-${index}`} className="sr-only">
                          Document name
                        </label>
                        <input
                          id={`doc-type-${index}`}
                          {...input}
                          onChange={(event) => {
                            clearErrors(`types.${index}.name`);
                            input.onChange(event);
                          }}
                          maxLength={60}
                          placeholder="e.g. Caste Certificate"
                          aria-invalid={Boolean(nameError)}
                          className={`rounded-md border px-3 py-1.5 text-sm outline-none focus:border-[#ad1a6f] ${
                            nameError ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"
                          }`}
                        />
                        {nameError && <span className="text-xs font-medium text-red-600">{nameError}</span>}
                      </div>
                    )}
                  />
                  <Controller
                    control={control}
                    name={`types.${index}.required`}
                    render={({ field: tick }) => (
                      <CircleCheckbox id={`doc-type-${index}-required`} label="Required" checked={tick.value} onCheckedChange={tick.onChange} className="text-xs font-semibold" />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`types.${index}.active`}
                    render={({ field: tick }) => (
                      <CircleCheckbox id={`doc-type-${index}-active`} label="Active" checked={tick.value} onCheckedChange={tick.onChange} className="text-xs font-semibold" />
                    )}
                  />
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move ${field.name || "document"} up`}
                      className="grid h-8 w-8 place-items-center rounded-md border border-gray-200 text-gray-600 hover:text-[#ad1a6f] disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, index + 1)}
                      disabled={index === fields.length - 1}
                      aria-label={`Move ${field.name || "document"} down`}
                      className="grid h-8 w-8 place-items-center rounded-md border border-gray-200 text-gray-600 hover:text-[#ad1a6f] disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-md border border-navy px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy-soft">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add document
            </button>
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${CVES_BUTTON}`}
            >
              {isSubmitting && <Spinner size="xs" tone="white" />}
              Save
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default StudentDocumentTypesSection;
