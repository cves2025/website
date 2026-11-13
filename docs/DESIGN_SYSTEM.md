# Design system: colours and components

The rules every screen of the admin panel follows. Before styling anything, use what is listed
here; do not invent new colours or build a new component when one below does the job.

## Colours

| Use it for | Class / constant | Value |
|---|---|---|
| **School gradient (cves)**: primary buttons (Save, Add, Show Report, Export), active tabs and toggles, progress bars, selected states | `bg-cves`; button classes `CVES_BUTTON` (always) / `CVES_ON_HOVER` (outline that turns cves on hover) from `src/constants.ts`; `variant="cves"` on `Button` / `CustomButton` | green #009746 → indigo #393186 → pink #e7087e → red #e31e25 |
| **Navy**: table group rows (e.g. Permissions: Account, School ...), section bars, strong headings on light cards. **Use navy where blue was used before** | `bg-navy`, `text-navy`, `border-navy`; lighter `navy-light`, tint `navy-soft` | #0f1f4b, #1e3a8a, #e8ecf7 |
| Page titles (`PageHeader`) | `titleStyle="text-primaryBlue"` | #393186 |
| School colours one by one (logo text, small accents) | `primaryGreen`, `primaryBlue`, `primaryPink`, `primaryRed` | #009746, #393186, #E7087E, #E31E25 |
| Pink accent: switches ON, focus rings, selected choice cards | `primaryPink` / `#ad1a6f` (choice cards `border-[#ad1a6f] bg-[#fdf2f7]`) | |
| Dashboard banner and its top bar | `DASHBOARD_GRADIENT` (constants) | #a8196f → #c2410c |
| Success / paid / on | `green-*` / `emerald-*` (e.g. `bg-emerald-50 text-emerald-700`) | |
| Error / dues / delete | `red-*` (e.g. `bg-red-50 text-red-700`, delete buttons `bg-red-600`) | |
| Warning / unsaved / attention | `amber-*` (e.g. `bg-amber-100 text-amber-800`) | |
| Text | headings `text-gray-900` / `#1b2233`; body `text-gray-700`; muted `text-gray-500` / `#566178` | |
| Page background / cards | page `bg-gray-100`; cards `bg-white rounded-lg|xl shadow-sm` with `border-gray-200` | |

**Blue is being replaced by navy.** New code must not use `blue-*`. Today `blue-*` still appears
~286 times in 71 `.tsx` files (`grep -rE "(bg|text|border)-blue-[0-9]+" src`); move a screen to
navy / cves when it is next worked on, or in one planned pass.

## Loader

One loader for the whole app, in the school colours (`bg-cves-ring`):
`src/custom-components/Loader.tsx`

- `Loader` - page / section loading (`label`, `fullScreen` default true, `size` xs/sm/md/lg).
- `Spinner` - inline (in a button, a table cell, a number that is loading); `tone="white"` on dark.

Never add another spinner or "Loading..." box style.

## Components: always use these

All in `src/custom-components`. Forms use react-hook-form; a screen without a form makes a small
`useForm` for them. **Do not add new shadcn components or hand-made copies of these.**

| Need | Component |
|---|---|
| Page title + description + buttons on the right | `PageHeader` |
| Button | `Button` / `CustomButton` (`variant="cves"` for the main action, `outline` for the rest) |
| Dropdown (every one, searchable too) | `CustomSelect` (RHF); `SelectDropdown` only where it is already used without a form |
| Text / number / date input | `CustomInput` (RHF); `DatePicker`, `TimePicker` |
| Textarea | `CustomTextarea` |
| Switch / toggle | `CustomToggle` (RHF; empty `activeLabel` / `inactiveLabel` in tables) |
| Checkbox | `CircleCheckbox`; groups `CustomCheckboxGroup` |
| Radio | `CustomRadioGroup` / `RadioOptions` |
| Multi-select with search | `SearchableMultiSelect` |
| Dialog / confirm | `Modal` (has a secondary action, `hideSubmit`, children) |
| Inline success / error message | `FormMessage`; toasts via `react-hot-toast` |
| One-line text that must fit | `FitText` |
| Tooltip on hover / focus (instead of the `title` attribute) | `Tooltip` (`content`, optional `side`, `delay`); navy bubble with an arrow, drawn in a portal |
| Rich text | `RichText` (show), `RichTextEditor` (edit) |
| Admission form look | `custom-components/admission/*` |

If a screen truly needs something not listed, extend the closest component with an optional prop
(as `CustomToggle` got `disabled` / `ariaLabel`) instead of building a new one, and add it here.
