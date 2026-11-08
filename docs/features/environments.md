# Environments: dev and prod Firebase projects

| | dev (and staging) | prod |
|---|---|---|
| Firebase project | `schoolproject-284dc` | `childrensvalley` (since 2026-11-08) |
| Firestore | `(default)` | `(default)` (free tier) |
| Auth | dev project | prod project (own users) |
| Storage (new uploads) | `schoolproject-284dc.appspot.com` | `childrensvalley.firebasestorage.app` |
| Website env file | `.env.development` (`npm run dev`), `.env.staging` (`build:dev`) | `.env.production` |
| Deploy rules / indexes | `npm run deploy:rules:dev` | `npm run deploy:rules:prod` (firebase.prod.json: rules, indexes, storage rules) |
| Deploy website | `npm run deploy:dev` (Firebase Hosting, dev target) | `npm run deploy` (GitHub Pages, www.cves.in) |
| Deploy server | `npm run deploy` in `server/` (one Cloud Run service for both, `env.yaml`) | same |

All prod pictures are in `childrensvalley.firebasestorage.app` (copied 2026-11-08 from
`school-project-prod-photos` and the dev bucket, links rewritten by
`server/scripts/rewriteStorageUrls.js`; dry run, `--copy`, `--apply`).

## Files

| File | What it does |
|---|---|
| `src/firebase/config.ts` | Web app init from `VITE_FIREBASE_*`; `APP_ENV`; Firestore `VITE_FIRESTORE_DB_ID` |
| `.env.*` | Per-mode config (see table) |
| `firebase.json` | Dev project: `(default)` + legacy `prod` database rules / indexes, hosting target `dev` |
| `firebase.prod.json` | Prod project: `(default)` rules + `firestore.indexes.prod.json`, `storage.rules` |
| `.firebaserc` | Aliases `default` = dev project, `prod` = `childrensvalley` |
| `storage-cors.json` | CORS for Storage buckets (ID card export reads images) |
| `../server/config/firebase.js` | Two admin apps: dev (`FIREBASE_PROJECT_ID`) and prod (`PROD_FIREBASE_PROJECT_ID`); `getAuthFor(env)`, `getDb(env)`. Without `PROD_FIREBASE_PROJECT_ID` prod falls back to the dev project's `prod` database |
| `../server/middleware/authMiddleware.js` | Checks the login token with the Auth of the request's env (`X-App-Env`) |
| `../server/router/routeHandler.js` | New teacher accounts are created in the env's Auth |
| `../server/env.yaml` (not in git) | Cloud Run env vars; has `PROD_FIREBASE_PROJECT_ID: "childrensvalley"` |

## Move to `childrensvalley` - checklist

Done:
1. Prod Firestore exported from `schoolproject-284dc/prod` and imported into
   `childrensvalley/(default)` (1,071 documents) via bucket `gs://cves-migration-temp`.
2. 9 Auth users exported and imported with the old SCRYPT hash settings (same UIDs).
3. Code: server per-env projects, `.env.production`, `firebase.prod.json`, `.firebaserc` alias.

4. Email/Password sign-in and Storage (asia-south1) enabled in `childrensvalley`.
5. Cloud Run service account `913523658602-compute@developer.gserviceaccount.com` got
   `roles/firebaseauth.admin`, `roles/datastore.user`, `roles/serviceusage.serviceUsageConsumer`
   in `childrensvalley`.
6. Rules, indexes and storage rules deployed to `childrensvalley`; CORS set on its bucket.
7. Pictures: 386 files copied into `childrensvalley.firebasestorage.app` (60 from
   `school-project-prod-photos`, 326 from `schoolproject-284dc.appspot.com`), 377 documents now
   link there; server redeployed with `PROD_FIREBASE_PROJECT_ID`.

Still to do:
8. Build + deploy the prod website (`npm run deploy`).
9. Check: a teacher and an admin log in (old passwords), lists load, a photo upload and a new
   teacher work.
10. Then delete the `prod` database in `schoolproject-284dc` (and its entry in `firebase.json`),
   the bucket `gs://cves-migration-temp`, the local auth export file, and (once nothing links
   to it) `school-project-prod-photos`. Keep the dev bucket: dev still uses it.
