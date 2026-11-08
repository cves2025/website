/**
 * The four starting designs of the ID card designer (Classic, Modern,
 * Premium, Vibrant), horizontal and vertical, as lists of elements on a
 * standard card. Pure; an admin changes everything from here on.
 */
import {
  ID_CARD_FIELD_KEYS,
  ID_CARD_TEMPLATE_PALETTES,
  ID_CARD_TEMPLATE_PLANS,
  ID_CARD_HIDDEN_BY_DEFAULT,
  ID_CARD_STANDARD_SIZE,
  SCHOOL_CONTACT,
  SCHOOL_NAME,
} from "../constants";
import type {
  IdCardBox,
  IdCardDesign,
  IdCardElement,
  IdCardKind,
  IdCardLayout,
  IdCardOrientation,
} from "./type";

const INTER = "Inter, system-ui, sans-serif";

let counter = 0;
/** A new element id, unique on this screen. */
export const newElementId = () => `el-${Date.now().toString(36)}-${(counter += 1).toString(36)}`;

/** An element with every setting at its default; `patch` sets the rest. */
export function makeElement(type: IdCardElement["type"], patch: Partial<IdCardElement> = {}): IdCardElement {
  return {
    id: newElementId(),
    type,
    name: type,
    x: 0,
    y: 0,
    w: 20,
    h: 10,
    rotation: 0,
    locked: false,
    hidden: false,
    opacity: 1,
    text: "",
    spans: [],
    field: "",
    label: "",
    showLabel: false,
    fontFamily: INTER,
    fontSize: 7,
    bold: false,
    italic: false,
    underline: false,
    uppercase: false,
    color: "#111827",
    labelColor: "",
    align: "left",
    valign: "middle",
    overflow: "fit",
    lineHeight: 1.2,
    letterSpacing: 0,
    fill: "",
    fill2: "",
    gradientAngle: 90,
    stroke: "",
    strokeWidth: 0,
    radius: 0,
    src: "",
    fit: "cover",
    ...patch,
  };
}

const at = ([x, y, w, h]: IdCardBox) => ({ x, y, w, h });

/** A template's design for a tab, on a standard card of that orientation. */
export function templateLayout(design: IdCardDesign, orientation: IdCardOrientation, kind: IdCardKind): IdCardLayout {
  const p = ID_CARD_TEMPLATE_PALETTES[design];
  const plan = ID_CARD_TEMPLATE_PLANS[orientation][design];
  const horizontal = orientation === "horizontal";
  const width = horizontal ? ID_CARD_STANDARD_SIZE.width : ID_CARD_STANDARD_SIZE.height;
  const height = horizontal ? ID_CARD_STANDARD_SIZE.height : ID_CARD_STANDARD_SIZE.width;
  // The header strip is a thin line in Modern / Premium, a coloured band otherwise.
  const thinHeader = plan.header[3] < 1;
  const onHeader = !thinHeader && design !== "modern";

  const elements: IdCardElement[] = [
    makeElement("rect", { name: "Background", x: 0, y: 0, w: width, h: height, fill: p.card, fill2: p.card2, gradientAngle: 160, locked: true }),
  ];
  if (plan.strip) {
    elements.push(
      makeElement("rect", { name: "Side strip", ...at(plan.strip), fill: p.band, fill2: p.band2, gradientAngle: 180 }),
      makeElement("field", {
        name: "Side title", field: "cardTitle", x: plan.strip[0] + plan.strip[2] / 2 - 22, y: height / 2 - 2.5, w: 44, h: 5,
        rotation: -90, fontSize: 5, bold: true, color: "#ffffff", align: "center", letterSpacing: 0.15,
      })
    );
  }
  if (design === "vibrant") {
    elements.push(
      makeElement("ellipse", { name: "Bubble", x: width - 16, y: height - 18, w: 22, h: 22, fill: p.band2, opacity: 0.12 }),
      makeElement("ellipse", { name: "Bubble", x: -7, y: height * 0.55, w: 16, h: 16, fill: p.accent, opacity: 0.1 })
    );
  }
  elements.push(
    makeElement("rect", {
      name: "Header", ...at(plan.header), radius: plan.headerRadius,
      fill: p.header, fill2: thinHeader ? "" : p.header2, gradientAngle: design === "vibrant" ? 120 : 180,
      ...(thinHeader ? { fill: p.accent } : {}),
    }),
    makeElement("logo", { name: "School logo", ...at(plan.logo), fill: "#ffffff", radius: plan.logo[2] / 2, stroke: p.accent, strokeWidth: 0.3 }),
    makeElement("text", {
      name: "School name", text: SCHOOL_NAME, ...at(plan.school), fontSize: horizontal ? 7.5 : 6.5, bold: true,
      color: onHeader ? p.headerText : design === "premium" ? p.headerText : p.headerText, align: plan.textAlign,
      fontFamily: design === "premium" ? "'Noto Serif', Georgia, serif" : INTER,
    }),
    makeElement("text", {
      name: "Address", text: SCHOOL_CONTACT.ADDRESS, ...at(plan.address), fontSize: 4.2, color: p.subText, align: plan.textAlign,
    }),
    makeElement("rect", { name: "Title chip", ...at(plan.chip), fill: p.chip, radius: 0.9 }),
    makeElement("field", {
      name: "Card title", field: "cardTitle", ...at(plan.chip), fontSize: 4.6, bold: true, color: p.chipText, align: "center",
      letterSpacing: 0.08,
    }),
    makeElement("photo", { name: "Photo", ...at(plan.photo), radius: plan.photoRadius, stroke: p.accent, strokeWidth: 0.5, fill: "#e5e7eb" }),
    makeElement("field", {
      name: "Name", field: "name", ...at(plan.name), fontSize: 9, bold: true, uppercase: true, color: p.text, align: plan.textAlign,
    })
  );

  const others = ID_CARD_FIELD_KEYS[kind].filter(([key]) => key !== "name" && !ID_CARD_HIDDEN_BY_DEFAULT.has(key));
  const [fx, fy, fw, fh] = plan.fieldsAt;
  others.forEach(([key, label], index) =>
    elements.push(
      makeElement("field", {
        name: label, field: key, label, showLabel: true, x: fx, y: fy + index * plan.fieldStep, w: fw, h: fh,
        fontSize: horizontal ? 6.5 : 6.2, color: p.text, labelColor: p.label, align: plan.textAlign,
      })
    )
  );

  const [sx, sy, sw, sh] = plan.sign;
  elements.push(
    makeElement("qr", { name: "QR code", ...at(plan.qr), fill: "#ffffff", radius: 0.8 }),
    makeElement("stamp", { name: "School stamp", x: sx + sw / 2 - 5, y: sy - 3, w: 10, h: 10, opacity: 0.5, fit: "contain", hidden: true }),
    makeElement("sign", { name: "Principal's sign", x: sx, y: sy, w: sw, h: sh, fit: "contain" }),
    makeElement("rect", { name: "Sign line", x: sx + 1, y: sy + sh + 0.2, w: sw - 2, h: 0.2, fill: p.text }),
    makeElement("text", {
      name: "Principal", text: "Principal", x: sx, y: sy + sh + 0.5, w: sw, h: 2.8, fontSize: 4.6, bold: true, color: p.text, align: "center",
    }),
    makeElement("rect", { name: "Bottom band", ...at(plan.band), fill: p.band, fill2: p.band2, gradientAngle: 90 })
  );
  return { width, height, elements };
}
