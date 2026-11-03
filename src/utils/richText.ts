/**
 * Rich text (HTML) written with the RichTextEditor, e.g. the news text.
 * Older values are plain text; they keep rendering as plain text and are
 * turned into paragraphs when opened in the editor.
 */
import DOMPurify from "dompurify";

const HTML_TAG = /<\/?[a-z][^>]*>/i;

/** CSS the editor writes (text colour, highlight, alignment). Everything else is dropped. */
const ALLOWED_STYLES = new Set(["color", "background-color", "text-align"]);
const SAFE_STYLE_VALUE = /^[#\w\s.,%()-]+$/;

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "span", "mark",
  "h2", "h3", "ul", "ol", "li", "blockquote", "a", "hr", "code",
];

DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName !== "style") return;
  data.attrValue = data.attrValue
    .split(";")
    .map((rule) => rule.trim())
    .filter((rule) => {
      const [property, ...rest] = rule.split(":");
      const value = rest.join(":").trim();
      return (
        ALLOWED_STYLES.has(property?.trim().toLowerCase() ?? "") &&
        SAFE_STYLE_VALUE.test(value)
      );
    })
    .join("; ");
  if (!data.attrValue) data.keepAttr = false;
});

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/** True when the value is HTML from the editor, false for old plain text. */
export function isRichText(value: string): boolean {
  return HTML_TAG.test(value);
}

/** Only the tags and styles the editor can produce; scripts, events and other CSS are removed. */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel", "style"],
  });
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Editor content for a stored value: HTML as is, plain text as paragraphs. */
export function toRichTextHtml(value: string): string {
  if (!value || isRichText(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** The visible text of a value (used to check that it is not empty). */
export function richTextToPlain(value: string): string {
  if (!isRichText(value)) return value;
  const element = document.createElement("div");
  element.innerHTML = sanitizeRichText(value);
  return element.textContent ?? "";
}
