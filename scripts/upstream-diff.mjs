#!/usr/bin/env node
// Shows what changed in the upstream teach skill since the commit pinned in skills/tutor/UPSTREAM.md.
// Usage: node scripts/upstream-diff.mjs
// Needs node 18+ (global fetch) and git on PATH. Writes snapshots to .upstream-cache/ (gitignored).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "mattpocock/skills";
const DIR = "skills/productivity/teach";
const FILES = [
  "SKILL.md",
  "MISSION-FORMAT.md",
  "RESOURCES-FORMAT.md",
  "LEARNING-RECORD-FORMAT.md",
  "GLOSSARY-FORMAT.md",
  "agents/openai.yaml",
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstreamMd = await readFile(path.join(root, "skills", "tutor", "UPSTREAM.md"), "utf8");
const pinned = /Pinned commit: `([0-9a-f]{40})`/.exec(upstreamMd)?.[1];
if (!pinned) {
  console.error("No pinned commit found in skills/tutor/UPSTREAM.md");
  process.exit(1);
}

const headers = { "user-agent": "tutor-skill-upstream-diff" };

async function fetchText(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function snapshot(ref) {
  const dir = path.join(root, ".upstream-cache", ref);
  for (const file of FILES) {
    const text = await fetchText(`https://raw.githubusercontent.com/${REPO}/${ref}/${DIR}/${file}`);
    const target = path.join(dir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text);
  }
  return dir;
}

console.log(`Pinned: ${pinned}`);

const commitsRes = await fetch(`https://api.github.com/repos/${REPO}/commits?path=${DIR}&per_page=10`, { headers });
const commits = commitsRes.ok ? await commitsRes.json() : [];
const latest = Array.isArray(commits) && commits.length ? commits[0].sha : null;

if (Array.isArray(commits) && commits.length) {
  console.log("\nRecent upstream commits touching teach:");
  for (const c of commits) {
    const mark = c.sha === pinned ? "  <- pinned" : "";
    console.log(`  ${c.sha.slice(0, 7)}  ${c.commit.author.date.slice(0, 10)}  ${c.commit.message.split("\n")[0]}${mark}`);
  }
}

// No process.exit() after a fetch: on Windows, Node can assert while closing the
// keep-alive handles. Let the script end on its own instead.
if (latest && latest === pinned) {
  console.log("\nUp to date: the pinned commit is the latest one touching teach.");
} else {
  const before = await snapshot(pinned);
  const after = await snapshot("main");

  const stat = spawnSync("git", ["diff", "--no-index", "--stat", before, after], { encoding: "utf8" });
  console.log("\n" + (stat.stdout.trim() || "(no differences in the tracked files)"));

  const full = spawnSync("git", ["diff", "--no-index", before, after], { encoding: "utf8" });
  if (full.stdout.trim()) console.log("\n" + full.stdout);

  console.log(`\nPort what applies into skills/tutor, then update the pin in UPSTREAM.md${latest ? ` to ${latest}` : ""}.`);
}
