/**
 * The printed Transfer Certificate: one A4 page in the school's TC format
 * (letterhead, Scholar / Book / Sr. / TC No., 21 numbered Hindi + English
 * rows, QR code, three signatures and the note). Inline styles, so the
 * preview and the print look the same.
 */
import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";

import schoolLogo from "../../../../assets/image/schoolLogo1.png";
import { TC_DATE_FIELDS, TC_NAME_COLORS, TC_ROWS, TC_SCHOOL_ADDRESS } from "../../../../constants";
import { tcDateText, tcQrText } from "../../../../utils/transferCertificate";
import type { TcFields, TcSchoolDetails, TcStatus } from "../../../../utils/type";

export interface TcSheetProps {
  fields: TcFields;
  school: TcSchoolDetails;
  status: TcStatus | "new";
  tcNo: string;
  srNo: number;
  bookNo: string;
  /** Printed after the first copy: a DUPLICATE mark in the corner. */
  duplicate: boolean;
  signs: { sign: string; stamp: string };
}

const INK = "#111827";
const MUTED = "#4b5563";
/** Everything except the school name (Cancun). Hindi falls back to a Devanagari font. */
const FONT = "'Times New Roman', Times, 'Nirmala UI', 'Noto Serif Devanagari', Mangal, serif";
/** Rows (1-based) next to the QR code: their values keep clear of it. */
const QR_ROWS = new Set([11, 12, 13, 14, 15, 16, 17]);

const value = (fields: TcFields, key: keyof TcFields) =>
  TC_DATE_FIELDS.has(key) ? tcDateText(fields[key]) : fields[key];

function Label({ hi, en }: { hi: string; en: string }) {
  // Short labels on one line ("पता / Address"), long ones on two.
  if (hi.length + en.length < 46) {
    return (
      <span>
        {hi} / {en}
      </span>
    );
  }
  return (
    <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
      <span>{hi}</span>
      <span style={{ fontSize: 12 }}>{en}</span>
    </span>
  );
}

function Row({
  no,
  label,
  children,
  roomForQr,
}: {
  no: string;
  label: ReactNode;
  children: ReactNode;
  roomForQr: boolean;
}) {
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "9mm minmax(0,1fr) 4mm 92mm", alignItems: "center", padding: "0.3mm 0", fontSize: 13 }}
    >
      <span style={{ alignSelf: "start", paddingTop: 1 }}>{no}</span>
      <span>{label}</span>
      <span style={{ fontWeight: 700 }}>:</span>
      <span style={{ fontWeight: 600, textTransform: "none", paddingRight: roomForQr ? "36mm" : 0, overflowWrap: "anywhere" }}>
        {children}
      </span>
    </div>
  );
}

function Stamp({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 3 }}>
      <span
        style={{ transform: "rotate(-24deg)", border: `5px solid ${color}`, borderRadius: 8, padding: "6px 30px", fontSize: 72, fontWeight: 800, letterSpacing: 10, color, opacity: 0.35, fontFamily: FONT }}
      >
        {text}
      </span>
    </div>
  );
}

function Signature({ label, name, children }: { label: string; name: string; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", textAlign: "center", position: "relative", minHeight: "20mm" }}>
      {children}
      {name && <div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div>}
      <div style={{ fontSize: 13 }}>{label}</div>
    </div>
  );
}

const box: CSSProperties = { border: `1.5px solid ${INK}` };

const NAME_MAX_PX = 30;

/**
 * The school name on one line, in the Cancun font, each word in a school
 * colour. The font shrinks when the name is wider than its box.
 */
function SchoolName({ words }: { words: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(NAME_MAX_PX);
  const text = words.join(" ");

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      // Measured at the largest size; scrollWidth / clientWidth do not
      // change with a CSS transform, so the preview scale does not matter.
      element.style.fontSize = `${NAME_MAX_PX}px`;
      const ratio = element.clientWidth / Math.max(1, element.scrollWidth);
      const next = ratio < 1 ? Math.floor(NAME_MAX_PX * ratio * 10) / 10 : NAME_MAX_PX;
      element.style.fontSize = `${next}px`;
      setSize(next);
    };
    fit();
    // Cancun loads late: fit again once it is ready.
    document.fonts?.ready.then(fit).catch(() => undefined);
  }, [text]);

  return (
    <div
      ref={ref}
      style={{ fontFamily: "Cancun, " + FONT, fontSize: size, letterSpacing: 0.3, textTransform: "uppercase", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden" }}
    >
      {words.map((word, index) => (
        <span key={index} style={{ color: TC_NAME_COLORS[index % TC_NAME_COLORS.length] }}>
          {index > 0 ? " " : ""}
          {word}
        </span>
      ))}
    </div>
  );
}

export function TcSheet({ fields, school, status, tcNo, srNo, bookNo, duplicate, signs }: TcSheetProps) {
  const nameWords = school.schoolName.trim().split(/\s+/).filter(Boolean);
  const contact = [
    school.email && `E-Mail : ${school.email}`,
    school.website && `Website : ${school.website}`,
    !school.email && !school.website && school.phone && `Phone : ${school.phone}`,
  ].filter(Boolean);
  const issued = status === "issued" || status === "cancelled";

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, color: INK, fontFamily: FONT }}>
      {status === "cancelled" && <Stamp text="CANCELLED" color="#dc2626" />}
      {(status === "draft" || status === "new") && <Stamp text="DRAFT" color="#9ca3af" />}
      {duplicate && status === "issued" && (
        <div style={{ position: "absolute", top: "-6mm", right: 0, border: "1.5px solid #b91c1c", color: "#b91c1c", padding: "1px 10px", fontSize: 12, fontWeight: 800, letterSpacing: 3 }}>
          DUPLICATE
        </div>
      )}

      {/* Grows to fill the page; the spare height spreads between the rows. */}
      <div style={{ ...box, display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Affiliation No. (left) and U-DISE Code (right) at the top */}
        {(school.affiliationNo || school.udiseCode) && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: "4mm", padding: "2mm 3mm 0", fontSize: 12.5, fontWeight: 700 }}>
            <span>{school.affiliationNo && `Affiliation No. : ${school.affiliationNo}`}</span>
            <span>{school.udiseCode && `U-DISE Code : ${school.udiseCode}`}</span>
          </div>
        )}

        {/* Letterhead */}
        <div style={{ display: "grid", gridTemplateColumns: "28mm minmax(0,1fr) 10mm", alignItems: "center", padding: "2mm 3mm 2mm" }}>
          <img src={schoolLogo} alt="School logo" style={{ width: "26mm", height: "26mm", objectFit: "contain" }} />
          <div style={{ textAlign: "center", lineHeight: 1.35 }}>
            <SchoolName words={nameWords} />
            {school.affiliationText && <div style={{ fontSize: 15, fontStyle: "italic" }}>{school.affiliationText}</div>}
            {school.schoolCode && <div style={{ fontSize: 12.5, fontWeight: 600 }}>School Code : {school.schoolCode}</div>}
            <div style={{ fontSize: 17, fontWeight: 700 }}>{TC_SCHOOL_ADDRESS}</div>
            {contact.length > 0 && <div style={{ fontSize: 14.5, fontWeight: 600 }}>{contact.join(", ")}</div>}
          </div>
          <span />
        </div>

        <div style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, textAlign: "center", fontSize: 16, fontWeight: 800, padding: "1.5mm 0" }}>
          स्थानान्तरण प्रमाण-पत्र / TRANSFER CERTIFICATE
        </div>

        {/* Numbers */}
        <div style={{ padding: "2mm 3mm", fontSize: 12.5, fontWeight: 700, borderBottom: `1.5px solid ${INK}` }}>
          {/* Two lines: Scholar / Book / Sr. No., then P.E.N. / TC No. */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)", columnGap: "4mm", lineHeight: 1.7 }}>
            <span>प्रवेश सं. / Scholar No. : {fields.scholarNo}</span>
            <span>पुस्तक सं. / Book No. : {issued ? bookNo : ""}</span>
            <span>क्र.सं. / Sr. No. : {issued && srNo ? srNo : ""}</span>
            <span>P.E.N. : {fields.pen}</span>
            <span style={{ gridColumn: "span 2" }}>TC No. : {issued ? tcNo : ""}</span>
          </div>
          {fields.registrationNo && (
            <div style={{ marginTop: "1.5mm" }}>
              Registration no. of candidate (in case class IX to XII) : {fields.registrationNo}
            </div>
          )}
        </div>

        {/* The 21 rows */}
        <div style={{ position: "relative", padding: "2mm 4mm 3mm", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {TC_ROWS.map((row, index) => {
            const no = index + 1;
            const roomForQr = school.showQr && QR_ROWS.has(no);
            return (
              <div key={row.field} style={{ position: "relative" }}>
                {school.showQr && no === 11 && (
                  <div style={{ position: "absolute", right: "1mm", top: "1mm", zIndex: 1, background: "#fff", padding: 2 }}>
                    <QRCodeSVG value={tcQrText({ tcNo: issued ? tcNo : "", fields }, school.schoolName)} size={118} level="M" />
                  </div>
                )}
                <Row no={`${no}.`} label={<Label hi={row.hi} en={row.en} />} roomForQr={roomForQr}>
                  {row.extra ? (
                    row.field === "dob" ? (
                      <span style={{ display: "flex", flexDirection: "column" }}>
                        <span>{value(fields, row.field)}</span>
                        <span style={{ fontSize: 12.5 }}>{fields[row.extra]}</span>
                      </span>
                    ) : (
                      <span style={{ display: "flex", flexWrap: "wrap", columnGap: "8mm" }}>
                        <span>{value(fields, row.field)}</span>
                        <span>{fields[row.extra]}</span>
                      </span>
                    )
                  ) : (
                    value(fields, row.field)
                  )}
                </Row>
                {row.sub && (
                  <Row no="" label={<Label hi={row.sub.hi} en={row.sub.en} />} roomForQr={false}>
                    {value(fields, row.sub.field)}
                  </Row>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "6mm", marginTop: "8mm" }}>
        <Signature label="तैयारकर्ता / Prepared By" name={fields.preparedBy}>
          <div style={{ fontSize: 11, color: MUTED, fontStyle: "italic", order: 2 }}>(name &amp; designation)</div>
        </Signature>
        <Signature label="जांचकर्ता / Checked By" name={fields.checkedBy}>
          <div style={{ fontSize: 11, color: MUTED, fontStyle: "italic", order: 2 }}>(name &amp; designation)</div>
        </Signature>
        <Signature label="ह० प्रधानाचार्य / कार्यालय मोहर" name="">
          {school.principalSign && (signs.stamp || signs.sign) && (
            <div style={{ position: "relative", height: "20mm", width: "100%", display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
              {signs.stamp && (
                <img src={signs.stamp} alt="" style={{ position: "absolute", height: "22mm", right: "4mm", bottom: 0, objectFit: "contain", opacity: 0.85 }} />
              )}
              {signs.sign && <img src={signs.sign} alt="" style={{ height: "12mm", objectFit: "contain", position: "relative" }} />}
            </div>
          )}
          <div style={{ fontSize: 12, fontStyle: "italic", order: 2 }}>Sign of Principal with official seal</div>
        </Signature>
      </div>

      {school.note && (
        <div style={{ marginTop: "3mm", textAlign: "center", fontSize: 11.5, lineHeight: 1.45, whiteSpace: "pre-line" }}>
          {school.note}
        </div>
      )}
    </div>
  );
}

/**
 * One A4 page (210 x 296 mm) with the sheet inside 10 mm margins. Content
 * taller than the page is scaled down, so a TC is always one page.
 */
export function TcPage(props: TcSheetProps) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const measure = () => {
      const next = Math.min(1, box.clientHeight / Math.max(1, content.offsetHeight));
      // Ignore sub-pixel changes so the page never flickers.
      setScale((current) => (Math.abs(current - next) < 0.002 ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    // 8 mm margin at the top / bottom, 7 mm at the sides; the sheet fills the rest.
    <div className="h-[296mm] w-[210mm] shrink-0 bg-white px-[7mm] py-[8mm] shadow-lg print:shadow-none">
      <div ref={outer} className="h-full overflow-hidden">
        <div
          ref={inner}
          className="flex min-h-full origin-top flex-col"
          // Only a transform: the width stays the same, so the measured
          // height does not change with the scale (no back-and-forth loop).
          style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
        >
          <TcSheet {...props} />
        </div>
      </div>
    </div>
  );
}

/**
 * Screen preview: the A4 page scaled to the width it is given. Printing
 * shows the page at its real size.
 */
export function TcPreview(props: TcSheetProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = frame.current;
    if (!box) return;
    // 210 mm at 96 dpi = 793.7 px.
    // Fills the whole width of the parent (bigger or smaller than A4).
    const measure = () => setScale(box.clientWidth / 794);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} className="w-full print:w-auto" style={{ ["--tc-scale" as string]: scale }}>
      <div className="h-[calc(296mm*var(--tc-scale))] overflow-hidden print:h-auto print:overflow-visible">
        <div className="origin-top-left [transform:scale(var(--tc-scale))] print:[transform:none]">
          <TcPage {...props} />
        </div>
      </div>
    </div>
  );
}

export default TcPreview;
