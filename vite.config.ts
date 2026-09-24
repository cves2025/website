import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";

const projectRoot = dirname(fileURLToPath(import.meta.url));

// Human-readable app version taken from package.json. It is bumped
// automatically before every deploy (npm run deploy -> predeploy -> version:bump)
// and shown in the app (sidebar) via __APP_VERSION_LABEL__.
const { version: APP_VERSION } = JSON.parse(
  readFileSync(resolve(projectRoot, "package.json"), "utf8"),
) as { version: string };

// Unique build id generated once per build run. It is injected into the app
// as __APP_VERSION__ and written to dist/version.json so clients can detect
// that a newer deployment exists. Kept separate from the semver label so the
// update check stays unique even if package.json was never bumped.
const BUILD_ID = Date.now().toString();

// Emits dist/version.json containing the build id and the human version.
function buildVersionPlugin(): Plugin {
  return {
    name: "build-version",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: BUILD_ID, appVersion: APP_VERSION }),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), buildVersionPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_ID),
    __APP_VERSION_LABEL__: JSON.stringify(APP_VERSION),
  },
  base: "/",
});