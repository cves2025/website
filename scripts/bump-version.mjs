/**
 * Bumps the patch version in package.json (0.0.0 -> 0.0.1 -> 0.0.2 ...).
 *
 * Pure Node — no shell commands, works on Windows, macOS and Linux.
 * Run automatically before every deploy via the "predeploy" npm script.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), "../package.json");
const content = readFileSync(pkgPath, "utf8");

const re = /"version"\s*:\s*"[^"]*"/;
const match = content.match(re);
if (!match) {
  throw new Error('package.json mein "version" field nahi mili');
}

const current = match[0].match(/:\s*"([^"]+)"/)?.[1] ?? "0.0.0";

// Strip any pre-release suffix ("1.2.3-beta.1" -> "1.2.3") then bump the patch.
const parts = current
  .split("-")[0]
  .split(".")
  .map((n) => {
    const num = Number.parseInt(n, 10);
    return Number.isNaN(num) ? 0 : num;
  });
const next = `${parts[0] ?? 0}.${parts[1] ?? 0}.${(parts[2] ?? 0) + 1}`;

writeFileSync(pkgPath, content.replace(re, `"version": "${next}"`), "utf8");
console.log(`Version bumped: ${current} -> ${next}`);
