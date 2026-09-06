#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const runner = resolve(here, "../scripts/normalize-batch.mjs");
const temp = await mkdtemp(resolve(tmpdir(), "content-factory-batch-skill-"));
const input = resolve(temp, "input.json");
const output = resolve(temp, "output");
const items = Array.from({ length: 10 }, (_, index) => ({
  topic: `Original workflow lesson ${index + 1}`,
  language: "en",
  target_duration_sec: 35,
  series: index < 5 ? "workflow" : "quality",
}));
await writeFile(input, JSON.stringify(items));

const ok = spawnSync(process.execPath, [runner, "--input", input, "--out-dir", output, "--channel", "Demo"], { encoding: "utf8" });
assert.equal(ok.status, 0, ok.stderr);
const manifest = JSON.parse(await readFile(resolve(output, "batch-manifest.json"), "utf8"));
assert.equal(manifest.items.length, 10);
assert.equal(manifest.publication_mode, "manual_only");
assert.deepEqual(manifest.qa_sample.length, 2);
assert.equal(new Set(manifest.items.map((item) => item.external_id)).size, 10);

items[9].topic = items[0].topic.toUpperCase();
await writeFile(input, JSON.stringify(items));
const duplicate = spawnSync(process.execPath, [runner, "--input", input, "--out-dir", output], { encoding: "utf8" });
assert.notEqual(duplicate.status, 0);
assert.match(duplicate.stderr, /DUPLICATE_TOPIC/);

console.log("batch planner smoke test: passed");
