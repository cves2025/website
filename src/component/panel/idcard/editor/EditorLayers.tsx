/**
 * Designer: every element, top of the card first. Click to select (Shift /
 * Ctrl adds), the eye hides, the lock stops it moving, arrows change what
 * is on top.
 */
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, LockOpen } from "lucide-react";

import type { IdCardElement } from "../../../../utils/type";

interface EditorLayersProps {
  elements: IdCardElement[];
  selected: ReadonlySet<string>;
  onSelect: (id: string, add: boolean) => void;
  onToggle: (id: string, key: "hidden" | "locked") => void;
  /** +1 one step up (nearer the top), -1 down. */
  onMove: (id: string, step: 1 | -1) => void;
}

const iconButton =
  "grid h-6 w-6 shrink-0 place-items-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30";

function EditorLayers({ elements, selected, onSelect, onToggle, onMove }: EditorLayersProps) {
  // The last element is drawn last, so it is on top: list it first.
  const ordered = elements.map((element, index) => ({ element, index })).reverse();
  return (
    <ul className="flex flex-col gap-0.5">
      {ordered.map(({ element, index }) => {
        const active = selected.has(element.id);
        return (
          <li
            key={element.id}
            className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-xs ${
              active ? "bg-[#fdf2f7] text-[#ad1a6f] ring-1 ring-[#ad1a6f]/40" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <button
              type="button"
              onClick={(event) => onSelect(element.id, event.shiftKey || event.ctrlKey || event.metaKey)}
              className={`min-w-0 flex-1 truncate text-left font-medium ${element.hidden ? "opacity-50" : ""}`}
              title={element.name}
            >
              {element.name || element.type}
            </button>
            <button type="button" className={iconButton} title={element.hidden ? "Show" : "Hide"} aria-label={element.hidden ? "Show" : "Hide"} onClick={() => onToggle(element.id, "hidden")}>
              {element.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button type="button" className={iconButton} title={element.locked ? "Unlock" : "Lock"} aria-label={element.locked ? "Unlock" : "Lock"} onClick={() => onToggle(element.id, "locked")}>
              {element.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            </button>
            <button type="button" className={iconButton} title="Bring forward" aria-label="Bring forward" disabled={index === elements.length - 1} onClick={() => onMove(element.id, 1)}>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" className={iconButton} title="Send backward" aria-label="Send backward" disabled={index === 0} onClick={() => onMove(element.id, -1)}>
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default EditorLayers;
