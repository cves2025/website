/**
 * The ID card designer (admin), a full-screen editor in the style of Canva:
 * the card in the middle at its real proportions, where every element can
 * be dragged, resized and turned (snapping to the card and to each other),
 * text typed in place, and several elements picked with Shift / Ctrl. Left:
 * add text, data fields, the photo, logo, QR, sign, stamp, shapes, an
 * uploaded image, or start again from a template. Right: the selected
 * element's settings and the layers. Undo / Redo and the usual keys.
 * Both faces (horizontal and vertical) are designed here and saved together.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import Moveable from "react-moveable";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  Copy,
  ImagePlus,
  Minus,
  Plus,
  Redo2,
  SendToBack,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import {
  ID_CARD_ADD_OPTIONS,
  ID_CARD_TEXT_SWATCHES,
  ID_CARD_DESIGN_OPTIONS,
  ID_CARD_HISTORY_LIMIT,
  ID_CARD_KIND_OPTIONS,
  ID_CARD_NUDGE_MM,
  ID_CARD_ORIENTATION_OPTIONS,
  ID_CARD_ZOOM_STEPS,
} from "../../../../constants";
import CustomButton from "../../../../custom-components/CustomButton";
import CustomSelect from "../../../../custom-components/CustomSelect";
import Modal from "../../../../custom-components/Modal";
import { Spinner } from "../../../../custom-components/Loader";
import { uploadIdCardImage } from "../../../../firebase/idCardImages";
import { useHistoryState } from "../../../../hooks/useHistoryState";
import { useStudentPhoto } from "../../../../hooks/useStudentPhoto";
import { cardSize, idCardFields, readElement, scaleLayout } from "../../../../utils/idCardSettings";
import type { SchoolSigns } from "../../../../utils/idCardService";
import { makeElement, newElementId, templateLayout } from "../../../../utils/idCardTemplates";
import type {
  IdCardDesign,
  IdCardElement,
  IdCardSpan,
  IdCardKind,
  IdCardLayout,
  IdCardOrientation,
  IdCardPerson,
  IdCardSettings,
  IdCardTabSettings,
} from "../../../../utils/type";
import { CardFace, cardValues, RICH_TOOLBAR_ATTR } from "../IdCardView";
import { spansFromEditable } from "../../../../utils/idCardRichText";
import EditorLayers from "./EditorLayers";
import EditorProperties from "./EditorProperties";

/** CSS pixels in a millimetre. */
const PX_PER_MM = 96 / 25.4;

export interface IdCardFaces {
  horizontal: IdCardLayout;
  vertical: IdCardLayout;
}

interface IdCardEditorProps {
  kind: IdCardKind;
  tab: IdCardTabSettings;
  card: Pick<IdCardSettings, "width" | "height">;
  /** Whose data fills the card while designing. */
  person: IdCardPerson;
  session: string;
  signs: SchoolSigns;
  onSave: (faces: IdCardFaces) => Promise<void>;
  onClose: () => void;
}

/** Size a new element gets (mm). */
const NEW_SIZE: Partial<Record<IdCardElement["type"], [number, number]>> = {
  text: [32, 6],
  field: [40, 5],
  photo: [18, 22],
  logo: [10, 10],
  qr: [12, 12],
  sign: [16, 6],
  stamp: [12, 12],
  rect: [24, 10],
  ellipse: [12, 12],
};

/** What a new element of each kind looks like before it is styled. */
function newElement(type: IdCardElement["type"], layout: IdCardLayout, patch: Partial<IdCardElement> = {}): IdCardElement {
  const [w, h] = NEW_SIZE[type] ?? [20, 10];
  const label = ID_CARD_ADD_OPTIONS.find((option) => option.value === type)?.label ?? type;
  const looks: Partial<IdCardElement> =
    type === "text"
      ? { text: "New text", fontSize: 8 }
      : type === "photo"
        ? { fill: "#e5e7eb", stroke: "#1e40af", strokeWidth: 0.4, radius: 0.8 }
        : type === "logo"
          ? { fill: "#ffffff", radius: 5 }
          : type === "qr"
            ? { fill: "#ffffff", radius: 0.6 }
            : type === "sign" || type === "stamp"
              ? { fit: "contain", opacity: type === "stamp" ? 0.6 : 1 }
              : type === "rect" || type === "ellipse"
                ? { fill: "#e5e7eb" }
                : {};
  return makeElement(type, {
    name: label,
    w,
    h,
    x: (layout.width - w) / 2,
    y: (layout.height - h) / 2,
    ...looks,
    ...patch,
  });
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest("input, textarea, select, [contenteditable='true'], [role='listbox'], [role='option']"));

function IdCardEditor({ kind, tab, card, person, session, signs, onSave, onClose }: IdCardEditorProps) {
  const sizes = useMemo(
    () => ({ horizontal: cardSize(card, "horizontal"), vertical: cardSize(card, "vertical") }),
    [card]
  );
  // Designed at the card's own size, so 1 mm here is 1 mm on the card.
  const initial = useMemo<IdCardFaces>(
    () => ({
      horizontal: scaleLayout(tab.horizontal, sizes.horizontal.width, sizes.horizontal.height),
      vertical: scaleLayout(tab.vertical, sizes.vertical.width, sizes.vertical.height),
    }),
    // Taken once when the designer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const history = useHistoryState<IdCardFaces>(initial, ID_CARD_HISTORY_LIMIT);
  const savedRef = useRef(initial);
  const dirty = history.value !== savedRef.current;

  const [face, setFace] = useState<IdCardOrientation>(tab.orientation);
  const layout = history.value[face];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [typingId, setTypingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(3);
  const [shift, setShift] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: "template"; design: IdCardDesign } | { kind: "close" }>(null);
  const clipboard = useRef<IdCardElement[]>([]);
  // Element being typed in (a ref too, so typing ends only once).
  const typingRef = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);
  const replacingId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable>(null);
  /** A drag, resize or turn is going on. */
  const gesturing = useRef(false);
  const startGesture = () => {
    gesturing.current = true;
  };
  const endGesture = () => {
    gesturing.current = false;
    history.commit();
  };
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const [cardNode, setCardNode] = useState<HTMLDivElement | null>(null);

  const ppm = PX_PER_MM * zoom;
  const unit = useCallback((mm: number) => `${mm * ppm}px`, [ppm]);
  const fields = useMemo(() => idCardFields(kind), [kind]);
  const studentPhoto = useStudentPhoto(person.kind === "student" ? person.id : "", person.photo);
  const values = useMemo(() => cardValues(person, tab, session), [person, tab, session]);
  const kindLabel = ID_CARD_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "";

  /* ----------------------------------------------------------- changes -- */

  /** Changes this face; `preview` (while dragging) adds no Undo step. */
  const change = useCallback(
    (update: (current: IdCardLayout) => IdCardLayout, mode: "set" | "preview" = "set") => {
      const apply = (faces: IdCardFaces) => ({ ...faces, [face]: update(faces[face]) });
      if (mode === "set") history.set(apply);
      else history.preview(apply);
    },
    [face, history]
  );

  const patch = useCallback(
    (patches: Record<string, Partial<IdCardElement>>, mode: "set" | "preview" = "set") =>
      change(
        (current) => ({
          ...current,
          elements: current.elements.map((element) =>
            patches[element.id] ? { ...element, ...patches[element.id] } : element
          ),
        }),
        mode
      ),
    [change]
  );

  const addElements = (elements: IdCardElement[]) => {
    change((current) => ({ ...current, elements: [...current.elements, ...elements] }));
    setSelected(new Set(elements.map((element) => element.id)));
  };

  const remove = (ids: ReadonlySet<string>) => {
    if (ids.size === 0) return;
    change((current) => ({ ...current, elements: current.elements.filter((element) => !ids.has(element.id)) }));
    setSelected(new Set());
  };

  const copies = (elements: IdCardElement[], offset: number) =>
    elements.map((element) => ({ ...element, id: newElementId(), x: element.x + offset, y: element.y + offset, locked: false }));

  const selectedElements = layout.elements.filter((element) => selected.has(element.id));
  const single = selectedElements.length === 1 ? selectedElements[0] : null;

  /** Line up the selection with the card (one element) or with itself. */
  const align = (how: "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom") => {
    const items = selectedElements.filter((element) => !element.locked);
    if (items.length === 0) return;
    const box =
      items.length === 1
        ? { left: 0, top: 0, right: layout.width, bottom: layout.height }
        : {
            left: Math.min(...items.map((e) => e.x)),
            top: Math.min(...items.map((e) => e.y)),
            right: Math.max(...items.map((e) => e.x + e.w)),
            bottom: Math.max(...items.map((e) => e.y + e.h)),
          };
    const patches: Record<string, Partial<IdCardElement>> = {};
    items.forEach((e) => {
      patches[e.id] =
        how === "left" ? { x: box.left }
        : how === "right" ? { x: box.right - e.w }
        : how === "hcenter" ? { x: (box.left + box.right - e.w) / 2 }
        : how === "top" ? { y: box.top }
        : how === "bottom" ? { y: box.bottom - e.h }
        : { y: (box.top + box.bottom - e.h) / 2 };
    });
    patch(patches);
  };

  /** Brings the selection to the front (or sends it to the back). */
  const stack = (to: "front" | "back") =>
    change((current) => {
      const picked = current.elements.filter((element) => selected.has(element.id));
      const rest = current.elements.filter((element) => !selected.has(element.id));
      return { ...current, elements: to === "front" ? [...rest, ...picked] : [...picked, ...rest] };
    });

  const moveLayer = (id: string, step: 1 | -1) =>
    change((current) => {
      const elements = [...current.elements];
      const index = elements.findIndex((element) => element.id === id);
      const target = index + step;
      if (index < 0 || target < 0 || target >= elements.length) return current;
      [elements[index], elements[target]] = [elements[target], elements[index]];
      return { ...current, elements };
    });

  const applyTemplate = (design: IdCardDesign) => {
    const size = sizes[face];
    const fresh = templateLayout(design, face, kind);
    change(() => scaleLayout(fresh, size.width, size.height));
    setSelected(new Set());
  };

  const pickImage = (replaceId: string | null) => {
    replacingId.current = replaceId;
    fileInput.current?.click();
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    setUploading(true);
    try {
      const [src, ratio] = await Promise.all([
        uploadIdCardImage(file),
        new Promise<number>((resolve) => {
          const url = URL.createObjectURL(file);
          const image = new Image();
          image.onload = () => {
            resolve(image.naturalHeight / Math.max(1, image.naturalWidth));
            URL.revokeObjectURL(url);
          };
          image.onerror = () => resolve(1);
          image.src = url;
        }),
      ]);
      const replace = replacingId.current;
      if (replace) {
        patch({ [replace]: { src } });
      } else {
        const w = Math.min(30, layout.width * 0.6);
        addElements([newElement("image", layout, { name: "Image", src, w, h: Math.min(w * ratio, layout.height * 0.8), fit: "contain" })]);
      }
    } catch (cause) {
      console.error("Image upload failed.", cause);
      toast.error("The image could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
      replacingId.current = null;
    }
  };

  /* -------------------------------------------------------- selection -- */

  const onPointerDown = (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (typingId === id) return;
    event.stopPropagation();
    finishTyping();
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    if (selected.has(id)) return;
    setSelected(new Set([id]));
    // Press and drag in one go, as in Canva.
    const element = layout.elements.find((item) => item.id === id);
    if (element && !element.locked) {
      const native = event.nativeEvent;
      moveableRef.current?.waitToChangeTarget().then(() => moveableRef.current?.dragStart(native));
    }
  };

  const onDoubleClick = (id: string) => {
    const element = layout.elements.find((item) => item.id === id);
    if (element?.type === "text" && !element.locked) {
      setSelected(new Set([id]));
      onDoubleClickStart(id);
    }
  };

  const onDoubleClickStart = (id: string) => {
    typingRef.current = id;
    savedRange.current = null;
    setTypingId(id);
  };

  /** Typing ended (once, however it ends): keep the text and its styles. */
  const onTyped = (id: string, typed: { text: string; spans: IdCardSpan[] }) => {
    if (typingRef.current !== id) return;
    typingRef.current = null;
    setTypingId(null);
    const element = layout.elements.find((item) => item.id === id);
    if (!element) return;
    if (element.text !== typed.text || JSON.stringify(element.spans) !== JSON.stringify(typed.spans)) {
      patch({ [id]: { text: typed.text, spans: typed.spans } });
    }
  };

  /** The box being typed in, if any. */
  const editable = () =>
    typingRef.current
      ? nodes.current.get(typingRef.current)?.querySelector<HTMLElement>("[data-rich-editable]") ?? null
      : null;

  /** Ends typing from outside the text (a click elsewhere, Done, Esc ...). */
  const finishTyping = () => {
    const node = editable();
    if (node && typingRef.current) onTyped(typingRef.current, spansFromEditable(node));
  };

  // The selected letters, so the toolbar can style them after a click.
  useEffect(() => {
    if (!typingId) return;
    const remember = () => {
      const node = editable();
      const selection = window.getSelection();
      if (node && selection && selection.rangeCount > 0 && node.contains(selection.anchorNode)) {
        savedRange.current = selection.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingId]);

  /** Styles the selected letters (colour, bold ...). */
  const styleLetters = (command: "foreColor" | "bold" | "italic" | "underline" | "removeFormat", value?: string) => {
    const node = editable();
    if (!node) return;
    node.focus();
    const selection = window.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    // Styles as <span style="...">, which the card reads back.
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
  };

  const register = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);

  // Handles go on the selected elements that may move.
  const targets = selectedElements
    .filter((element) => !element.locked && !element.hidden && element.id !== typingId)
    .map((element) => nodes.current.get(element.id))
    .filter((node): node is HTMLDivElement => Boolean(node));
  const guides = [
    ...(cardNode ? [cardNode] : []),
    ...layout.elements
      .filter((element) => !selected.has(element.id) && !element.hidden)
      .map((element) => nodes.current.get(element.id))
      .filter((node): node is HTMLDivElement => Boolean(node)),
  ];

  // Keep the handles on the elements after any change (undo, typing, zoom).
  useLayoutEffect(() => {
    // Not in the middle of a drag / resize: Moveable is moving it then.
    if (!gesturing.current) moveableRef.current?.updateRect();
  });

  const idOf = (target: HTMLElement | SVGElement) => (target as HTMLElement).dataset.elementId ?? "";
  const round = (value: number) => Math.round(value * 100) / 100;

  /* --------------------------------------------------------------- zoom -- */

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = sizes[face];
    const byWidth = (canvas.clientWidth - 120) / (size.width * PX_PER_MM);
    const byHeight = (canvas.clientHeight - 120) / (size.height * PX_PER_MM);
    setZoom(Math.max(0.5, Math.min(8, Math.min(byWidth, byHeight))));
  }, [face, sizes]);
  useLayoutEffect(() => fit(), [fit]);

  const zoomBy = (direction: 1 | -1) =>
    setZoom((current) => {
      const steps = direction > 0 ? ID_CARD_ZOOM_STEPS : [...ID_CARD_ZOOM_STEPS].reverse();
      return steps.find((step) => (direction > 0 ? step > current + 0.01 : step < current - 0.01)) ?? current;
    });

  /* --------------------------------------------------------------- keys -- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Shift") setShift(event.type === "keydown");
      if (event.type !== "keydown" || isTyping(event.target) || confirm) return;
      const ctrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const editable = selectedElements.filter((element) => !element.locked);

      if (ctrl && key === "z" && !event.shiftKey) history.undo();
      else if (ctrl && (key === "y" || (key === "z" && event.shiftKey))) history.redo();
      else if (ctrl && key === "a") setSelected(new Set(layout.elements.filter((e) => !e.locked && !e.hidden).map((e) => e.id)));
      else if (ctrl && key === "c") clipboard.current = selectedElements;
      else if (ctrl && key === "v" && clipboard.current.length) addElements(copies(clipboard.current, 2));
      else if (ctrl && key === "d" && selectedElements.length) addElements(copies(selectedElements, 2));
      else if ((key === "delete" || key === "backspace") && editable.length) remove(new Set(editable.map((e) => e.id)));
      else if (key === "escape") {
        setSelected(new Set());
        finishTyping();
      } else if (key.startsWith("arrow") && editable.length) {
        const step = event.shiftKey ? ID_CARD_NUDGE_MM.large : ID_CARD_NUDGE_MM.small;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        patch(Object.fromEntries(editable.map((e) => [e.id, { x: round(e.x + dx), y: round(e.y + dy) }])));
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  });

  /* --------------------------------------------------------------- save -- */

  const save = async () => {
    setSaving(true);
    try {
      const faces = history.value;
      await onSave(faces);
      savedRef.current = faces;
      toast.success("ID card design saved.");
    } catch (cause) {
      console.error("ID card design could not be saved.", cause);
      toast.error("The design could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fieldPicker = useForm<{ field: string }>({ defaultValues: { field: "" } });

  const toolButton =
    "grid h-9 w-9 place-items-center rounded-md border border-gray-200 bg-white text-gray-700 transition hover:border-[#ad1a6f]/50 hover:bg-[#fdf2f7] disabled:opacity-40";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef0f5]" role="dialog" aria-modal="true" aria-label="ID card designer">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <div className="mr-2 min-w-0">
          <h2 className="truncate text-base font-bold text-gray-900">ID card designer</h2>
          <p className="text-xs text-gray-500">{kindLabel} · data of {person.name}</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 p-0.5" role="tablist" aria-label="Card face">
          {ID_CARD_ORIENTATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={face === option.value}
              onClick={() => {
                finishTyping();
                setFace(option.value);
                setSelected(new Set());
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                face === option.value ? "bg-cves text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option.label}
              {tab.orientation === option.value && <span className="ml-1 text-[10px] font-normal opacity-80">(prints)</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={toolButton} title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!history.canUndo} onClick={history.undo}>
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" className={toolButton} title="Redo (Ctrl+Y)" aria-label="Redo" disabled={!history.canRedo} onClick={history.redo}>
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={toolButton} title="Zoom out" aria-label="Zoom out" onClick={() => zoomBy(-1)}>
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" onClick={fit} title="Fit to screen" className="min-w-14 rounded-md px-2 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className={toolButton} title="Zoom in" aria-label="Zoom in" onClick={() => zoomBy(1)}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <CustomButton type="button" variant="outline" onClick={() => (dirty ? setConfirm({ kind: "close" }) : onClose())}>
            Close
          </CustomButton>
          <CustomButton type="button" variant="cves" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? "Saving..." : dirty ? "Save design" : "Saved"}
          </CustomButton>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Add */}
        <aside className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-3">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Add</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {ID_CARD_ADD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => addElements([newElement(option.value, layout)])}
                  className="rounded-md border border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-700 transition hover:border-[#ad1a6f]/50 hover:bg-[#fdf2f7]"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <CustomSelect
                control={fieldPicker.control}
                name="field"
                placeholder="Add data field..."
                options={fields.map(([value, label]) => ({ value, label }))}
                className="py-1.5 text-xs"
                onValueChange={(key) => {
                  const label = fields.find(([value]) => value === key)?.[1] ?? key;
                  addElements([
                    newElement("field", layout, {
                      name: label,
                      field: key,
                      label,
                      showLabel: key !== "name" && key !== "cardTitle",
                      fontSize: key === "name" ? 9 : 6.5,
                      bold: key === "name",
                    }),
                  ]);
                  fieldPicker.reset({ field: "" });
                }}
              />
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => pickImage(null)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#ad1a6f]/50 hover:bg-[#fdf2f7] disabled:opacity-50"
            >
              {uploading ? <Spinner size="xs" label="Uploading" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload image"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadImage(file);
              }}
            />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Start from a template</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {ID_CARD_DESIGN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.hint}
                  onClick={() => setConfirm({ kind: "template", design: option.value })}
                  className="rounded-md border border-gray-200 px-2 py-2 text-left text-xs transition hover:border-[#ad1a6f]/50 hover:bg-[#fdf2f7]"
                >
                  <span className="block font-semibold text-gray-800">{option.label}</span>
                  <span className="block text-[10px] leading-tight text-gray-500">{option.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-auto rounded-md bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-500">
            <b className="text-gray-700">Keys:</b> drag to move · corners to resize · top handle to turn · Shift/Ctrl+click
            to pick more · double-click text to type · arrows nudge (Shift: more) · Ctrl+Z / Ctrl+Y · Ctrl+C / Ctrl+V ·
            Ctrl+D copy · Delete.
          </section>
        </aside>

        {/* Canvas */}
        <div
          ref={canvasRef}
          onScroll={() => moveableRef.current?.updateRect()}
          className="relative min-w-0 flex-1 overflow-auto"
          onPointerDown={() => {
            finishTyping();
            setSelected(new Set());
          }}
        >
          <div className="grid min-h-full min-w-full place-items-center p-14" style={{ width: "max-content" }}>
            <div ref={setCardNode} className="relative" onPointerDown={(event) => event.stopPropagation()}>
              <CardFace
                layout={layout}
                kind={kind}
                values={values}
                photo={person.kind === "student" ? studentPhoto : person.photo}
                personName={person.name}
                code={person.code}
                signs={signs}
                unit={unit}
                editing={{ selected, typingId, onPointerDown, onDoubleClick, onTyped, register }}
              />
              {typingId && (() => {
                const element = layout.elements.find((item) => item.id === typingId);
                if (!element) return null;
                const keep = (event: ReactMouseEvent) => event.preventDefault();
                return (
                  <div
                    {...{ [RICH_TOOLBAR_ATTR]: "" }}
                    className="absolute z-10 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
                    style={{ left: Math.max(0, element.x * ppm), top: element.y * ppm - 46 }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    {ID_CARD_TEXT_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.value}
                        type="button"
                        title={swatch.label}
                        aria-label={`Colour: ${swatch.label}`}
                        onMouseDown={keep}
                        onClick={() => styleLetters("foreColor", swatch.value)}
                        className="h-6 w-6 rounded-full border border-gray-300"
                        style={{ background: swatch.value }}
                      />
                    ))}
                    <input
                      type="color"
                      title="Any colour"
                      aria-label="Any colour"
                      defaultValue="#e7087e"
                      onChange={(event) => styleLetters("foreColor", event.target.value)}
                      className="h-7 w-8 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
                    />
                    <span className="mx-0.5 h-5 w-px bg-gray-200" />
                    <button type="button" title="Bold" aria-label="Bold" onMouseDown={keep} onClick={() => styleLetters("bold")} className="grid h-7 w-7 place-items-center rounded font-bold hover:bg-gray-100">B</button>
                    <button type="button" title="Italic" aria-label="Italic" onMouseDown={keep} onClick={() => styleLetters("italic")} className="grid h-7 w-7 place-items-center rounded italic hover:bg-gray-100">I</button>
                    <button type="button" title="Underline" aria-label="Underline" onMouseDown={keep} onClick={() => styleLetters("underline")} className="grid h-7 w-7 place-items-center rounded underline hover:bg-gray-100">U</button>
                    <button type="button" title="Remove the letter styles" onMouseDown={keep} onClick={() => styleLetters("removeFormat")} className="rounded px-1.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100">Clear</button>
                    <button type="button" onMouseDown={keep} onClick={finishTyping} className="rounded bg-cves px-2 py-1 text-xs font-semibold text-white">Done</button>
                  </div>
                );
              })()}
            </div>
          </div>
          <Moveable
            ref={moveableRef}
            target={targets}
            rootContainer={document.body}
            className="id-card-moveable"
            // Resize from anywhere on a side, not only from the handles.
            edge
            linePadding={10}
            controlPadding={6}
            onDragStart={startGesture}
            onDragGroupStart={startGesture}
            onResizeStart={startGesture}
            onResizeGroupStart={startGesture}
            onRotateStart={startGesture}
            draggable
            resizable
            rotatable={targets.length === 1}
            keepRatio={shift || (single?.type === "qr")}
            throttleDrag={0}
            throttleResize={0}
            throttleRotate={1}
            snappable
            snapThreshold={6}
            isDisplaySnapDigit
            snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
            elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
            elementGuidelines={guides}
            onDrag={({ target, left, top }) =>
              patch({ [idOf(target)]: { x: round(left / ppm), y: round(top / ppm) } }, "preview")
            }
            onDragEnd={endGesture}
            onDragGroup={({ events }) =>
              patch(
                Object.fromEntries(events.map((e) => [idOf(e.target), { x: round(e.left / ppm), y: round(e.top / ppm) }])),
                "preview"
              )
            }
            onDragGroupEnd={endGesture}
            onResize={({ target, width, height, drag }) =>
              patch(
                {
                  [idOf(target)]: {
                    w: round(Math.max(1, width) / ppm),
                    h: round(Math.max(1, height) / ppm),
                    x: round(drag.left / ppm),
                    y: round(drag.top / ppm),
                  },
                },
                "preview"
              )
            }
            onResizeEnd={endGesture}
            onResizeGroup={({ events }) =>
              patch(
                Object.fromEntries(
                  events.map((e) => [
                    idOf(e.target),
                    { w: round(e.width / ppm), h: round(e.height / ppm), x: round(e.drag.left / ppm), y: round(e.drag.top / ppm) },
                  ])
                ),
                "preview"
              )
            }
            onResizeGroupEnd={endGesture}
            onRotate={({ target, rotation }) =>
              // Kept between -180 and 180 degrees.
              patch({ [idOf(target)]: { rotation: Math.round((((rotation % 360) + 540) % 360) - 180) } }, "preview")
            }
            onRotateEnd={endGesture}
          />
        </div>

        {/* Selected element + layers */}
        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-gray-200 bg-white p-3">
          {selectedElements.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {single ? single.name || single.type : `${selectedElements.length} selected`}
                </h3>
                <button type="button" onClick={() => setSelected(new Set())} className="grid h-6 w-6 place-items-center rounded text-gray-500 hover:bg-gray-100" aria-label="Clear selection">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                <button type="button" className={toolButton} title="Align left" aria-label="Align left" onClick={() => align("left")}><AlignStartVertical className="h-4 w-4" /></button>
                <button type="button" className={toolButton} title="Align centre" aria-label="Align centre" onClick={() => align("hcenter")}><AlignCenterVertical className="h-4 w-4" /></button>
                <button type="button" className={toolButton} title="Align right" aria-label="Align right" onClick={() => align("right")}><AlignEndVertical className="h-4 w-4" /></button>
                <button type="button" className={toolButton} title="Align top" aria-label="Align top" onClick={() => align("top")}><AlignStartHorizontal className="h-4 w-4" /></button>
                <button type="button" className={toolButton} title="Align middle" aria-label="Align middle" onClick={() => align("vmiddle")}><AlignCenterHorizontal className="h-4 w-4" /></button>
                <button type="button" className={toolButton} title="Align bottom" aria-label="Align bottom" onClick={() => align("bottom")}><AlignEndHorizontal className="h-4 w-4" /></button>
                <button type="button" className={toolButton} title="Bring to front" aria-label="Bring to front" onClick={() => stack("front")}><BringToFront className="h-4 w-4" /></button>
                <button type="button" className={toolButton} title="Send to back" aria-label="Send to back" onClick={() => stack("back")}><SendToBack className="h-4 w-4" /></button>
                <button type="button" className={toolButton} title="Duplicate (Ctrl+D)" aria-label="Duplicate" onClick={() => addElements(copies(selectedElements, 2))}><Copy className="h-4 w-4" /></button>
                <button type="button" className={`${toolButton} text-red-600`} title="Delete" aria-label="Delete" onClick={() => remove(selected)}><Trash2 className="h-4 w-4" /></button>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">One element lines up with the card; several line up with each other.</p>
            </section>
          )}

          {single ? (
            <section className="border-t border-gray-100 pt-3">
              <EditorProperties
                key={single.id}
                element={single}
                fields={fields}
                onChange={(values) => {
                  const clean = readElement({ ...single, ...values });
                  if (!clean) return;
                  // Text changed here: letter styles no longer match it.
                  if (clean.text !== single.text) clean.spans = [];
                  patch({ [single.id]: { ...clean, id: single.id } });
                }}
                onReplaceImage={() => pickImage(single.id)}
              />
            </section>
          ) : (
            selectedElements.length === 0 && (
              <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
                Click something on the card to change it, or add a new element from the left.
              </p>
            )
          )}

          <section className="border-t border-gray-100 pt-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Layers</h3>
            <EditorLayers
              elements={layout.elements}
              selected={selected}
              onSelect={(id, add) =>
                setSelected((current) => {
                  if (!add) return new Set([id]);
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onToggle={(id, key) => {
                const element = layout.elements.find((item) => item.id === id);
                if (element) patch({ [id]: { [key]: !element[key] } });
              }}
              onMove={moveLayer}
            />
          </section>
        </aside>
      </div>

      <Modal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === "close" ? "Close without saving?" : "Start from this template?"}
        description={
          confirm?.kind === "close"
            ? "The changes made since the last save will be lost."
            : `The ${face} design is replaced by the template. You can still undo it.`
        }
        cancelText="Cancel"
        submitText={confirm?.kind === "close" ? "Close" : "Use template"}
        onSubmit={() => {
          if (confirm?.kind === "close") onClose();
          else if (confirm?.kind === "template") applyTemplate(confirm.design);
          setConfirm(null);
        }}
      />
    </div>
  );
}

export default IdCardEditor;
