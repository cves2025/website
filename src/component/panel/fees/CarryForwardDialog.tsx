import { useContext, useState } from "react";
import toast from "react-hot-toast";

import Modal from "../../../custom-components/Modal";
import Loader from "../../../custom-components/Loader";
import { myContext } from "../../context/MyContextProvider";
import { formatRupees } from "../../../utils/feeStructure";
import { previousAcademicYear } from "../../../utils/generateAcademicYears";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import { carryForwardStudent } from "../../../utils/feeService";
import useCarryForwardPlan from "../../../hooks/useCarryForwardPlan";

/** Students carried forward at the same time. */
const PARALLEL = 5;
/** Rows listed in the preview. */
const PREVIEW_ROWS = 8;

interface CarryForwardDialogProps {
  isOpen: boolean;
  session: string;
  onClose: () => void;
  /** Called after the carry forward ran (the report should reload). */
  onDone: () => void;
}

/**
 * Brings the unpaid dues of the previous session into `session` as a
 * Previous Dues line, for every student who is in both sessions. Shows a
 * preview first; running it again only picks up students not done yet.
 */
function CarryForwardDialog({ isOpen, session, onClose, onDone }: CarryForwardDialogProps) {
  const { user } = useContext(myContext);
  const fromSession = previousAcademicYear(session);
  const { items, loading, error } = useCarryForwardPlan(session, isOpen);
  const [progress, setProgress] = useState<number | null>(null);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const running = progress !== null;

  const handleRun = async () => {
    if (!user || items.length === 0) return;
    const actor = { uid: user.uid, name: user.fullName || user.email || "" };
    let done = 0;
    let carried = 0;
    let failed = 0;
    setProgress(0);
    for (let index = 0; index < items.length; index += PARALLEL) {
      const results = await Promise.allSettled(
        items.slice(index, index + PARALLEL).map((item) => carryForwardStudent(item, actor))
      );
      results.forEach((result) => {
        if (result.status === "fulfilled") carried += result.value;
        else {
          failed += 1;
          console.error("Failed to carry forward dues:", result.reason);
        }
      });
      done += results.length;
      setProgress(done);
    }
    setProgress(null);
    if (carried) toast.success(`${formatRupees(carried)} of ${fromSession} dues carried forward to ${session}.`);
    if (failed) toast.error(`${failed} student(s) could not be done. Run it again to retry them.`);
    if (!carried && !failed) toast.success("Nothing left to carry forward.");
    onDone();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!running) onClose();
      }}
      title={`Carry Forward Dues from ${fromSession}`}
      description={`Unpaid fees of ${fromSession} move into ${session} as a "Previous Dues" line. In ${fromSession} they are marked "Carried to ${session}". Students who are not in ${session} (passed out / left) are not included.`}
      cancelText="Cancel"
      submitText={running ? `Working... ${progress}/${items.length}` : `Carry Forward (${items.length})`}
      submitDisabled={loading || Boolean(error) || items.length === 0}
      loading={running}
      onSubmit={() => void handleRun()}
      modalClassName="max-w-lg"
    >
      <div className="mt-4">
        {loading ? (
          <Loader label={`Checking the dues of ${fromSession}...`} />
        ) : error ? (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : items.length === 0 ? (
          <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            Nothing to carry forward: no student of {session} owes anything in {fromSession}, or it
            was already done.
          </p>
        ) : (
          <>
            <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              {items.length} student(s) · {formatRupees(total)} in total
            </p>
            <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200 text-sm">
              {items.slice(0, PREVIEW_ROWS).map((item) => (
                <li key={item.student.studentId} className="flex justify-between gap-3 px-3 py-1.5">
                  <span className="truncate text-gray-700">
                    {item.student.studentName}{" "}
                    <span className="text-gray-400">
                      ({toOrdinalLabel(item.student.className)}-{item.student.section})
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatRupees(item.amount)}</span>
                </li>
              ))}
              {items.length > PREVIEW_ROWS && (
                <li className="px-3 py-1.5 text-gray-500">and {items.length - PREVIEW_ROWS} more...</li>
              )}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}

export default CarryForwardDialog;
