import { useEffect, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  X,
} from "lucide-react";

import { toRichTextHtml } from "../utils/richText";

const TEXT_COLORS = ["#111827", "#dc2626", "#ea580c", "#16a34a", "#2563eb", "#7c3aed", "#db2777"];
const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa"];

interface RichTextEditorProps {
  id?: string;
  /** HTML (or old plain text, shown as paragraphs). "" when empty. */
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Receives a focus handle, e.g. react-hook-form's field.ref. */
  focusRef?: (handle: { focus: () => void } | null) => void;
}

function ToolbarButton({
  title,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      // Keeps the text selection while clicking a toolbar button.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />;

/** A row of colour dots; the first button clears the colour. */
function ColorMenu({
  colors,
  onPick,
  onClear,
  clearLabel,
}: {
  colors: string[];
  onPick: (color: string) => void;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <div className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
      <button
        type="button"
        title={clearLabel}
        aria-label={clearLabel}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClear}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100"
      >
        <X className="h-3 w-3" />
      </button>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          aria-label={color}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(color)}
          className="h-6 w-6 rounded-full border border-gray-300"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const [menu, setMenu] = useState<"color" | "highlight" | "link" | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const chain = () => editor.chain().focus();
  const toggleMenu = (next: "color" | "highlight") =>
    setMenu((current) => (current === next ? null : next));

  const openLink = () => {
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setMenu((current) => (current === "link" ? null : "link"));
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      chain().extendMarkRange("link").unsetLink().run();
    } else {
      const href = /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
      chain().extendMarkRange("link").setLink({ href }).run();
    }
    setMenu(null);
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1">
        <ToolbarButton title="Undo" disabled={disabled || !editor.can().undo()} onClick={() => chain().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Redo" disabled={disabled || !editor.can().redo()} onClick={() => chain().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Normal text" disabled={disabled} active={editor.isActive("paragraph")} onClick={() => chain().setParagraph().run()}>
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Heading" disabled={disabled} active={editor.isActive("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Sub heading" disabled={disabled} active={editor.isActive("heading", { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Bold" disabled={disabled} active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic" disabled={disabled} active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Underline" disabled={disabled} active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" disabled={disabled} active={editor.isActive("strike")} onClick={() => chain().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <div className="relative">
          <ToolbarButton title="Text colour" disabled={disabled} active={menu === "color"} onClick={() => toggleMenu("color")}>
            <Palette className="h-4 w-4" style={{ color: editor.getAttributes("textStyle").color }} />
          </ToolbarButton>
          {menu === "color" && (
            <ColorMenu
              colors={TEXT_COLORS}
              clearLabel="Default colour"
              onPick={(color) => { chain().setColor(color).run(); setMenu(null); }}
              onClear={() => { chain().unsetColor().run(); setMenu(null); }}
            />
          )}
        </div>
        <div className="relative">
          <ToolbarButton title="Highlight" disabled={disabled} active={editor.isActive("highlight") || menu === "highlight"} onClick={() => toggleMenu("highlight")}>
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
          {menu === "highlight" && (
            <ColorMenu
              colors={HIGHLIGHT_COLORS}
              clearLabel="No highlight"
              onPick={(color) => { chain().setHighlight({ color }).run(); setMenu(null); }}
              onClear={() => { chain().unsetHighlight().run(); setMenu(null); }}
            />
          )}
        </div>
        <Divider />
        <ToolbarButton title="Bullet list" disabled={disabled} active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" disabled={disabled} active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Align left" disabled={disabled} active={editor.isActive({ textAlign: "left" })} onClick={() => chain().setTextAlign("left").run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Align center" disabled={disabled} active={editor.isActive({ textAlign: "center" })} onClick={() => chain().setTextAlign("center").run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Align right" disabled={disabled} active={editor.isActive({ textAlign: "right" })} onClick={() => chain().setTextAlign("right").run()}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Justify" disabled={disabled} active={editor.isActive({ textAlign: "justify" })} onClick={() => chain().setTextAlign("justify").run()}>
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Quote" disabled={disabled} active={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Divider line" disabled={disabled} onClick={() => chain().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Link" disabled={disabled} active={editor.isActive("link") || menu === "link"} onClick={openLink}>
          <Link className="h-4 w-4" />
        </ToolbarButton>
        {editor.isActive("link") && (
          <ToolbarButton title="Remove link" disabled={disabled} onClick={() => chain().extendMarkRange("link").unsetLink().run()}>
            <Unlink className="h-4 w-4" />
          </ToolbarButton>
        )}
        <ToolbarButton title="Clear formatting" disabled={disabled} onClick={() => chain().unsetAllMarks().clearNodes().unsetTextAlign().run()}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {menu === "link" && (
        <div className="flex items-center gap-2 border-t border-gray-200 px-2 py-1.5">
          <input
            type="url"
            autoFocus
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              } else if (event.key === "Escape") {
                setMenu(null);
              }
            }}
            placeholder="https://example.com"
            className="h-8 min-w-0 flex-1 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <ToolbarButton title="Apply link" onClick={applyLink}>
            <Check className="h-4 w-4 text-green-600" />
          </ToolbarButton>
          <ToolbarButton title="Cancel" onClick={() => setMenu(null)}>
            <X className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}
    </div>
  );
}

/**
 * Rich text field: bold, italic, underline, strike, colours, highlight,
 * headings, lists, alignment, quote, divider and links. The value is HTML;
 * show it with <RichText>, which sanitizes it.
 */
function RichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "",
  disabled = false,
  invalid = false,
  focusRef,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        // No forced empty paragraph at the end of the saved HTML.
        trailingNode: false,
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: toRichTextHtml(value),
    editable: !disabled,
    // The toolbar reads the active marks, so it re-renders on every change.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: "rich-text min-h-[150px] max-h-[320px] overflow-y-auto px-3 py-2 text-sm text-gray-800 focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) =>
      onChange(current.isEmpty ? "" : current.getHTML()),
    onBlur: () => onBlur?.(),
  });

  // A new value from outside (e.g. the form was reset for another news).
  useEffect(() => {
    if (!editor) return;
    if (value === "" ? editor.isEmpty : value === editor.getHTML()) return;
    editor.commands.setContent(toRichTextHtml(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!focusRef) return;
    focusRef(editor ? { focus: () => editor.commands.focus() } : null);
    return () => focusRef(null);
  }, [editor, focusRef]);

  return (
    <div
      className={`overflow-hidden rounded-md border bg-white shadow-sm transition-colors focus-within:ring-2 ${
        invalid
          ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/40"
          : "border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500/50"
      } ${disabled ? "bg-gray-100" : ""}`}
    >
      {editor && <Toolbar editor={editor} disabled={disabled} />}
      <div className="relative">
        {editor?.isEmpty && placeholder && (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-gray-400">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default RichTextEditor;
