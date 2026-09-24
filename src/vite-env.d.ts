/// <reference types="vite/client" />

// Build-time constants injected by vite.config.ts (define).
// __APP_VERSION__ is a unique per-build id used for the update check,
// __APP_VERSION_LABEL__ is the human-readable package.json version.
declare const __APP_VERSION__: string;
declare const __APP_VERSION_LABEL__: string;