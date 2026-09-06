#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignored = new Set([".git", "node_modules", ".next", "dist", "legacy", ".venv-kokoro"]);

async function markdownBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await markdownBelow(absolute));
    else if (extname(entry.name) === ".md") result.push(absolute);
  }
  return result;
}

const files = await markdownBelow(root);
let links = 0;
for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const destination = match[1].trim().replace(/^<|>$/g, "");
    if (/^(https?:|mailto:|#)/.test(destination)) continue;
    const local = decodeURIComponent(destination.split("#")[0]);
    if (!local) continue;
    links += 1;
    await assert.doesNotReject(access(resolve(dirname(file), local)), `${file}: missing ${destination}`);
  }
}

console.log(`markdown links: ${files.length} files, ${links} local links, passed`);
