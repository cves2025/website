/** ID card settings: defaults, reading a saved document, and the card size. Pure. */
import { format } from "date-fns";

import {
  ID_CARD_ALIGN_OPTIONS,
  ID_CARD_DESIGN_OPTIONS,
  ID_CARD_FIELD_KEYS,
  ID_CARD_HIDDEN_BY_DEFAULT,
  ID_CARD_KIND_OPTIONS,
  ID_CARD_ORIENTATION_OPTIONS,
  ID_CARD_OVERFLOW_OPTIONS,
  ID_CARD_SIZE_LIMITS,
  ID_CARD_STANDARD_SIZE,
  ID_CARD_VALIDITY_OPTIONS,
} from "../constants";
import { fromDateKey } from "./holidayCalendar";
import type {
  IdCardField,
  IdCardKind,
  IdCardOrientation,
  IdCardSettings,
  IdCardTabSettings,
} from "./type";

/** Font size (pt, on a standard card) a field starts with. */
const defaultSize = (key: string) => (key === "name" ? 11 : 7.5);

export function defaultField(key: string, label: string): IdCardField {
  return {
    key,
    label,
    show: !ID_CARD_HIDDEN_BY_DEFAULT.has(key),
    showLabel: key !== "name",
    size: defaultSize(key),
    bold: key === "name",
    italic: false,
    underline: false,
    uppercase: key === "name",
    color: "",
    align: "auto",
    overflow: "fit",
  };
}

export function defaultTab(kind: IdCardKind): IdCardTabSettings {
  return {
    design: "classic",
    orientation: kind === "student" ? "vertical" : "horizontal",
    fields: ID_CARD_FIELD_KEYS[kind].map(([key, label]) => defaultField(key, label)),
    showPhoto: true,
    showSign: true,
    showStamp: false,
    showQr: true,
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

const toNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/**
 * A tab read from Firestore. Saved fields keep their order and look; a
 * field added to the app later is put at the end with its defaults, and
 * one that no longer exists is dropped.
 */
function readTab(kind: IdCardKind, raw: unknown): IdCardTabSettings {
  const data = record(raw);
  const fallback = defaultTab(kind);
  const known = new Map(ID_CARD_FIELD_KEYS[kind]);
  const saved = Array.isArray(data.fields) ? data.fields.map(record) : [];

  const fields: IdCardField[] = saved
    .filter((field) => typeof field.key === "string" && known.has(field.key))
    .map((field) => {
      const key = field.key as string;
      const base = defaultField(key, known.get(key) ?? key);
      return {
        key,
        label: typeof field.label === "string" ? field.label : base.label,
        show: typeof field.show === "boolean" ? field.show : base.show,
        showLabel: typeof field.showLabel === "boolean" ? field.showLabel : base.showLabel,
        size: toNumber(field.size, base.size, 3, 40),
        bold: field.bold === true,
        italic: field.italic === true,
        underline: field.underline === true,
        uppercase: field.uppercase === true,
        color: typeof field.color === "string" ? field.color : "",
        align: oneOf(ID_CARD_ALIGN_OPTIONS, field.align, base.align),
        overflow: oneOf(ID_CARD_OVERFLOW_OPTIONS, field.overflow, base.overflow),
      };
    });
  const missing = fallback.fields.filter((field) => !fields.some((item) => item.key === field.key));
  const validity = record(data.validity);
  const flag = (key: keyof IdCardTabSettings) =>
    typeof data[key] === "boolean" ? (data[key] as boolean) : (fallback[key] as boolean);

  return {
    design: oneOf(ID_CARD_DESIGN_OPTIONS, data.design, fallback.design),
    orientation: oneOf(ID_CARD_ORIENTATION_OPTIONS, data.orientation, fallback.orientation),
    fields: [...fields, ...missing],
    showPhoto: flag("showPhoto"),
    showSign: flag("showSign"),
    showStamp: flag("showStamp"),
    showQr: flag("showQr"),
    validity: {
      mode: oneOf(ID_CARD_VALIDITY_OPTIONS, validity.mode, fallback.validity.mode),
      date: typeof validity.date === "string" ? validity.date : "",
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

/**
 * "Apply to all tabs": the template, orientation, extras and validity of
 * `from` go to every tab, with the look of the fields they share (same key);
 * each tab keeps its own field order and labels.
 */
export function applyTabToAll(settings: IdCardSettings, from: IdCardKind): IdCardSettings {
  const source = settings.tabs[from];
  const tabs = Object.fromEntries(
    ID_CARD_KIND_OPTIONS.map(({ value }) => {
      const tab = settings.tabs[value];
      if (value === from) return [value, tab];
      const fields = tab.fields.map((field) => {
        const match = source.fields.find((item) => item.key === field.key);
        return match ? { ...match, label: field.label } : field;
      });
      return [value, { ...source, fields }];
    })
  ) as Record<IdCardKind, IdCardTabSettings>;
  return { ...settings, tabs };
}

/** Card size in mm for an orientation (a vertical card swaps the sides). */
export function cardSize(settings: Pick<IdCardSettings, "width" | "height">, orientation: IdCardOrientation) {
  const { min, max } = ID_CARD_SIZE_LIMITS;
  const long = toNumber(Math.max(Number(settings.width), Number(settings.height)), ID_CARD_STANDARD_SIZE.width, min, max);
  const short = toNumber(Math.min(Number(settings.width), Number(settings.height)), ID_CARD_STANDARD_SIZE.height, min, max);
  return orientation === "horizontal" ? { width: long, height: short } : { width: short, height: long };
}

/**
 * How much bigger than a standard card this one is: font sizes, the photo
 * and the margins all grow or shrink with it, so the content keeps its place.
 */
export function cardScale(size: { width: number; height: number }, orientation: IdCardOrientation): number {
  const standard = cardSize(ID_CARD_STANDARD_SIZE, orientation);
  return Math.min(size.width / standard.width, size.height / standard.height);
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
