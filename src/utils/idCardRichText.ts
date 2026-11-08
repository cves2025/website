/**
 * Letter-by-letter styles of an ID card text: between the saved parts
 * (spans) and the HTML of the box the admin types in.
 */
import { readSpans } from "./idCardSettings";
import type { IdCardSpan } from "./type";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");

/** HTML to start typing with: each part in a span with its own style. */
export function spansToHtml(spans: IdCardSpan[], text: string): string {
  if (spans.length === 0) return escapeHtml(text);
  return spans
    .map((span) => {
      const style = [
        span.color ? `color:${span.color}` : "",
        span.bold === undefined ? "" : `font-weight:${span.bold ? 700 : 400}`,
        span.italic === undefined ? "" : `font-style:${span.italic ? "italic" : "normal"}`,
        span.underline === undefined ? "" : `text-decoration:${span.underline ? "underline" : "none"}`,
      ]
        .filter(Boolean)
        .join(";");
      return style ? `<span style="${style}">${escapeHtml(span.text)}</span>` : escapeHtml(span.text);
    })
    .join("");
}

/** The style a text node gets from the tags and styles around it (nearest wins). */
function styleOf(node: Node, root: HTMLElement): Omit<IdCardSpan, "text"> {
  const style: Omit<IdCardSpan, "text"> = {};
  for (let current = node.parentElement; current && current !== root; current = current.parentElement) {
    const tag = current.tagName;
    const css = current.style;
    if (style.color === undefined) {
      const color = css.color || (tag === "FONT" ? current.getAttribute("color") ?? "" : "");
      if (color) style.color = color;
    }
    if (style.bold === undefined) {
      if (css.fontWeight) style.bold = css.fontWeight === "bold" || Number(css.fontWeight) >= 600;
      else if (tag === "B" || tag === "STRONG") style.bold = true;
    }
    if (style.italic === undefined) {
      if (css.fontStyle) style.italic = css.fontStyle === "italic";
      else if (tag === "I" || tag === "EM") style.italic = true;
    }
    if (style.underline === undefined) {
      const line = css.textDecorationLine || css.textDecoration;
      if (line) style.underline = line.includes("underline");
      else if (tag === "U") style.underline = true;
    }
  }
  return style;
}

/**
 * Parts of the typed text with their styles. New lines (Enter makes a
 * <div> or a <br>) are kept as "\n".
 */
export function spansFromEditable(root: HTMLElement): { text: string; spans: IdCardSpan[] } {
  const parts: IdCardSpan[] = [];
  const add = (text: string, style: Omit<IdCardSpan, "text">) => parts.push({ text, ...style });

  const walk = (node: Node, first: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) add(node.textContent, styleOf(node, root));
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      add("\n", {});
      return;
    }
    const block = node.tagName === "DIV" || node.tagName === "P";
    if (block && !first) add("\n", {});
    Array.from(node.childNodes).forEach((child, index) => walk(child, index === 0 && first));
  };
  Array.from(root.childNodes).forEach((child, index) => walk(child, index === 0));

  // A <br> closing a block line is not a line of its own.
  const text = parts.map((part) => part.text).join("").replace(/\n$/, "");
  const spans = readSpans(parts);
  // Same trimming on the parts.
  const last = spans[spans.length - 1];
  if (last && last.text.endsWith("\n") && !text.endsWith("\n")) last.text = last.text.slice(0, -1);
  return { text, spans: spans.filter((span) => span.text !== "") };
}
