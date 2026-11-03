import { useMemo } from "react";

import { isRichText, sanitizeRichText } from "../utils/richText";

interface RichTextProps {
  /** HTML from the RichTextEditor, or old plain text. */
  value: string;
  className?: string;
}

/** Shows rich text safely (sanitized); plain text keeps its line breaks. */
function RichText({ value, className = "" }: RichTextProps) {
  const html = useMemo(
    () => (isRichText(value) ? sanitizeRichText(value) : null),
    [value]
  );

  if (html === null) {
    return <div className={`whitespace-pre-line ${className}`}>{value}</div>;
  }
  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default RichText;
