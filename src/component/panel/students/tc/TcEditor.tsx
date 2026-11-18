import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowLeft, History, Printer, RefreshCw } from "lucide-react";

import {
  CVES_BUTTON,
  CVES_ON_HOVER,
  TC_DATE_FIELDS,
  TC_PATH,
  TC_EDIT_PATH,
  TC_ROWS,
  TC_STATUS_META,
  TC_SUGGESTIONS,
} from "../../../../constants";
import CustomInput from "../../../../custom-components/CustomInput";
import CustomTextarea from "../../../../custom-components/CustomTextarea";
import Loader, { Spinner } from "../../../../custom-components/Loader";
import Modal from "../../../../custom-components/Modal";
import { myContext } from "../../../context/MyContextProvider";
import { PERMISSIONS } from "../../../../permissions";
import useTcEditor from "../../../../hooks/useTcEditor";
import useTcRecords from "../../../../hooks/useTcRecords";
import { useSchoolSigns } from "../../../../hooks/useIdCardSettings";
import { formatRupees } from "../../../../utils/feeStructure";
import { generateClassRollNumbers } from "../../../../utils/rollNumbers";
import {
  cancelTc,
  deleteTcDraft,
  issueTc,
  markTcPrinted,
  reviseTc,
  saveTcDraft,
  TC_NOT_DRAFT,
  type TcActor,
} from "../../../../utils/tcService";
import {
  dateInWords,
  emptyTcFields,
  readTcFields,
  schoolDetailsOf,
  tcDateText,
} from "../../../../utils/transferCertificate";
import { toOrdinalLabel } from "../../../../utils/toOrdinalLabel";
import type { TcFields } from "../../../../utils/type";
import TcPreview from "./TcSheet";

type Dialog = "issue" | "revise" | "cancel" | "delete" | null;

/** Text input of one TC field + its one-click answers. */
function TcInput({
  control,
  name,
  label,
  disabled,
  onPick,
}: {
  control: Control<TcFields>;
  name: keyof TcFields;
  label: string;
  disabled: boolean;
  onPick: (name: keyof TcFields, value: string) => void;
}) {
  const options = TC_SUGGESTIONS[name];
  return (
    <div className="flex flex-col gap-1.5">
      <CustomInput
        control={control}
        name={name}
        label={label}
        type={TC_DATE_FIELDS.has(name) ? "date" : "text"}
        disabled={disabled}
        className="py-1.5"
      />
      {options && !disabled && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onPick(name, option)}
              className="rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-xs text-gray-600 hover:border-navy hover:text-navy"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One student's Transfer Certificate: the editable form, the A4 preview and
 * the actions. New / draft: Save Draft, Issue TC (next Sr. No., student
 * marked Left). Issued: locked; Revise (with a reason, kept in history),
 * Cancel (admin). Every print after the first one says DUPLICATE.
 */
function TcEditor() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, can } = useContext(myContext);
  const canIssue = can(PERMISSIONS.TC_ISSUE);
  const isAdmin = user?.role === "admin";
  const actor: TcActor = { uid: user?.uid ?? "", name: user?.fullName || user?.email || "" };

  const enrollmentId = params.get("enrollment") ?? "";
  const tcId = params.get("id") ?? "";
  const { data, setData, loading, error } = useTcEditor(enrollmentId, tcId, actor.name);
  const { student, tc, settings } = data;
  const signs = useSchoolSigns();

  const form = useForm<TcFields>({ defaultValues: emptyTcFields() });
  const { control, reset, setValue, getValues } = form;
  useEffect(() => {
    if (data.fields) reset(data.fields);
  }, [data.fields, reset]);
  const watched = useWatch({ control }) as TcFields;
  const fields = useMemo(() => readTcFields(watched), [watched]);

  const [revising, setRevising] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState("");
  const reasonForm = useForm<{ reason: string }>({ defaultValues: { reason: "" } });
  const reason = useWatch({ control: reasonForm.control, name: "reason" }).trim();

  const status = tc?.status ?? "new";
  const editable = canIssue && (status === "new" || status === "draft" || (status === "issued" && revising));
  const records = useTcRecords(student, fields.struckOffDate, canIssue && (status === "new" || status === "draft"));

  // DOB in words follows the date (it can still be typed over).
  const lastDob = useRef("");
  useEffect(() => {
    if (!editable) return;
    if (lastDob.current && fields.dob !== lastDob.current) {
      setValue("dobInWords", dateInWords(fields.dob), { shouldDirty: true });
    }
    lastDob.current = fields.dob;
  }, [fields.dob, editable, setValue]);

  // A new TC takes attendance and fee answers from the records once.
  const filledFromRecords = useRef(false);
  useEffect(() => {
    if (tc || records.loading || filledFromRecords.current || !data.fields) return;
    const { attendance, due, concession } = records.records;
    if (!attendance && due === null) return;
    filledFromRecords.current = true;
    const fillIfEmpty = (name: keyof TcFields, value: string) => {
      if (!getValues(name)) setValue(name, value);
    };
    if (attendance) {
      fillIfEmpty("attendance", String(attendance.present));
      fillIfEmpty("schoolDays", String(attendance.days));
    }
    if (due !== null) fillIfEmpty("duesPaid", due > 0 ? "No" : "Yes");
    if (concession !== null) fillIfEmpty("feeConcession", concession ? "Yes" : "No");
  }, [tc, records.loading, records.records, data.fields, getValues, setValue]);

  const pick = (name: keyof TcFields, value: string) => setValue(name, value, { shouldDirty: true });

  const fillAttendance = () => {
    const { attendance } = records.records;
    if (!attendance) {
      toast.error("No attendance is marked for this section up to the struck-off date.");
      return;
    }
    setValue("attendance", String(attendance.present), { shouldDirty: true });
    setValue("schoolDays", String(attendance.days), { shouldDirty: true });
  };

  // The print dialog suggests the page title as the PDF file name.
  useEffect(() => {
    const previous = document.title;
    document.title = `TC ${fields.studentName || ""} ${tc?.tcNo.replace(/\//g, "-") ?? ""}`.trim();
    return () => {
      document.title = previous;
    };
  }, [fields.studentName, tc?.tcNo]);

  const school = tc?.school ?? (settings ? schoolDetailsOf(settings) : null);
  const due = records.records.due;

  const closeDialog = () => {
    setDialog(null);
    reasonForm.reset({ reason: "" });
  };

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    try {
      await action();
    } catch (cause) {
      console.error(`TC: ${label} failed.`, cause);
      toast.error(
        cause instanceof Error && cause.message === TC_NOT_DRAFT
          ? "This TC was already issued. Reload the page."
          : "Could not save. Please check your connection and try again."
      );
    } finally {
      setBusy("");
    }
  };

  const saveDraft = () =>
    run("save", async () => {
      if (!student) return;
      const id = await saveTcDraft(student, getValues(), tc?.id ?? null, actor);
      const saved = {
        ...(tc ?? {
          id,
          studentId: student.studentId,
          enrollmentId: student.enrollmentId,
          session: student.session,
          className: student.className,
          section: student.section,
          srNo: 0,
          bookNo: "",
          tcNo: "",
          school: null,
          printCount: 0,
          createdAt: new Date().toISOString(),
          issuedAt: "",
          issuedByName: "",
          duesAtIssue: null,
          cancelReason: "",
          cancelledAt: "",
          cancelledByName: "",
          history: [],
        }),
        id,
        status: "draft" as const,
        fields: readTcFields(getValues()),
      };
      setData({ ...data, tc: saved, fields: saved.fields });
      if (!tcId) navigate(`${TC_EDIT_PATH}?enrollment=${student.enrollmentId}&id=${id}`, { replace: true });
      toast.success("Draft saved.");
    });

  const issue = () =>
    run("issue", async () => {
      if (!student) return;
      const issued = await issueTc(student, getValues(), tc?.id ?? null, actor, due);
      setData({ ...data, tc: issued, fields: issued.fields });
      closeDialog();
      if (tcId !== issued.id) navigate(`${TC_EDIT_PATH}?enrollment=${student.enrollmentId}&id=${issued.id}`, { replace: true });
      toast.success(`TC ${issued.tcNo} issued. The student is marked Left.`);
      // Roll numbers close up (admin only; a teacher's try is skipped quietly).
      generateClassRollNumbers(student.className, student.session).catch((cause) =>
        console.warn("TC: roll numbers not refreshed.", cause)
      );
    });

  const saveRevision = () =>
    run("revise", async () => {
      if (!tc || !reason) return;
      const revised = await reviseTc(tc, getValues(), reason, actor);
      setData({ ...data, tc: revised, fields: revised.fields });
      setRevising(false);
      closeDialog();
      toast.success("TC revised. The old details are kept in its history.");
    });

  const cancel = () =>
    run("cancel", async () => {
      if (!tc || !reason) return;
      const cancelled = await cancelTc(tc, reason, actor);
      setData({ ...data, tc: cancelled });
      closeDialog();
      toast.success("TC cancelled. The student is back on the Student List.");
    });

  const removeDraft = () =>
    run("delete", async () => {
      if (!tc) return;
      await deleteTcDraft(tc.id);
      toast.success("Draft deleted.");
      navigate(TC_PATH);
    });

  const print = async () => {
    window.print();
    if (tc?.status !== "issued") return;
    try {
      await markTcPrinted(tc);
      setData({ ...data, tc: { ...tc, printCount: tc.printCount + 1 } });
    } catch (cause) {
      console.error("TC: print count not saved.", cause);
    }
  };

  const discardRevision = () => {
    reset(tc?.fields ?? emptyTcFields());
    setRevising(false);
  };

  if (!enrollmentId && !tcId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        No student chosen. <Link to={TC_PATH} className="font-semibold underline">Go to the TC page</Link>.
      </div>
    );
  }
  if (loading) return <Loader label="Loading transfer certificate..." fullScreen={false} />;
  if (error || !student || !school) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error ?? "Student not found."}
      </div>
    );
  }
  if (!tc && !canIssue) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        No TC has been made for this student yet.
      </div>
    );
  }

  const meta = TC_STATUS_META[status === "new" ? "none" : status];
  const outlineButton = `flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50 ${CVES_ON_HOVER}`;
  const mainButton = `flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${CVES_BUTTON}`;

  return (
    <div className="flex flex-col gap-3 print:block">
      <style>{"@page { size: A4 portrait; margin: 0; }"}</style>

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-sm print:hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button type="button" onClick={() => navigate(TC_PATH)} className={outlineButton}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold text-gray-900">{student.studentName}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
                {status === "new" ? "New TC" : meta.label}
              </span>
              {revising && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Revising</span>}
            </div>
            <p className="text-xs text-gray-500">
              Class {toOrdinalLabel(student.className)}-{student.section} · {student.session}
              {tc?.tcNo ? ` · TC No. ${tc.tcNo}` : ""}
              {tc && tc.printCount > 0 ? ` · printed ${tc.printCount}x` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canIssue && (status === "new" || status === "draft") && (
            <>
              {status === "draft" && (
                <button type="button" disabled={Boolean(busy)} onClick={() => setDialog("delete")} className={`${outlineButton} hover:!bg-red-600 hover:!text-white`}>
                  Delete draft
                </button>
              )}
              <button type="button" disabled={Boolean(busy)} onClick={saveDraft} className={outlineButton}>
                {busy === "save" && <Spinner size="xs" />}
                Save Draft
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => setDialog("issue")} className={mainButton}>
                Issue TC
              </button>
            </>
          )}
          {status === "issued" && canIssue && !revising && (
            <button type="button" onClick={() => setRevising(true)} className={outlineButton}>
              Revise
            </button>
          )}
          {revising && (
            <>
              <button type="button" disabled={Boolean(busy)} onClick={discardRevision} className={outlineButton}>
                Discard changes
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => setDialog("revise")} className={mainButton}>
                Save changes
              </button>
            </>
          )}
          {status === "issued" && isAdmin && !revising && (
            <button type="button" onClick={() => setDialog("cancel")} className={`${outlineButton} hover:!bg-red-600 hover:!text-white`}>
              Cancel TC
            </button>
          )}
          {status === "cancelled" && canIssue && (
            <Link to={`${TC_EDIT_PATH}?enrollment=${student.enrollmentId}`} className={mainButton}>
              Make a new TC
            </Link>
          )}
          <button
            type="button"
            onClick={print}
            disabled={revising || Boolean(busy)}
            title={status === "issued" ? "Print TC" : "Print (marked DRAFT until issued)"}
            className="grid h-[38px] w-[38px] place-items-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Notes above the work area */}
      <div className="flex flex-col gap-2 print:hidden">
        {editable && status !== "issued" && due !== null && due > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Fee due of <b>{formatRupees(due)}</b> is pending up to the struck-off month ({student.session}). You can still issue the TC.
            </span>
          </div>
        )}
        {editable && status !== "issued" && due === null && !records.loading && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-500">
            Fee dues could not be checked (fees are visible to admins only). Fill row 12 yourself.
          </div>
        )}
        {status === "cancelled" && tc && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Cancelled by {tc.cancelledByName} on {tcDateText(tc.cancelledAt.slice(0, 10))}: {tc.cancelReason}. Sr. No. {tc.srNo} is not used again.
          </div>
        )}
        {status === "issued" && tc && tc.duesAtIssue !== null && tc.duesAtIssue > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            Issued with a fee due of {formatRupees(tc.duesAtIssue)}.
          </div>
        )}
        {status === "issued" && !revising && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-500">
            This TC is issued and locked. {canIssue ? "Use Revise to correct it (the reason is kept in its history)." : ""}
            {tc && tc.printCount > 0 ? " The next print will say DUPLICATE." : " The first print is the original copy."}
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] print:block">
        {/* Form */}
        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm print:hidden lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-3">
            <TcInput control={control} name="scholarNo" label="Scholar No." disabled={!editable} onPick={pick} />
            <TcInput control={control} name="pen" label="P.E.N." disabled={!editable} onPick={pick} />
            <TcInput control={control} name="registrationNo" label="Registration No. (IX-XII)" disabled={!editable} onPick={pick} />
          </div>
          {TC_ROWS.map((row, index) => (
            <div key={row.field} className="flex flex-col gap-2 border-t border-gray-100 pt-3">
              <TcInput control={control} name={row.field} label={`${index + 1}. ${row.en}`} disabled={!editable} onPick={pick} />
              {row.sub && <TcInput control={control} name={row.sub.field} label={row.sub.en} disabled={!editable} onPick={pick} />}
              {row.extra && (
                <TcInput
                  control={control}
                  name={row.extra}
                  label={row.extra === "dobInWords" ? "Date of birth in words" : "Class at admission"}
                  disabled={!editable}
                  onPick={pick}
                />
              )}
              {row.field === "schoolDays" && editable && (
                <button
                  type="button"
                  onClick={fillAttendance}
                  disabled={records.loading}
                  className="flex items-center gap-1.5 self-start text-xs font-semibold text-navy hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${records.loading ? "animate-spin" : ""}`} />
                  Fill rows 17-18 from attendance (up to the struck-off date)
                </button>
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
            <TcInput control={control} name="preparedBy" label="Prepared by (name)" disabled={!editable} onPick={pick} />
            <TcInput control={control} name="checkedBy" label="Checked by (name)" disabled={!editable} onPick={pick} />
          </div>

          {tc && tc.history.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <History className="h-4 w-4" /> History
              </p>
              <ul className="flex flex-col gap-1.5 text-xs text-gray-600">
                {tc.history.map((entry, index) => (
                  <li key={index}>
                    <b>{entry.action}</b> by {entry.byName || "-"} on {tcDateText(entry.at.slice(0, 10))}
                    {entry.reason ? `: ${entry.reason}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>

        {/* Preview / print */}
        <div className="flex min-w-0 flex-col gap-1.5 lg:sticky lg:top-2 print:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 print:hidden">Print preview · A4</p>
          <TcPreview
            fields={fields}
            school={school}
            status={status}
            tcNo={tc?.tcNo ?? ""}
            srNo={tc?.srNo ?? 0}
            bookNo={tc?.bookNo ?? ""}
            duplicate={(tc?.printCount ?? 0) > 0}
            signs={signs}
          />
        </div>
      </div>

      {/* Dialogs */}
      <Modal
        isOpen={dialog === "issue"}
        onClose={closeDialog}
        title="Issue Transfer Certificate?"
        submitText="Issue TC"
        submitClassName={CVES_BUTTON}
        submitDisabled={!fields.struckOffDate || !fields.issueDate}
        onSubmit={issue}
        loading={busy === "issue"}
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>
            The TC gets the next Sr. No. (Book No. {settings?.bookNo}, Sr. No. {(settings?.lastSerial ?? 0) + 1}) and is
            locked. <b>{student.studentName}</b> will be marked <b>Left</b> and leave the Student List.
          </p>
          {due !== null && due > 0 && (
            <p className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Fee due of {formatRupees(due)} is still pending.
            </p>
          )}
          {!fields.struckOffDate || !fields.issueDate ? (
            <p className="rounded-md bg-red-50 p-3 text-red-700">Fill the struck-off date and the date of issue first.</p>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={dialog === "revise"}
        onClose={closeDialog}
        title="Save the revised TC"
        description="Why is this issued TC being changed? The reason and the old details are kept in its history."
        submitText="Save changes"
        submitClassName={CVES_BUTTON}
        submitDisabled={!reason}
        onSubmit={saveRevision}
        loading={busy === "revise"}
      >
        <CustomTextarea control={reasonForm.control} name="reason" label="Reason" rows={3} required wrapperClassName="mt-3" />
      </Modal>

      <Modal
        isOpen={dialog === "cancel"}
        onClose={closeDialog}
        title="Cancel this TC?"
        description={`TC No. ${tc?.tcNo ?? ""} will be marked CANCELLED and its Sr. No. is not used again. The student comes back to the Student List.`}
        submitText="Cancel TC"
        submitClassName="bg-red-600 hover:bg-red-700"
        submitDisabled={!reason}
        onSubmit={cancel}
        loading={busy === "cancel"}
        cancelText="Keep TC"
      >
        <CustomTextarea control={reasonForm.control} name="reason" label="Reason" rows={3} required wrapperClassName="mt-3" />
      </Modal>

      <Modal
        isOpen={dialog === "delete"}
        onClose={closeDialog}
        title="Delete this draft?"
        description="The draft TC is deleted. No Sr. No. was used."
        submitText="Delete"
        submitClassName="bg-red-600 hover:bg-red-700"
        onSubmit={removeDraft}
        loading={busy === "delete"}
      />
    </div>
  );
}

export default TcEditor;
