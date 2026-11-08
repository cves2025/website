/**
 * Draws an ID card from its design: each element at its place, size and
 * angle, filled with one person's data. The preview draws it in mm; the
 * designer draws the same card in pixels (at its zoom) and lays its
 * selection handles on top, so what is designed is what prints.
 */
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";

import schoolLogo from "../../../assets/image/schoolLogo.jpg";
import { ID_CARD_KIND_OPTIONS, SCHOOL_NAME } from "../../../constants";
import FitText from "../../../custom-components/FitText";
import { useStudentPhoto } from "../../../hooks/useStudentPhoto";
import { cardSize, scaleLayout, validityText } from "../../../utils/idCardSettings";
import type { SchoolSigns } from "../../../utils/idCardService";
import { spansFromEditable, spansToHtml } from "../../../utils/idCardRichText";
import type {
  IdCardElement,
  IdCardKind,
  IdCardSpan,
  IdCardLayout,
  IdCardPerson,
  IdCardSettings,
  IdCardTabSettings,
} from "../../../utils/type";

/** 1 pt in mm. */
const PT = 0.35278;

/** Marks the designer's text toolbar: typing goes on while it is used. */
export const RICH_TOOLBAR_ATTR = "data-rich-toolbar";

/** A text in parts, each with its own colour / bold / italic / underline. */
function Spans({ spans }: { spans: IdCardSpan[] }) {
  return (
    <>
      {spans.map((span, index) => (
        <span
          key={index}
          style={{
            color: span.color,
            fontWeight: span.bold === undefined ? undefined : span.bold ? 700 : 400,
            fontStyle: span.italic === undefined ? undefined : span.italic ? "italic" : "normal",
            textDecoration: span.underline === undefined ? undefined : span.underline ? "underline" : "none",
          }}
        >
          {span.text}
        </span>
      ))}
    </>
  );
}

/** Designer hooks: selection, dragging and typing straight on the card. */
export interface CardEditing {
  selected: ReadonlySet<string>;
  /** Text element being typed into. */
  typingId: string | null;
  onPointerDown: (id: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClick: (id: string) => void;
  /** Typing ended: the text and its letter-by-letter styles. */
  onTyped: (id: string, typed: { text: string; spans: IdCardSpan[] }) => void;
  /** Gives the designer each element's box (for the handles and guides). */
  register: (id: string, node: HTMLDivElement | null) => void;
}

interface CardFaceProps {
  layout: IdCardLayout;
  kind: IdCardKind;
  /** Field key -> text (validity and card title included). */
  values: Record<string, string>;
  photo: string;
  personName: string;
  code: string;
  signs: SchoolSigns;
  /** mm -> CSS length ("12mm" in the preview, pixels in the designer). */
  unit: (mm: number) => string;
  editing?: CardEditing;
}

export const fillOf = (element: Pick<IdCardElement, "fill" | "fill2" | "gradientAngle">) =>
  element.fill && element.fill2
    ? `linear-gradient(${element.gradientAngle}deg, ${element.fill}, ${element.fill2})`
    : element.fill || "transparent";

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase() || "?";

/** Dashed box with a word, for a picture the school has not uploaded yet. */
function Missing({ label }: { label: string }) {
  return (
    <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", border: "1px dashed #94a3b8", color: "#64748b", fontSize: "9px", textAlign: "center", boxSizing: "border-box" }}>
      {label}
    </span>
  );
}

function TextBody({
  element,
  content,
  unit,
  typing,
  onTyped,
}: {
  element: IdCardElement;
  content: ReactNode;
  unit: (mm: number) => string;
  typing: boolean;
  onTyped?: (typed: { text: string; spans: IdCardSpan[] }) => void;
}) {
  const style: CSSProperties = {
    fontFamily: element.fontFamily,
    fontSize: unit(element.fontSize * PT),
    fontWeight: element.bold ? 700 : 400,
    fontStyle: element.italic ? "italic" : "normal",
    textDecoration: element.underline ? "underline" : "none",
    textTransform: element.uppercase ? "uppercase" : "none",
    color: element.color,
    textAlign: element.align,
    lineHeight: element.lineHeight,
    letterSpacing: `${element.letterSpacing}em`,
    width: "100%",
    minWidth: 0,
  };
  if (typing) {
    return (
      <div
        contentEditable
        suppressContentEditableWarning
        data-rich-editable
        ref={(node) => {
          // Filled once (React does not own what is typed); all text picked.
          if (node && !node.dataset.ready) {
            node.dataset.ready = "1";
            node.innerHTML = spansToHtml(element.spans, element.text);
            node.focus();
            const range = document.createRange();
            range.selectNodeContents(node);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
          }
        }}
        onBlur={(event) => {
          // Using the colour / style toolbar is still typing.
          const to = event.relatedTarget as HTMLElement | null;
          if (to?.closest(`[${RICH_TOOLBAR_ATTR}]`)) return;
          onTyped?.(spansFromEditable(event.currentTarget));
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") event.currentTarget.blur();
        }}
        style={{ ...style, whiteSpace: "pre-wrap", outline: "none", cursor: "text" }}
      />
    );
  }
  if (element.overflow === "fit") {
    return (
      <div style={style}>
        <FitText className="block w-full" minScale={0.3}>
          {content}
        </FitText>
      </div>
    );
  }
  if (element.overflow === "cut") {
    return <div style={{ ...style, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{content}</div>;
  }
  return <div style={{ ...style, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{content}</div>;
}

export function CardFace({ layout, kind, values, photo, personName, code, signs, unit, editing }: CardFaceProps) {
  const boxes = layout.elements.map((element) => {
    if (element.hidden) return null;
    const isText = element.type === "text" || element.type === "field";
    let body: ReactNode = null;

    if (element.type === "text") {
      body = (
        <TextBody
          element={element}
          content={element.spans.length > 0 ? <Spans spans={element.spans} /> : element.text}
          unit={unit}
          typing={editing?.typingId === element.id}
          onTyped={(typed) => editing?.onTyped(element.id, typed)}
        />
      );
    } else if (element.type === "field") {
      const value = (values[element.field] ?? "").trim();
      // No data: the preview leaves it out, the designer shows where it goes.
      if (!value && !editing) return null;
      const content = value ? (
        <>
          {element.showLabel && element.label && (
            <span style={{ color: element.labelColor || element.color, fontWeight: 700, fontStyle: "normal" }}>
              {element.label}:{" "}
            </span>
          )}
          {value}
        </>
      ) : (
        <span style={{ opacity: 0.45, fontStyle: "italic" }}>{`{${element.label || element.name || element.field}}`}</span>
      );
      body = <TextBody element={element} content={content} unit={unit} typing={false} />;
    } else if (element.type === "photo") {
      body = photo ? (
        <img src={photo} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: element.fit, display: "block" }} />
      ) : (
        <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "#475569", fontWeight: 700, fontFamily: "Inter, sans-serif", fontSize: unit(Math.min(element.w, element.h) * 0.3) }}>
          {initialsOf(personName)}
        </span>
      );
    } else if (element.type === "logo") {
      // On a coloured / round box the whole logo sits inside it.
      body = (
        <img src={schoolLogo} alt="" draggable={false} style={{ width: element.fill ? "70%" : "100%", height: element.fill ? "70%" : "100%", objectFit: "contain", filter: "brightness(1.05)" }} />
      );
    } else if (element.type === "sign" || element.type === "stamp" || element.type === "image") {
      const src = element.type === "sign" ? signs.sign : element.type === "stamp" ? signs.stamp : element.src;
      body = src ? (
        <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: element.fit, display: "block" }} />
      ) : editing ? (
        <Missing label={element.type === "sign" ? "Principal's sign" : element.type === "stamp" ? "School stamp" : "Image"} />
      ) : null;
      if (!body) return null;
    } else if (element.type === "qr") {
      body = (
        <QRCodeSVG
          value={`${SCHOOL_NAME} | ${kind.toUpperCase()} | ${code} | ${personName}`}
          size={256}
          level="M"
          style={{ width: "88%", height: "88%" }}
        />
      );
    }

    const style: CSSProperties = {
      position: "absolute",
      left: unit(element.x),
      top: unit(element.y),
      width: unit(element.w),
      height: unit(element.h),
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      opacity: element.opacity,
      background: fillOf(element),
      border: element.stroke && element.strokeWidth > 0 ? `${unit(element.strokeWidth)} solid ${element.stroke}` : undefined,
      borderRadius: element.type === "ellipse" ? "50%" : unit(element.radius),
      overflow: isText ? "visible" : "hidden",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: isText ? "stretch" : "center",
      justifyContent: isText
        ? element.valign === "top"
          ? "flex-start"
          : element.valign === "bottom"
            ? "flex-end"
            : "center"
        : "center",
      cursor: editing ? (element.locked ? "default" : "move") : undefined,
      touchAction: editing ? "none" : undefined,
      userSelect: editing ? "none" : undefined,
    };
    return (
      <div
        key={element.id}
        ref={editing ? (node) => editing.register(element.id, node) : undefined}
        data-element-id={element.id}
        style={style}
        onPointerDown={editing ? (event) => editing.onPointerDown(element.id, event) : undefined}
        onDoubleClick={editing ? () => editing.onDoubleClick(element.id) : undefined}
      >
        {body}
      </div>
    );
  });

  return (
    <div
      style={{ position: "relative", width: unit(layout.width), height: unit(layout.height), overflow: editing ? "visible" : "hidden", background: "#ffffff", borderRadius: unit(Math.min(layout.width, layout.height) * 0.055), boxShadow: "0 0 0 0.2mm rgba(15,23,42,0.15)" }}
    >
      {/* The design clipped to the card; the designer shows what spills over faintly. */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }}>{boxes}</div>
    </div>
  );
}

/** Field values of a person on a tab's card: their data, validity and title. */
export function cardValues(person: IdCardPerson, tab: IdCardTabSettings, session: string): Record<string, string> {
  return {
    ...person.values,
    validTill: validityText(tab, session),
    cardTitle: ID_CARD_KIND_OPTIONS.find((option) => option.value === person.kind)?.title ?? "ID CARD",
  };
}

interface IdCardViewProps {
  person: IdCardPerson;
  tab: IdCardTabSettings;
  settings: Pick<IdCardSettings, "width" | "height">;
  /** Session the "End of session" validity is worked out from. */
  session: string;
  signs: SchoolSigns;
}

/** A person's card in the tab's printed orientation, at its real size. */
function IdCardView({ person, tab, settings, session, signs }: IdCardViewProps) {
  const size = cardSize(settings, tab.orientation);
  const layout = scaleLayout(tab[tab.orientation], size.width, size.height);
  // A student's photo may be on the master record (read once, cached).
  const studentPhoto = useStudentPhoto(person.kind === "student" ? person.id : "", person.photo);
  return (
    <CardFace
      layout={layout}
      kind={person.kind}
      values={cardValues(person, tab, session)}
      photo={person.kind === "student" ? studentPhoto : person.photo}
      personName={person.name}
      code={person.code}
      signs={signs}
      unit={(mm) => `${mm}mm`}
    />
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
