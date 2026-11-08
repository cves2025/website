/**
 * One ID card, drawn at its real size in mm. Four templates (Classic,
 * Modern, Premium, Vibrant), each horizontal or vertical. Everything is
 * sized for a standard card and multiplied by the card's scale, so a card
 * of another size keeps the same layout; the fields follow the admin's
 * order, look and overflow choice.
 */
import type { CSSProperties, ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";

import schoolLogo from "../../../assets/image/schoolLogo.jpg";
import { ID_CARD_KIND_OPTIONS, SCHOOL_CONTACT, SCHOOL_NAME } from "../../../constants";
import FitText from "../../../custom-components/FitText";
import { useStudentPhoto } from "../../../hooks/useStudentPhoto";
import { cardScale, cardSize, validityText } from "../../../utils/idCardSettings";
import type { SchoolSigns } from "../../../utils/idCardService";
import type {
  IdCardDesign,
  IdCardField,
  IdCardPerson,
  IdCardSettings,
  IdCardTabSettings,
} from "../../../utils/type";

/** Colours and shapes of a template. */
interface Theme {
  card: string;
  text: string;
  label: string;
  header: string;
  headerText: string;
  accent: string;
  /** Title chip ("STUDENT ID CARD"). */
  chip: string;
  chipText: string;
  photo: "rect" | "round" | "rounded";
  photoRing: string;
  band: string;
  /** Modern: a strip down the left of a horizontal card. */
  sideStrip?: boolean;
}

const THEMES: Record<IdCardDesign, Theme> = {
  classic: {
    card: "#ffffff",
    text: "#111827",
    label: "#1e3a8a",
    header: "linear-gradient(180deg,#1e3a8a,#2563eb)",
    headerText: "#ffffff",
    accent: "#1e40af",
    chip: "#ffffff",
    chipText: "#1e3a8a",
    photo: "rect",
    photoRing: "#1e40af",
    band: "linear-gradient(90deg,#1e3a8a,#2563eb)",
  },
  modern: {
    card: "#ffffff",
    text: "#111827",
    label: "#15803d",
    header: "#ffffff",
    headerText: "#166534",
    accent: "#16a34a",
    chip: "#16a34a",
    chipText: "#ffffff",
    photo: "round",
    photoRing: "#16a34a",
    band: "linear-gradient(90deg,#16a34a,#34d399)",
    sideStrip: true,
  },
  premium: {
    card: "linear-gradient(160deg,#0f172a,#1e293b)",
    text: "#f8fafc",
    label: "#d4af37",
    header: "transparent",
    headerText: "#d4af37",
    accent: "#d4af37",
    chip: "#d4af37",
    chipText: "#0f172a",
    photo: "rounded",
    photoRing: "#d4af37",
    band: "linear-gradient(90deg,#b8860b,#f5d76e,#b8860b)",
  },
  vibrant: {
    card: "#ffffff",
    text: "#111827",
    label: "#be185d",
    header: "linear-gradient(120deg,#ec4899,#ef4444,#f59e0b)",
    headerText: "#ffffff",
    accent: "#ec4899",
    chip: "#ffffff",
    chipText: "#be185d",
    photo: "rounded",
    photoRing: "#f59e0b",
    band: "linear-gradient(90deg,#ec4899,#f59e0b)",
  },
};

interface IdCardViewProps {
  person: IdCardPerson;
  tab: IdCardTabSettings;
  settings: Pick<IdCardSettings, "width" | "height">;
  /** Session the "End of session" validity is worked out from. */
  session: string;
  signs: SchoolSigns;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase() || "?";

/** One line of information in the admin's style. */
function FieldLine({
  field,
  value,
  k,
  align,
  theme,
}: {
  field: IdCardField;
  value: string;
  k: number;
  align: "left" | "center" | "right";
  theme: Theme;
}) {
  const style: CSSProperties = {
    fontSize: `${Number(field.size) * k}pt`,
    fontWeight: field.bold ? 700 : 500,
    fontStyle: field.italic ? "italic" : "normal",
    textDecoration: field.underline ? "underline" : "none",
    textTransform: field.uppercase ? "uppercase" : "none",
    color: field.color || theme.text,
    textAlign: field.align === "auto" ? align : field.align,
    lineHeight: 1.2,
    minWidth: 0,
  };
  const content = (
    <>
      {field.showLabel && field.label && (
        <span style={{ color: field.color || theme.label, fontWeight: 700, fontStyle: "normal" }}>
          {field.label}:{" "}
        </span>
      )}
      {value}
    </>
  );
  if (field.overflow === "fit") {
    return (
      <div style={style}>
        <FitText className="block w-full" minScale={0.4}>
          {content}
        </FitText>
      </div>
    );
  }
  if (field.overflow === "cut") {
    return <div style={{ ...style, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{content}</div>;
  }
  return <div style={{ ...style, overflowWrap: "anywhere" }}>{content}</div>;
}

/** The school logo in a white circle (the whole logo stays inside it). */
function Logo({ size, ring }: { size: string; ring: string }) {
  return (
    <span
      style={{ width: size, height: size, flex: "none", borderRadius: "50%", background: "#fff", border: `0.3mm solid ${ring}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}
    >
      <img src={schoolLogo} alt="" style={{ width: "70%", height: "70%", objectFit: "contain", filter: "brightness(1.05)" }} />
    </span>
  );
}

function Photo({ url, name, theme, width, height }: { url: string; name: string; theme: Theme; width: string; height: string }) {
  const radius = theme.photo === "round" ? "50%" : theme.photo === "rounded" ? "12%" : "4%";
  return (
    <div
      style={{ width, height, flex: "none", borderRadius: radius, border: `0.5mm solid ${theme.photoRing}`, overflow: "hidden", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontWeight: 700, boxSizing: "border-box" }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: `calc(${height} * 0.35)` }}>{initialsOf(name)}</span>
      )}
    </div>
  );
}

/** QR code and / or the principal's signature (with the stamp behind it). */
function Extras({
  person,
  tab,
  signs,
  k,
  theme,
  stacked,
}: {
  person: IdCardPerson;
  tab: IdCardTabSettings;
  signs: SchoolSigns;
  k: number;
  theme: Theme;
  /** QR above the signature (horizontal) instead of side by side. */
  stacked: boolean;
}) {
  const mm = (value: number) => `${value * k}mm`;
  const showSign = tab.showSign || tab.showStamp;
  if (!tab.showQr && !showSign) return null;
  return (
    <div
      style={{ display: "flex", flexDirection: stacked ? "column" : "row", alignItems: stacked ? "center" : "flex-end", justifyContent: stacked ? "space-between" : "space-between", gap: mm(1), height: stacked ? "100%" : undefined }}
    >
      {tab.showQr ? (
        <span style={{ background: "#fff", padding: mm(0.6), borderRadius: mm(0.8), display: "flex" }}>
          <QRCodeSVG
            value={`${SCHOOL_NAME} | ${person.kind.toUpperCase()} | ${person.code} | ${person.name}`}
            size={256}
            level="M"
            style={{ width: mm(stacked ? 11 : 10), height: mm(stacked ? 11 : 10) }}
          />
        </span>
      ) : (
        <span />
      )}
      {showSign && (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", minWidth: mm(14) }}>
          {tab.showStamp && signs.stamp && (
            <img src={signs.stamp} alt="" style={{ position: "absolute", bottom: mm(1.5), height: mm(8), opacity: 0.55 }} />
          )}
          {tab.showSign && signs.sign ? (
            <img src={signs.sign} alt="" style={{ position: "relative", height: mm(5.5), maxWidth: mm(18), objectFit: "contain" }} />
          ) : (
            <span style={{ height: mm(5.5) }} />
          )}
          <span style={{ position: "relative", borderTop: `0.2mm solid ${theme.text}`, padding: `${mm(0.3)} ${mm(1.5)} 0`, fontSize: `${4.5 * k}pt`, fontWeight: 600, color: theme.text }}>
            Principal
          </span>
        </div>
      )}
    </div>
  );
}

function IdCardView({ person, tab, settings, session, signs }: IdCardViewProps) {
  const theme = THEMES[tab.design] ?? THEMES.classic;
  const vertical = tab.orientation === "vertical";
  const size = cardSize(settings, tab.orientation);
  const k = cardScale(size, tab.orientation);
  const mm = (value: number) => `${value * k}mm`;
  const pt = (value: number) => `${value * k}pt`;
  const title = ID_CARD_KIND_OPTIONS.find((option) => option.value === person.kind)?.title ?? "ID CARD";
  // A student's photo may be on the master record (read once, cached).
  const studentPhoto = useStudentPhoto(person.kind === "student" ? person.id : "", person.photo);
  const photo = person.kind === "student" ? studentPhoto : person.photo;

  const values: Record<string, string> = { ...person.values, validTill: validityText(tab, session) };
  const lines = tab.fields
    .filter((field) => field.show && (values[field.key] ?? "").trim() !== "")
    .map((field) => (
      <FieldLine
        key={field.key}
        field={field}
        value={values[field.key]}
        k={k}
        align={vertical ? "center" : "left"}
        theme={theme}
      />
    ));

  const header = (
    <div
      style={{ background: theme.header, color: theme.headerText, display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: mm(vertical ? 0.8 : 1.5), padding: vertical ? `${mm(2)} ${mm(2)} ${mm(1.5)}` : `${mm(1.5)} ${mm(2.5)}`, textAlign: vertical ? "center" : "left", borderBottom: tab.design === "premium" ? `0.3mm solid ${theme.accent}` : undefined, borderRadius: tab.design === "vibrant" ? `0 0 ${mm(5)} ${mm(5)}` : undefined }}
    >
      <Logo size={mm(vertical ? 9 : 8.5)} ring={theme.accent} />
      <div style={{ minWidth: 0, flex: vertical ? undefined : 1, width: vertical ? "100%" : undefined }}>
        <div style={{ fontSize: pt(vertical ? 7 : 7.5), fontWeight: 800, lineHeight: 1.1, letterSpacing: "0.02em" }}>
          {vertical ? SCHOOL_NAME : <FitText className="block w-full" minScale={0.5}>{SCHOOL_NAME}</FitText>}
        </div>
        <div style={{ fontSize: pt(4.2), opacity: 0.9, lineHeight: 1.2, marginTop: mm(0.4) }}>
          <FitText className="block w-full" minScale={0.4}>{SCHOOL_CONTACT.ADDRESS}</FitText>
        </div>
        <span style={{ display: "inline-block", marginTop: mm(0.8), background: theme.chip, color: theme.chipText, fontSize: pt(4.5), fontWeight: 800, letterSpacing: "0.08em", padding: `${mm(0.3)} ${mm(2)}`, borderRadius: mm(1) }}>
          {title}
        </span>
      </div>
    </div>
  );

  const band = <div style={{ height: mm(2), background: theme.band, flex: "none" }} />;
  const root: CSSProperties = {
    width: `${size.width}mm`,
    height: `${size.height}mm`,
    background: theme.card,
    color: theme.text,
    borderRadius: mm(3),
    overflow: "hidden",
    display: "flex",
    flexDirection: vertical ? "column" : "row",
    fontFamily: "Inter, system-ui, sans-serif",
    boxSizing: "border-box",
    boxShadow: "0 0 0 0.2mm rgba(15,23,42,0.15)",
    position: "relative",
  };

  if (vertical) {
    return (
      <div style={root}>
        {theme.sideStrip && <div style={{ height: mm(2.5), background: theme.band, flex: "none" }} />}
        {header}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: mm(1.2), padding: `${mm(2)} ${mm(3)} ${mm(1.5)}` }}>
          {tab.showPhoto && (
            <Photo url={photo} name={person.name} theme={theme} width={mm(theme.photo === "round" ? 21 : 19)} height={mm(theme.photo === "round" ? 21 : 23)} />
          )}
          <div style={{ width: "100%", minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: mm(0.5), overflow: "hidden" }}>
            {lines}
          </div>
          <div style={{ width: "100%" }}>
            <Extras person={person} tab={tab} signs={signs} k={k} theme={theme} stacked={false} />
          </div>
        </div>
        {band}
      </div>
    );
  }

  return (
    <div style={root}>
      {theme.sideStrip && (
        // Modern: the title runs up a strip on the left.
        <div style={{ width: mm(6), background: theme.band, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ transform: "rotate(-90deg)", whiteSpace: "nowrap", color: "#fff", fontWeight: 800, fontSize: pt(5), letterSpacing: "0.15em" }}>
            {person.kind.toUpperCase()}
          </span>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {header}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: mm(2), padding: `${mm(2)} ${mm(2.5)}`, alignItems: "stretch" }}>
          {tab.showPhoto && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <Photo url={photo} name={person.name} theme={theme} width={mm(theme.photo === "round" ? 19 : 17)} height={mm(theme.photo === "round" ? 19 : 21)} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: mm(0.5), overflow: "hidden" }}>
            {lines}
          </div>
          {(tab.showQr || tab.showSign || tab.showStamp) && (
            <div style={{ flex: "none" }}>
              <Extras person={person} tab={tab} signs={signs} k={k} theme={theme} stacked />
            </div>
          )}
        </div>
        {band}
      </div>
    </div>
  );
}

export default IdCardView;

/** A card with its caption (the person's name) under it. */
export function CardFrame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="flex flex-col items-center gap-1.5">
      {children}
      {caption && <figcaption className="max-w-full truncate text-xs text-gray-500">{caption}</figcaption>}
    </figure>
  );
}
