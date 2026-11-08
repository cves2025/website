# ID Card

Route `/welcome/id-card?tab=student|teacher|staff|admin` (`ID_CARD_PATH`). One sidebar link;
old `/welcome/id-card/students` etc. redirect to their tab (`component/Router.tsx`). The page opens
with any `IDCARD_*` permission; each tab needs its own (`KIND_PERMISSION` in `IdCardPage.tsx`).
Only admins see ID Settings and the designer.

## Files

| File | What it does |
|---|---|
| `src/component/panel/idcard/IdCardPage.tsx` | Tabs, people list (session/class/section for students, search, checkboxes, select all), preview (max 24 cards), owns the settings form (`useForm<IdCardSettings>`), `save` and `saveDesign` (designer save), opens panel + designer |
| `src/component/panel/idcard/IdCardSettingsPanel.tsx` | Side panel: open designer, print orientation, card size (mm, all tabs), validity, Save, Apply to all tabs, Reset tab |
| `src/component/panel/idcard/IdCardView.tsx` | Renderer. `CardFace` draws a layout (elements absolutely placed; `unit` = mm in preview, px in designer). `cardValues` (person values + validTill + cardTitle). `IdCardView` = preview card (scales layout to card size). `Spans` = letter-by-letter styled text; contentEditable typing box; `RICH_TOOLBAR_ATTR` |
| `src/component/panel/idcard/editor/IdCardEditor.tsx` | Full-screen designer: face tabs (horizontal/vertical), undo/redo, zoom, Add menu, data-field picker, image upload, templates, canvas + `react-moveable` (drag/resize/rotate/snap, `edge`, `linePadding`), keyboard shortcuts, align/stack/duplicate/delete, rich-text toolbar (`styleLetters` via `execCommand`), `finishTyping` |
| `src/component/panel/idcard/editor/EditorProperties.tsx` | Selected element's form (position, size, angle, opacity, text/field, font, B/I/U/AA, colours, align, overflow, fill/gradient/border/radius, fit, lock/hide). Emits only user changes (`type === "change"`); catches up on drags without clobbering typed numbers |
| `src/component/panel/idcard/editor/EditorLayers.tsx` | Layers list: select, hide, lock, move up/down |
| `src/utils/idCardSettings.ts` | `defaultTab`, `defaultIdCardSettings`, `readIdCardSettings` / `readElement` / `readSpans` (sanitise Firestore + migrate old Part-2 docs that only had `design`), `applyTabToAll`, `cardSize`, `scaleLayout`, `validityText`, `idCardFields(kind)` |
| `src/utils/idCardTemplates.ts` | `makeElement` (all defaults), `newElementId`, `templateLayout(design, orientation, kind)` |
| `src/utils/idCardRichText.ts` | `spansToHtml`, `spansFromEditable` (contentEditable DOM -> spans) |
| `src/utils/idCardPeople.ts` | `studentCard`, `memberCard`, `sampleCard` -> `IdCardPerson` |
| `src/utils/idCardService.ts` | `loadIdCardSettings`, `saveIdCardSettings`, `loadSchoolSigns` (cached) |
| `src/hooks/useIdCardSettings.ts` | `useIdCardSettings`, `useSchoolSigns` |
| `src/hooks/useHistoryState.ts` | Undo/redo state: `set` (step), `preview` + `commit` (one step per drag) |
| `src/firebase/idCardImages.ts` | `uploadIdCardImage` -> Storage `idCard/images/` (PNG/SVG/WebP <= 2 MB kept as is) |

People come from `useSectionStudents` (students; has `phone`) and `useTeachers(role)` (`"teacher"`,
`"staff"`, `"admin"`; `""` reads nothing). Student photos fall back to `useStudentPhoto` (cached).

## Data

Firestore `settings/idCard` (`COLLECTION.SETTINGS`, `ID_CARD_SETTINGS_DOC`):
`{ width, height, tabs: { student|teacher|staff|admin: { orientation, horizontal, vertical, validity } } }`.
A layout is `{ width, height, elements: IdCardElement[] }` in mm; it is stretched with
`scaleLayout` to the card size (positions per side, font/border/radius by the smaller ratio).
Types in `src/utils/type.ts` (`IdCardElement`, `IdCardSpan`, `IdCardLayout`, `IdCardTabSettings`...).
Signature / stamp come from `stampSign/principle` (uploaded in admit card settings).

## Change X -> look here

- New data field on cards: `ID_CARD_FIELD_KEYS` (constants) + values in `idCardPeople.ts`.
- New element type: `IdCardElementType` (type.ts), `ELEMENT_TYPES` in `idCardSettings.ts`,
  rendering in `CardFace`, `ID_CARD_ADD_OPTIONS` + `NEW_SIZE`/`newElement` in `IdCardEditor.tsx`,
  properties in `EditorProperties.tsx`.
- Template look / positions: `ID_CARD_TEMPLATE_PALETTES`, `ID_CARD_TEMPLATE_PLANS` (constants);
  structure in `templateLayout`.
- Fonts, swatches, zoom steps, nudge, undo limit: `ID_CARD_*` in constants.
- Handles look: `.id-card-moveable` in `src/index.css`.

## Gotchas

- New element props must get a default in `makeElement` and be read in `readElement`.
- Spans: only set styles are stored (no `undefined`); editing text in the side panel clears spans.
- The designer works at the card's own size (`scaleLayout` on open); 1 mm = `PX_PER_MM * zoom` px.
- Moveable: don't call `updateRect` during a gesture (`gesturing` ref).
- Export (PNG/ZIP, Part 3) is not built yet.
