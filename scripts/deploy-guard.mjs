#!/usr/bin/env node
/**
 * Deploy guard. MIRROR: website/, server/ and mobile/ scripts/deploy-guard.mjs
 * are the same file; the targets of each repo are in its deploy-targets.json.
 *
 *   node scripts/deploy-guard.mjs <target> [--yes]
 *       Runs the target's command (deploy / build). When none of its files
 *       changed since its last successful run, it asks first ("Deploy again?",
 *       default No). --yes = no question.
 *   node scripts/deploy-guard.mjs status [--all]
 *       What is deployed and what changed since; --all = website, server and
 *       mobile together.
 *   node scripts/deploy-guard.mjs mark <target>
 *       Records the files as they are now as deployed, without running
 *       anything (for something already deployed by hand).
 *
 * A target's fingerprint is a hash of its files (contents; CRLF = LF; the
 * "version" / "versionCode" of package.json and app.json do not count, as the
 * build bumps them). The last run is kept in .deploy-state.json on this
 * laptop (git-ignored), written only after the command succeeded. Secret
 * files (.env, env.yaml) are only hashed, never printed.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS_FILE = "deploy-targets.json";
const STATE_FILE = ".deploy-state.json";
const REPOS = ["website", "server", "mobile"];
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".expo", "android", "ios", ".claude", ".vscode", "coverage",
]);
const BINARY = /\.(png|jpe?g|gif|webp|ico|bmp|svgz|ttf|otf|woff2?|eot|pdf|apk|aab|mp3|mp4|zip)$/i;
const VERSION_FIELDS = /"(version|versionCode)"\s*:\s*("[^"]*"|\d+)/g;
const MAX_LISTED = 15;

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

/** Every file under `rel` ("" = the whole repo), as "a/b.ts" paths. */
function walk(root, rel, out) {
  const full = path.join(root, rel);
  let stat;
  try {
    stat = fs.statSync(full);
  } catch {
    return; // a listed file that does not exist (e.g. no .env.prod yet)
  }
  if (!stat.isDirectory()) {
    out.push(rel);
    return;
  }
  for (const name of fs.readdirSync(full)) {
    if (SKIP_DIRS.has(name)) continue;
    walk(root, rel ? `${rel}/${name}` : name, out);
  }
}

/** "*.md" (any .md), "docs/" (a folder) or an exact path. */
function excluded(rel, patterns) {
  return patterns.some((pattern) =>
    pattern.startsWith("*.")
      ? rel.endsWith(pattern.slice(1))
      : pattern.endsWith("/")
        ? rel.startsWith(pattern)
        : rel === pattern
  );
}

function fileHash(root, rel) {
  let data = fs.readFileSync(path.join(root, rel));
  if (!BINARY.test(rel)) {
    let text = data.toString("utf8").replace(/\r\n/g, "\n");
    if (/(^|\/)(package|app)\.json$/.test(rel)) text = text.replace(VERSION_FIELDS, '"$1": 0');
    data = Buffer.from(text, "utf8");
  }
  return createHash("sha1").update(data).digest("hex");
}

/** { hash, files: { path: sha1 } } of a target now. */
function fingerprint(root, target) {
  const list = [];
  for (const entry of target.files) walk(root, entry, list);
  const skip = [STATE_FILE, ...(target.exclude ?? [])];
  const files = {};
  [...new Set(list)]
    .filter((rel) => !excluded(rel, skip))
    .sort()
    .forEach((rel) => {
      files[rel] = fileHash(root, rel);
    });
  const hash = createHash("sha256").update(JSON.stringify(files)).digest("hex");
  return { hash, files };
}

/** Changed / new / removed paths between a saved run and now. */
function changes(before, now) {
  const out = [];
  for (const [rel, sha] of Object.entries(now.files)) {
    if (!(rel in before.files)) out.push(`+ ${rel}`);
    else if (before.files[rel] !== sha) out.push(`~ ${rel}`);
  }
  for (const rel of Object.keys(before.files)) if (!(rel in now.files)) out.push(`- ${rel}`);
  return out;
}

const when = (iso) => {
  const date = new Date(iso);
  const text = date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  const ago =
    minutes < 60 ? `${minutes} min ago` : minutes < 60 * 48 ? `${Math.round(minutes / 60)} h ago` : `${Math.round(minutes / 1440)} days ago`;
  return `${text} (${ago})`;
};

const gitCommit = (root) => {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
};

async function ask(question) {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return answer === "y" || answer === "yes";
}

/* ------------------------------------------------------------- run -- */

async function run(name, yes) {
  const targets = readJson(path.join(ROOT, TARGETS_FILE), {});
  const target = targets[name];
  if (!target) {
    console.error(`Unknown target "${name}". Targets: ${Object.keys(targets).join(", ")}`);
    process.exit(1);
  }
  const verb = target.verb ?? "deployed";
  const stateFile = path.join(ROOT, STATE_FILE);
  const state = readJson(stateFile, {});
  const last = state[name];
  const now = fingerprint(ROOT, target);

  if (last && last.hash === now.hash) {
    console.log(`\n!  ${target.label} was ${verb} ${when(last.at)}${last.commit ? `, commit ${last.commit}` : ""}.`);
    console.log("   Nothing has changed since then.\n");
    const again = yes || (await ask(`   ${verb === "built" ? "Build" : "Deploy"} again anyway? (y/N) `));
    if (!again) {
      console.log(process.stdin.isTTY ? "   Skipped." : "   Skipped (add --yes to run it anyway).");
      return;
    }
  } else if (last) {
    const list = changes(last, now);
    console.log(`\n${target.label}: ${list.length} file(s) changed since it was ${verb} ${when(last.at)}:`);
    list.slice(0, MAX_LISTED).forEach((line) => console.log(`   ${line}`));
    if (list.length > MAX_LISTED) console.log(`   ... and ${list.length - MAX_LISTED} more`);
    console.log("");
  } else {
    console.log(`\n${target.label}: no earlier run recorded on this laptop.\n`);
  }

  const result = spawnSync(target.command, { cwd: ROOT, shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\nx  ${target.label}: the command failed, so nothing was recorded.`);
    process.exit(result.status ?? 1);
  }
  // After the command: the build may have bumped versions (they do not count anyway).
  const done = fingerprint(ROOT, target);
  state[name] = { hash: done.hash, files: done.files, at: new Date().toISOString(), commit: gitCommit(ROOT) };
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 1)}\n`);
  console.log(`\nok ${target.label} ${verb}; recorded in ${STATE_FILE}.`);
}

/** Records the files as they are now as deployed, without running anything. */
function mark(name) {
  const targets = readJson(path.join(ROOT, TARGETS_FILE), {});
  const target = targets[name];
  if (!target) {
    console.error(`Unknown target "${name}". Targets: ${Object.keys(targets).join(", ")}`);
    process.exit(1);
  }
  const stateFile = path.join(ROOT, STATE_FILE);
  const state = readJson(stateFile, {});
  const now = fingerprint(ROOT, target);
  state[name] = { hash: now.hash, files: now.files, at: new Date().toISOString(), commit: gitCommit(ROOT) };
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 1)}\n`);
  console.log(`ok ${target.label}: the files as they are now are recorded as ${target.verb ?? "deployed"}.`);
}

/* ---------------------------------------------------------- status -- */

function statusOf(root) {
  const targets = readJson(path.join(root, TARGETS_FILE), null);
  if (!targets) return [];
  const state = readJson(path.join(root, STATE_FILE), {});
  return Object.entries(targets).map(([name, target]) => {
    const last = state[name];
    const verb = target.verb ?? "deployed";
    if (!last) return [target.label, "never", "-", `npm run ${target.npm ?? name}`];
    const now = fingerprint(root, target);
    const changed = last.hash === now.hash ? "no changes" : `CHANGED (${changes(last, now).length} files)`;
    return [target.label, `${verb} ${when(last.at)}`, changed, last.hash === now.hash ? "" : `npm run ${target.npm ?? name}`];
  });
}

function status(all) {
  const roots = all
    ? REPOS.map((repo) => path.resolve(ROOT, "..", repo)).filter((root) => fs.existsSync(path.join(root, TARGETS_FILE)))
    : [ROOT];
  const rows = roots.flatMap((root) =>
    statusOf(root).map(([label, last, changed, how]) => [`${path.basename(root)}: ${label}`, last, changed, how])
  );
  const header = ["What", "Last run", "Since then", "To run"];
  const widths = header.map((title, index) => Math.max(title.length, ...rows.map((row) => row[index].length)));
  const line = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join("   ");
  console.log(`\n${line(header)}\n${widths.map((width) => "-".repeat(width)).join("   ")}`);
  rows.forEach((row) => console.log(line(row)));
  console.log("");
}

const [command, ...rest] = process.argv.slice(2);
if (!command) {
  console.error("Use: node scripts/deploy-guard.mjs <target> [--yes] | status [--all]");
  process.exit(1);
}
if (command === "status") status(rest.includes("--all"));
else if (command === "mark") mark(rest[0]);
else await run(command, rest.includes("--yes"));
