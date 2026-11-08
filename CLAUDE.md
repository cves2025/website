# CVES school website + admin panel

React 19 + Vite + Tailwind 3.4 + Firebase (Firestore, Auth, Storage). Run commands from `website/`.
The backend (`../server`, Express) only creates teacher login accounts (`/api/add-teacher`); it is a separate git repo.

## Feature maps: read these first

Before changing a feature, open its map and go straight to the files it names. Read only the
part of a file you change (use line ranges / grep), not the whole feature.

| Feature | Map |
|---|---|
| ID Card page, card designer (Canva-like), ID settings | [docs/features/id-card.md](docs/features/id-card.md) |
| Fee receipt: print settings (paper, copies), 4 designs | [docs/features/fee-receipt.md](docs/features/fee-receipt.md) |
| Collect Fee page (search, fee account, payment) | [docs/features/collect-fee.md](docs/features/collect-fee.md) |
| Dashboard (attendance + fee cards, aggregation queries) | [docs/features/dashboard.md](docs/features/dashboard.md) |
| Add Teacher: teachers, staff, Job Role | [docs/features/teacher-staff.md](docs/features/teacher-staff.md) |
| Fee module business rules (heads, dues, carry forward) | [docs/FEE_MANAGEMENT.md](docs/FEE_MANAGEMENT.md) |

**Keep the maps true:** a commit that changes a mapped feature (new file, moved logic, new
Firestore field) updates its map in the same commit. A feature with no map gets one when it is
next worked on.

## Conventions

- New constants (option lists, sizes, colours, template data) go in `src/constants.ts`;
  `src/utils/*` hold functions only; shared types in `src/utils/type.ts`.
- Firestore reads go through `use...` hooks in `src/hooks` (most built on `useAsyncData`),
  never inline fetches in components. Prefer `getCountFromServer` / `getAggregateFromServer`
  over reading many documents.
- UI uses the project's own `src/custom-components` (CustomSelect, CustomInput, CircleCheckbox,
  Modal, CustomButton ...); every dropdown is `CustomSelect` with a small `useForm`.
  Do not add new shadcn components.
- School gradient: Tailwind `bg-cves`; shared button classes `CVES_BUTTON`, `CVES_ON_HOVER`.
  One app loader: `Loader` / `Spinner` in `custom-components/Loader.tsx`.
- Permissions: `src/permissions` (`PERMISSIONS`, `ROUTE_PERMISSIONS`); `can()` from `myContext`.
- Firestore: database `(default)` = dev, `prod` = prod (`src/firebase/config.ts`). Index files
  `firestore.indexes.dev.json` / `.prod.json`; never deploy with `--force`.
- Firestore rejects `undefined` values: build objects without undefined keys.
- Many files use CRLF line endings; exact-string replacements must keep them.
- Verify with `npx tsc --noEmit -p .` and `npx vite build` (ESLint ignores most panel files).
