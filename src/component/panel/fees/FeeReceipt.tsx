import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import Loader from "../../../custom-components/Loader";
import { CVES_ON_HOVER, FEE_COLLECT_PATH } from "../../../constants";
import { myContext } from "../../context/MyContextProvider";
import { saveReceiptPrintSettings } from "../../../utils/feeService";
import useFeePayment from "../../../hooks/useFeePayment";
import useReceiptPrintSettings from "../../../hooks/useReceiptPrintSettings";
import useReceiptBalance from "../../../hooks/useReceiptBalance";
import type { ReceiptPrintSettings } from "../../../utils/type";
import ReceiptPrintPanel, { type SaveState } from "./ReceiptPrintPanel";
import ReceiptDesignCopy from "./ReceiptDesigns";

const STUDENT_COPY = "Student Copy";
const OFFICE_COPY = "Office Copy";

/**
 * Printable fee receipt (`?id=` = payment id), for the student and for the
 * office. The print settings beside it (saved for the whole school) choose
 * the design, the paper - both halves of one A4 page with a cut line between
 * them, or one A4 page per copy for half sheets - and the copies; the
 * preview shows the pages as they will print.
 */
function FeeReceipt() {
  const navigate = useNavigate();
  const { user } = useContext(myContext);
  const [params] = useSearchParams();
  const { payment, loading, error } = useFeePayment(params.get("id") ?? "");
  const print = useReceiptPrintSettings();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // Paid earlier / balance due: read only for the Balance design.
  const balance = useReceiptBalance(payment, print.settings.design === "balance");

  // The print dialog suggests the page title as the PDF file name.
  useEffect(() => {
    if (!payment) return;
    const previous = document.title;
    document.title = `Fee Receipt ${payment.receiptNo.replace(/\//g, "-")}`;
    return () => {
      document.title = previous;
    };
  }, [payment]);

  const backToStudent = () => {
    if (!payment) return navigate(FEE_COLLECT_PATH);
    const query = new URLSearchParams({
      session: payment.session,
      class: payment.className,
      section: payment.section,
      student: payment.studentId,
    });
    navigate(`${FEE_COLLECT_PATH}?${query.toString()}`);
  };

  // The preview changes at once; the choice is saved for the whole school.
  const changePrint = async (next: ReceiptPrintSettings) => {
    print.setSettings(next);
    setSaveState("saving");
    try {
      await saveReceiptPrintSettings(next, user?.uid ?? "");
      setSaveState("saved");
    } catch (cause) {
      console.error("Print settings could not be saved.", cause);
      setSaveState("error");
      toast.error("Print settings could not be saved.");
    }
  };

  const { design, paper, copies } = print.settings;
  const labels =
    copies === "both" ? [STUDENT_COPY, OFFICE_COPY] : [copies === "student" ? STUDENT_COPY : OFFICE_COPY];
  // Always A4 pages. Full A4: one page, the copies in its top and bottom
  // halves. Half sheets: an A4 page per copy, printed in its top half only,
  // so it lands on an A4 sheet cut in half that is fed into the printer.
  const sheets = paper === "a4" ? [labels] : labels.map((label) => [label]);

  return (
    <div className="flex flex-col gap-3 print:block">
      {/* Page size of the print; margin 0, the sheets carry their own. */}
      <style>{"@page { size: A4 portrait; margin: 0; }"}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-sm print:hidden">
        <button
          type="button"
          onClick={backToStudent}
          className={`flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition ${CVES_ON_HOVER}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collect Fee
        </button>
        <button
          type="button"
          disabled={!payment || print.loading || balance.loading}
          onClick={() => window.print()}
          title="Print receipt"
          aria-label="Print receipt"
          className="grid h-[38px] w-[38px] place-items-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer className="h-5 w-5" />
        </button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] print:block">
        <div className="lg:sticky lg:top-2 print:hidden">
          <ReceiptPrintPanel
            settings={print.settings}
            onChange={changePrint}
            loading={print.loading}
            saveState={saveState}
          />
        </div>

        {loading ? (
          <Loader label="Loading receipt..." fullScreen={false} />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : !payment ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Receipt not found.
          </div>
        ) : (
          // Preview: the sheets at their real size (scrolls sideways on a phone).
          <div className="flex min-w-0 flex-col gap-6 overflow-x-auto pb-2 print:block print:overflow-visible print:pb-0">
            {sheets.map((sheet, index) => (
              <div key={sheet.join()} className="mx-auto flex flex-col gap-1.5 print:block print:break-after-page print:last:break-after-auto">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 print:hidden">
                  {paper === "a4"
                    ? "A4 page"
                    : `A4 page ${index + 1} of ${sheets.length} · ${sheet[0]} on the top half`}
                </p>
                {/* A hair under the A4 height, so rounding never adds a blank page. */}
                <div className="flex h-[296mm] w-[210mm] shrink-0 flex-col bg-white shadow-lg print:shadow-none">
                  {[sheet[0], sheet[1]].map((label, slot) => (
                    <div
                      key={slot}
                      // The design sheet's spacing: 22px round the page, 10px each side of the cut.
                      className={`relative min-h-0 flex-1 px-[22px] ${slot === 0 ? "pb-[11px] pt-[22px]" : "pb-[22px] pt-[11px]"} ${
                        slot === 1 && label ? "border-t-2 border-dashed border-gray-400" : ""
                      }`}
                    >
                      {slot === 1 && label && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] text-gray-500">
                          ✂ cut here
                        </span>
                      )}
                      {!label && paper === "half" && slot === 1 && (
                        // Preview only: where the cut half sheet ends.
                        <div className="grid h-full place-items-center rounded border-2 border-dashed border-gray-300 bg-[repeating-linear-gradient(45deg,#f9fafb_0,#f9fafb_10px,#f3f4f6_10px,#f3f4f6_20px)] text-center text-xs text-gray-500 print:hidden">
                          The half sheet ends here; nothing prints below.
                        </div>
                      )}
                      {label && (
                        <FitBox>
                          <ReceiptDesignCopy
                            design={design}
                            payment={payment}
                            copyLabel={label}
                            balance={balance.balance}
                          />
                        </FitBox>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Fills its box; content taller than the box (a receipt with many lines) is
 * scaled down to fit, so a copy never spills over its half of the page.
 */
function FitBox({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    // offsetHeight ignores the transform, so measuring never loops.
    const measure = () => setScale(Math.min(1, box.clientHeight / Math.max(1, content.offsetHeight)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className="h-full overflow-hidden">
      <div
        ref={inner}
        className="flex min-h-full origin-top flex-col"
        style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export default FeeReceipt;
