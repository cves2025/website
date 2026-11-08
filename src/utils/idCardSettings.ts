/** ID card settings: defaults, reading a saved document, sizes. Pure. */
import { format } from "date-fns";

import {
  ID_CARD_ALIGN_OPTIONS,
  ID_CARD_COMMON_FIELDS,
  ID_CARD_DESIGN_OPTIONS,
  ID_CARD_FIELD_KEYS,
  ID_CARD_FIT_OPTIONS,
  ID_CARD_KIND_OPTIONS,
  ID_CARD_ORIENTATION_OPTIONS,
  ID_CARD_OVERFLOW_OPTIONS,
  ID_CARD_SIZE_LIMITS,
  ID_CARD_STANDARD_SIZE,
  ID_CARD_VALIGN_OPTIONS,
  ID_CARD_VALIDITY_OPTIONS,
} from "../constants";
import { fromDateKey } from "./holidayCalendar";
import { makeElement, newElementId, templateLayout } from "./idCardTemplates";
import type {
  IdCardDesign,
  IdCardElement,
  IdCardKind,
  IdCardLayout,
  IdCardOrientation,
  IdCardSettings,
  IdCardSpan,
  IdCardTabSettings,
} from "./type";

const ELEMENT_TYPES: IdCardElement["type"][] = [
  "text", "field", "photo", "logo", "sign", "stamp", "qr", "image", "rect", "ellipse",
];

/** Fields a tab's cards can show: its own and the common ones. */
export const idCardFields = (kind: IdCardKind): [string, string][] => [
  ...ID_CARD_FIELD_KEYS[kind],
  ...ID_CARD_COMMON_FIELDS,
];

export function defaultTab(kind: IdCardKind, design: IdCardDesign = "classic"): IdCardTabSettings {
  return {
    orientation: kind === "student" ? "vertical" : "horizontal",
    horizontal: templateLayout(design, "horizontal", kind),
    vertical: templateLayout(design, "vertical", kind),
    validity: { mode: kind === "student" ? "session" : "none", date: "" },
  };
}

export function defaultIdCardSettings(): IdCardSettings {
  return {
    ...ID_CARD_STANDARD_SIZE,
    tabs: {
      student: defaultTab("student"),
      teacher: defaultTab("teacher"),
      staff: defaultTab("staff"),
      admin: defaultTab("admin"),
    },
  };
}

const oneOf = <T extends string>(options: { value: T }[], value: unknown, fallback: T): T =>
  options.find((option) => option.value === value)?.value ?? fallback;

const toNumber = (value: unknown, fallback: number, min = -Infinity, max = Infinity) => {
  const number = typeof value === "string" && value.trim() === "" ? NaN : Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

/**
 * Styled parts of a text. Only styles that are set are kept (Firestore
 * takes no undefined values); parts that look the same are joined.
 */
export function readSpans(raw: unknown): IdCardSpan[] {
  if (!Array.isArray(raw)) return [];
  const spans: IdCardSpan[] = [];
  raw.map(record).forEach((item) => {
    const part = text(item.text);
    if (!part) return;
    const span: IdCardSpan = { text: part };
    if (typeof item.color === "string" && item.color) span.color = item.color;
    (["bold", "italic", "underline"] as const).forEach((key) => {
      if (typeof item[key] === "boolean") span[key] = item[key] as boolean;
    });
    const last = spans[spans.length - 1];
    const same =
      last &&
      last.color === span.color &&
      last.bold === span.bold &&
      last.italic === span.italic &&
      last.underline === span.underline;
    if (same) last.text += span.text;
    else spans.push(span);
  });
  // Nothing styled at all: plain text does the same.
  return spans.every((span) => Object.keys(span).length === 1) ? [] : spans;
}

/** One element from Firestore (or the designer's form), every value checked. */
export function readElement(raw: unknown): IdCardElement | null {
  const data = record(raw);
  const type = ELEMENT_TYPES.find((item) => item === data.type);
  if (!type) return null;
  const base = makeElement(type);
  return {
    id: text(data.id) || newElementId(),
    type,
    name: text(data.name, base.name),
    x: toNumber(data.x, 0, -500, 500),
    y: toNumber(data.y, 0, -500, 500),
    w: toNumber(data.w, base.w, 0.1, 1000),
    h: toNumber(data.h, base.h, 0.1, 1000),
    rotation: toNumber(data.rotation, 0, -360, 360),
    locked: flag(data.locked, false),
    hidden: flag(data.hidden, false),
    opacity: toNumber(data.opacity, 1, 0, 1),
    text: text(data.text),
    spans: readSpans(data.spans),
    field: text(data.field),
    label: text(data.label),
    showLabel: flag(data.showLabel, false),
    fontFamily: text(data.fontFamily, base.fontFamily) || base.fontFamily,
    fontSize: toNumber(data.fontSize, base.fontSize, 1, 200),
    bold: flag(data.bold, false),
    italic: flag(data.italic, false),
    underline: flag(data.underline, false),
    uppercase: flag(data.uppercase, false),
    color: text(data.color, base.color),
    labelColor: text(data.labelColor),
    align: oneOf(ID_CARD_ALIGN_OPTIONS, data.align, base.align),
    valign: oneOf(ID_CARD_VALIGN_OPTIONS, data.valign, base.valign),
    overflow: oneOf(ID_CARD_OVERFLOW_OPTIONS, data.overflow, base.overflow),
    lineHeight: toNumber(data.lineHeight, base.lineHeight, 0.5, 4),
    letterSpacing: toNumber(data.letterSpacing, 0, -0.5, 2),
    fill: text(data.fill),
    fill2: text(data.fill2),
    gradientAngle: toNumber(data.gradientAngle, base.gradientAngle, -360, 360),
    stroke: text(data.stroke),
    strokeWidth: toNumber(data.strokeWidth, 0, 0, 50),
    radius: toNumber(data.radius, 0, 0, 500),
    src: text(data.src),
    fit: oneOf(ID_CARD_FIT_OPTIONS, data.fit, base.fit),
  };
}

function readLayout(raw: unknown, fallback: IdCardLayout): IdCardLayout {
  const data = record(raw);
  if (!Array.isArray(data.elements)) return fallback;
  return {
    width: toNumber(data.width, fallback.width, 1, 1000),
    height: toNumber(data.height, fallback.height, 1, 1000),
    elements: data.elements.map(readElement).filter((item): item is IdCardElement => item !== null),
  };
}

function readTab(kind: IdCardKind, raw: unknown): IdCardTabSettings {
  const data = record(raw);
  // Settings saved before the designer only named a template.
  const design = oneOf(ID_CARD_DESIGN_OPTIONS, data.design, "classic");
  const fallback = defaultTab(kind, design);
  const validity = record(data.validity);
  return {
    orientation: oneOf(ID_CARD_ORIENTATION_OPTIONS, data.orientation, fallback.orientation),
    horizontal: readLayout(data.horizontal, fallback.horizontal),
    vertical: readLayout(data.vertical, fallback.vertical),
    validity: {
      mode: oneOf(ID_CARD_VALIDITY_OPTIONS, validity.mode, fallback.validity.mode),
      date: text(validity.date),
    },
  };
}

/** The `settings/idCard` document, with defaults for anything missing. */
export function readIdCardSettings(raw: unknown): IdCardSettings {
  const data = record(raw);
  const { min, max } = ID_CARD_SIZE_LIMITS;
  const tabs = record(data.tabs);
  return {
    width: toNumber(data.width, ID_CARD_STANDARD_SIZE.width, min, max),
    height: toNumber(data.height, ID_CARD_STANDARD_SIZE.height, min, max),
    tabs: Object.fromEntries(
      ID_CARD_KIND_OPTIONS.map(({ value }) => [value, readTab(value, tabs[value])])
    ) as Record<IdCardKind, IdCardTabSettings>,
  };
}

/** A copy of a layout for another tab: data it does not have is left out. */
function layoutFor(layout: IdCardLayout, kind: IdCardKind): IdCardLayout {
  const keys = new Set(idCardFields(kind).map(([key]) => key));
  return {
    ...layout,
    elements: layout.elements
      .filter((element) => element.type !== "field" || keys.has(element.field))
      .map((element) => ({ ...element, id: newElementId() })),
  };
}

/**
 * "Apply to all tabs": both designs, the orientation and the validity of
 * `from` go to every tab. A field the other tab has no data for (Class on
 * a teacher's card) is left off there.
 */
export function applyTabToAll(settings: IdCardSettings, from: IdCardKind): IdCardSettings {
  const source = settings.tabs[from];
  const tabs = Object.fromEntries(
    ID_CARD_KIND_OPTIONS.map(({ value }) => [
      value,
      value === from
        ? source
        : {
            ...source,
            horizontal: layoutFor(source.horizontal, value),
            vertical: layoutFor(source.vertical, value),
          },
    ])
  ) as Record<IdCardKind, IdCardTabSettings>;
  return { ...settings, tabs };
}

/** Card size in mm for an orientation (a vertical card turns the sides round). */
export function cardSize(settings: Pick<IdCardSettings, "width" | "height">, orientation: IdCardOrientation) {
  const { min, max } = ID_CARD_SIZE_LIMITS;
  const a = toNumber(settings.width, ID_CARD_STANDARD_SIZE.width, min, max);
  const b = toNumber(settings.height, ID_CARD_STANDARD_SIZE.height, min, max);
  const long = Math.max(a, b);
  const short = Math.min(a, b);
  return orientation === "horizontal" ? { width: long, height: short } : { width: short, height: long };
}

/**
 * A layout stretched to another card size: positions follow each side,
 * text, borders and corners grow with the smaller change, so nothing
 * overflows its box.
 */
export function scaleLayout(layout: IdCardLayout, width: number, height: number): IdCardLayout {
  const sx = width / layout.width;
  const sy = height / layout.height;
  if (Math.abs(sx - 1) < 1e-6 && Math.abs(sy - 1) < 1e-6) return layout;
  const s = Math.min(sx, sy);
  return {
    width,
    height,
    elements: layout.elements.map((element) => ({
      ...element,
      x: element.x * sx,
      y: element.y * sy,
      w: element.w * sx,
      h: element.h * sy,
      fontSize: element.fontSize * s,
      strokeWidth: element.strokeWidth * s,
      radius: element.radius * s,
    })),
  };
}

/** "Valid till" text of a tab ("" = not shown). */
export function validityText(tab: IdCardTabSettings, session: string): string {
  if (tab.validity.mode === "none") return "";
  if (tab.validity.mode === "date") {
    return tab.validity.date ? format(fromDateKey(tab.validity.date), "dd MMM yyyy") : "";
  }
  // "2026-27" ends on 31 March 2027.
  const start = Number(session.slice(0, 4));
  return Number.isFinite(start) && start > 0 ? `31 Mar ${start + 1}` : "";
}
