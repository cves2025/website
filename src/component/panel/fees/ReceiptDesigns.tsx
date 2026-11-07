/**
 * The four printable receipt designs (H Classic, I Minimal, J Balance,
 * K Band + Stamp of the client's design sheet), filled with the receipt's
 * data. Each fills the half page it is given (flex: 1).
 */
import type { CSSProperties, ReactNode } from "react";
import { format } from "date-fns";

import schoolLogo from "../../../assets/image/schoolLogo.jpg";
import { SCHOOL_CONTACT, SCHOOL_DISPLAY_NAME, SCHOOL_NAME } from "../../../constants";
import { amountInWords } from "../../../utils/amountInWords";
import { formatRupees } from "../../../utils/feeStructure";
import { fromDateKey } from "../../../utils/holidayCalendar";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import type { FeePayment, ReceiptBalance, ReceiptDesign } from "../../../utils/type";

export interface ReceiptCopyProps {
  payment: FeePayment;
  copyLabel: string;
  /** Paid earlier / balance due (the Balance design); null while unknown. */
  balance: ReceiptBalance | null;
}

const INK = "#1f2430";
const MUTED = "#5b6270";
const ADDRESS = `${SCHOOL_CONTACT.ADDRESS} · Ph. ${SCHOOL_CONTACT.PHONE}`;
const SANS = "Inter, system-ui, sans-serif";

const dateText = (payment: FeePayment, pattern: string) => format(fromDateKey(payment.date), pattern);
const classText = (payment: FeePayment) => `${toOrdinalLabel(payment.className)} - ${payment.section}`;
const modeText = (payment: FeePayment) =>
  `${payment.mode}${payment.reference ? ` (Ref. ${payment.reference})` : ""}`;

/**
 * The school logo in a white circle. The whole logo (rays and ribbon
 * included) is fitted inside the square that fits in the circle (70% of
 * the diameter), so no corner of it ever pokes out.
 */
function Logo({ size, ring }: { size: number; ring: string }) {
  return (
    <span
      style={{ width: size, height: size, flex: "none", borderRadius: "50%", border: `2px solid ${ring}`, background: "#fff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}
    >
      <img
        src={schoolLogo}
        alt="School logo"
        // A touch brighter, so the logo's light grey paper reads as white.
        style={{ width: "70%", height: "70%", objectFit: "contain", filter: "brightness(1.05)" }}
      />
    </span>
  );
}

/** Over a cancelled receipt, whatever the design. */
function CancelledStamp() {
  return (
    <div
      style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 2 }}
    >
      <span
        style={{ transform: "rotate(-12deg)", border: "4px solid #ef4444", borderRadius: 6, padding: "4px 24px", fontSize: 48, fontWeight: 800, letterSpacing: 6, color: "rgba(239,68,68,0.6)", fontFamily: SANS }}
      >
        CANCELLED
      </span>
    </div>
  );
}

/** Small caps label over a value (designs I, J, K). */
function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ textAlign: "left", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function Signature({
  payment,
  style,
  middle,
}: {
  payment: FeePayment;
  style?: CSSProperties;
  /** Placed in the white space between "Received by" and the signature. */
  middle?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginTop: "auto", fontSize: 13, color: MUTED, paddingTop: 12, ...style }}>
      <span>
        Received by <b style={{ color: INK }}>{payment.collectedByName || "-"}</b>
      </span>
      {middle}
      <span style={{ borderTop: `1px solid ${INK}`, width: 190, textAlign: "center", paddingTop: 4, color: INK }}>
        Authorised Signatory
      </span>
    </div>
  );
}

function Note({ payment }: { payment: FeePayment }) {
  return payment.note ? (
    <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
      Note: <span style={{ color: INK }}>{payment.note}</span>
    </div>
  ) : null;
}

/* ------------------------------------------------------------ H Classic -- */

function ClassicReceipt({ payment, copyLabel }: ReceiptCopyProps) {
  const blue = "#263b8c";
  const cell: CSSProperties = { padding: "8px 10px", border: "1px solid #c5cbe0" };
  const [first, ...rest] = copyLabel.toUpperCase().split(" ");
  const details: [string, string][] = [
    ["Student", payment.studentName],
    ["Father's Name", payment.fatherName || "-"],
    ["Class", classText(payment)],
    ["Admission No.", payment.admissionNo || "-"],
  ];
  return (
    <div style={{ flex: 1, position: "relative", border: `2px solid ${blue}`, padding: "16px 20px", display: "flex", flexDirection: "column", fontFamily: "'Noto Serif', serif", boxSizing: "border-box", color: INK, background: "#fff" }}>
      {payment.status === "cancelled" && <CancelledStamp />}
      <div style={{ display: "flex", gap: 14, alignItems: "center", borderBottom: `2px solid ${blue}`, paddingBottom: 10 }}>
        <Logo size={64} ring={blue} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: blue }}>{SCHOOL_NAME}</div>
          <div style={{ fontSize: 12, color: "#444", margin: "3px 0 6px" }}>{ADDRESS}</div>
          <span style={{ background: blue, color: "#fff", fontSize: 13, fontWeight: 700, padding: "3px 16px", borderRadius: 4, letterSpacing: 1 }}>
            FEE RECEIPT
          </span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: blue, width: 64, textAlign: "right" }}>
          {first}
          <br />
          {rest.join(" ")}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0 16px", margin: "12px 0", fontSize: 14, fontWeight: 700 }}>
        <span>Receipt No.: {payment.receiptNo}</span>
        <span>Date: {dateText(payment, "dd/MM/yyyy")}</span>
        <span>Session: {payment.session}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px", fontSize: 14, marginBottom: 12 }}>
        {details.map(([label, value]) => (
          <span key={label} style={{ color: "#555" }}>
            {label}: <b style={{ color: INK }}>{value}</b>
          </span>
        ))}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <tbody>
          <tr style={{ background: "#eaf0ff", fontWeight: 700 }}>
            <td style={{ ...cell, width: 50 }}>S.No.</td>
            <td style={cell}>Particulars</td>
            <td style={{ ...cell, textAlign: "right" }}>Amount</td>
          </tr>
          {payment.allocations.map((item, index) => (
            <tr key={item.lineId}>
              <td style={cell}>{index + 1}</td>
              <td style={cell}>{item.label}</td>
              <td style={{ ...cell, textAlign: "right" }}>{formatRupees(item.amount)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700, background: "#f6f8ff" }}>
            <td colSpan={2} style={{ ...cell, padding: "9px 10px" }}>Total</td>
            <td style={{ ...cell, padding: "9px 10px", textAlign: "right", fontSize: 16 }}>{formatRupees(payment.amount)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: 14, marginTop: 10, color: "#555" }}>
        In words: <b style={{ color: INK }}>{amountInWords(payment.amount)}</b>
        <br />
        Payment mode: <b style={{ color: INK }}>{modeText(payment)}</b>
      </div>
      <Note payment={payment} />
      <Signature payment={payment} style={{ fontSize: 14, color: "#555" }} />
    </div>
  );
}

/* ------------------------------------------------------------ I Minimal -- */

function MinimalReceipt({ payment, copyLabel }: ReceiptCopyProps) {
  const teal = "#0f766e";
  return (
    <div style={{ flex: 1, position: "relative", padding: "14px 22px", display: "flex", flexDirection: "column", borderLeft: `5px solid ${teal}`, background: "#fbfcfd", boxSizing: "border-box", color: INK, fontFamily: SANS }}>
      {payment.status === "cancelled" && <CancelledStamp />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Logo size={56} ring={teal} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{SCHOOL_DISPLAY_NAME}</div>
            <div style={{ fontSize: 11, color: MUTED, maxWidth: 360, lineHeight: 1.4 }}>{ADDRESS}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: teal }}>Fee Receipt</div>
          <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1, fontWeight: 600 }}>{copyLabel.toUpperCase()}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "16px 0 12px" }}>
        <Field label="Receipt no." value={payment.receiptNo} />
        <Field label="Date" value={dateText(payment, "dd MMM yyyy")} />
        <Field label="Session" value={payment.session} />
        <Field label="Student" value={payment.studentName} />
        <Field label="Class" value={classText(payment)} />
        <Field label="Admission no." value={payment.admissionNo || "-"} />
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>
        Father: <b style={{ color: INK }}>{payment.fatherName || "-"}</b>
      </div>

      <div style={{ borderTop: `2px solid ${INK}` }}>
        {payment.allocations.map((item) => (
          <div key={item.lineId} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #e6e8f0", fontSize: 15 }}>
            <span>{item.label}</span>
            <span>{formatRupees(item.amount)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#e6f4f1", borderRadius: 10, padding: "12px 16px", marginTop: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#0f5f58", fontWeight: 700, letterSpacing: 0.6 }}>
            AMOUNT RECEIVED · {modeText(payment).toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: "#334" }}>{amountInWords(payment.amount)}</div>
        </div>
        <b style={{ fontSize: 28, color: "#0f5f58" }}>{formatRupees(payment.amount)}</b>
      </div>
      <Note payment={payment} />
      <Signature payment={payment} />
    </div>
  );
}

/* ------------------------------------------------------------ J Balance -- */

function BalanceReceipt({ payment, copyLabel, balance }: ReceiptCopyProps) {
  const indigo = "#3b2f8f";
  const head: CSSProperties = { padding: "6px 10px", borderBottom: `2px solid ${INK}` };
  const cell: CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #dfe3ef" };
  const rows: [string, number, string][] = balance
    ? [
        ["Total fee (session)", balance.total, INK],
        ["Paid earlier", balance.paidEarlier, INK],
        ["This receipt", balance.thisReceipt, "#067647"],
        ["Balance due", balance.balance, "#b42318"],
      ]
    : [];
  return (
    <div style={{ flex: 1, position: "relative", border: "1px solid #c5cbe0", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", boxSizing: "border-box", color: INK, background: "#fff", fontFamily: SANS }}>
      {payment.status === "cancelled" && <CancelledStamp />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 18px", background: "#eef2ff", borderBottom: "1px solid #c5cbe0" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Logo size={52} ring={indigo} />
          <div>
            <b style={{ fontSize: 17, color: indigo }}>{SCHOOL_NAME}</b>
            <div style={{ fontSize: 11, color: "#444", maxWidth: 420 }}>{ADDRESS}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <b style={{ fontSize: 14 }}>FEE RECEIPT</b>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{copyLabel.toUpperCase()}</div>
        </div>
      </div>

      <div style={{ padding: "12px 18px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <Field label="Receipt no." value={payment.receiptNo} />
        <Field label="Date" value={dateText(payment, "dd/MM/yyyy")} />
        <Field label="Session" value={payment.session} />
        <Field label="Class" value={classText(payment)} />
        <Field label="Student" value={payment.studentName} />
        <Field label="Father" value={payment.fatherName || "-"} />
        <Field label="Adm. no." value={payment.admissionNo || "-"} />
        <Field label="Mode" value={modeText(payment)} />
      </div>

      <div style={{ padding: "0 18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            <tr style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6 }}>
              <td style={{ ...head, width: 40 }}>#</td>
              <td style={head}>Particulars</td>
              <td style={{ ...head, textAlign: "right" }}>Amount</td>
            </tr>
            {payment.allocations.map((item, index) => (
              <tr key={item.lineId}>
                <td style={{ ...cell, color: MUTED }}>{index + 1}</td>
                <td style={cell}>{item.label}</td>
                <td style={{ ...cell, textAlign: "right" }}>{formatRupees(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 16, padding: "12px 18px", alignItems: "flex-start" }}>
        <div style={{ flex: 1, fontSize: 13, color: MUTED }}>
          In words
          <div style={{ color: INK, fontWeight: 600, fontSize: 14 }}>{amountInWords(payment.amount)}</div>
          <Note payment={payment} />
        </div>
        {rows.length > 0 && (
          <div style={{ width: 230, background: "#f6f7fb", borderRadius: 10, padding: "10px 14px", flex: "none" }}>
            {rows.map(([label, value, color]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                <span style={{ color: MUTED }}>{label}</span>
                <b style={{ color }}>{formatRupees(value)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <Signature payment={payment} style={{ padding: "12px 18px 14px" }} />
    </div>
  );
}

/* ------------------------------------------------------- K Band + Stamp -- */

function BandReceipt({ payment, copyLabel }: ReceiptCopyProps) {
  const navy = "#1b2a5e";
  const cell: CSSProperties = { padding: "9px 12px" };
  return (
    <div style={{ flex: 1, position: "relative", borderRadius: 6, overflow: "hidden", border: `1px solid ${navy}`, display: "flex", flexDirection: "column", boxSizing: "border-box", color: INK, background: "#fff", fontFamily: SANS }}>
      {payment.status === "cancelled" && <CancelledStamp />}
      <div style={{ background: navy, color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <Logo size={56} ring="#fff" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{SCHOOL_NAME}</div>
          <div style={{ fontSize: 11, opacity: 0.92, marginTop: 2 }}>{ADDRESS}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700, letterSpacing: 1, flex: "none" }}>{copyLabel.toUpperCase()}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0 12px", padding: "10px 20px", background: "#e9edf8", fontSize: 14 }}>
        <b>FEE RECEIPT</b>
        <span>No. <b>{payment.receiptNo}</b></span>
        <span>Date <b>{dateText(payment, "dd/MM/yyyy")}</b></span>
        <span>Session <b>{payment.session}</b></span>
      </div>

      <div style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
        <Field label="Student" value={payment.studentName} />
        <Field label="Father's name" value={payment.fatherName || "-"} />
        <Field label="Class" value={classText(payment)} />
        <Field label="Admission no." value={payment.admissionNo || "-"} />
      </div>

      <div style={{ padding: "0 20px", position: "relative" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            <tr style={{ background: navy, color: "#fff", fontWeight: 600 }}>
              <td style={{ ...cell, width: 50 }}>S.No.</td>
              <td style={cell}>Particulars</td>
              <td style={{ ...cell, textAlign: "right" }}>Amount</td>
            </tr>
            {payment.allocations.map((item, index) => (
              <tr key={item.lineId} style={{ background: index % 2 === 0 ? "#f3f5fb" : "#fff" }}>
                <td style={cell}>{index + 1}</td>
                <td style={cell}>{item.label}</td>
                <td style={{ ...cell, textAlign: "right" }}>{formatRupees(item.amount)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, borderTop: `2px solid ${navy}` }}>
              <td colSpan={2} style={{ padding: "10px 12px" }}>Total received</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 18 }}>{formatRupees(payment.amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ padding: "10px 20px 0", fontSize: 13, color: MUTED }}>
        In words: <b style={{ color: INK }}>{amountInWords(payment.amount)}</b> · Mode:{" "}
        <b style={{ color: INK }}>{modeText(payment)}</b>
        <Note payment={payment} />
      </div>
      <Signature
        payment={payment}
        style={{ padding: "12px 20px 14px" }}
        middle={
          // On the white space of the footer, never over the band or the table.
          payment.status === "active" && (
            <div style={{ transform: "rotate(-12deg)", border: "3px solid #067647", color: "#067647", fontWeight: 700, fontSize: 26, letterSpacing: 4, padding: "2px 14px", borderRadius: 6, opacity: 0.85, marginBottom: 6 }}>
              PAID
            </div>
          )
        }
      />
    </div>
  );
}

const DESIGNS: Record<ReceiptDesign, (props: ReceiptCopyProps) => ReactNode> = {
  classic: ClassicReceipt,
  minimal: MinimalReceipt,
  balance: BalanceReceipt,
  band: BandReceipt,
};

/** One copy of the receipt in the chosen design. */
function ReceiptDesignCopy({ design, ...props }: ReceiptCopyProps & { design: ReceiptDesign }) {
  const Design = DESIGNS[design] ?? ClassicReceipt;
  return <Design {...props} />;
}

export default ReceiptDesignCopy;
