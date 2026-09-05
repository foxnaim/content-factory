import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const api = process.env.API_URL ?? "http://127.0.0.1:3001/api";
const statePath = process.env.SMOKE_STATE_PATH ?? "/tmp/content-factory-smoke-state.json";
const runId = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const fixture = JSON.parse(await readFile(new URL("../examples/batch-import.json", import.meta.url), "utf8"));
fixture.name = `Smoke batch ${runId}`;
fixture.idempotency_key = `smoke-${runId}`;

async function request(path, init = {}, expected = 200) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers }
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; }
  catch { body = text; }
  assert.equal(response.status, expected, `${path}: expected ${expected}, received ${response.status}: ${text}`);
  return body;
}

const live = await request("/health/live");
const ready = await request("/health/ready");
assert.equal(live.status, "ok");
assert.equal(ready.database, "reachable");

const project = await request("/projects", {
  method: "POST",
  body: JSON.stringify({ name: `Smoke Project ${runId}`, description: "Disposable local integration check" })
}, 201);
const channel = await request(`/projects/${project.id}/channels`, {
  method: "POST",
  body: JSON.stringify({ name: "English Shorts", language: "en" })
}, 201);
const batch = await request(`/channels/${channel.id}/batches/import`, {
  method: "POST",
  body: JSON.stringify(fixture)
}, 201);
assert.equal(batch.items.length, 10);
assert.ok(batch.items.every((item) => item.status === "draft"));

const replay = await request(`/channels/${channel.id}/batches/import`, {
  method: "POST",
  body: JSON.stringify(fixture)
}, 201);
assert.equal(replay.id, batch.id, "idempotent replay created a second batch");

const conflictFixture = structuredClone(fixture);
conflictFixture.data[0].topic += " changed";
await request(`/channels/${channel.id}/batches/import`, {
  method: "POST",
  body: JSON.stringify(conflictFixture)
}, 409);

const tooSmall = structuredClone(fixture);
tooSmall.idempotency_key += "-too-small";
tooSmall.data = tooSmall.data.slice(0, 9);
await request(`/channels/${channel.id}/batches/import`, {
  method: "POST",
  body: JSON.stringify(tooSmall)
}, 400);

let queuedItem = null;
if (process.argv.includes("--queue-first")) {
  queuedItem = await request(`/items/${batch.items[0].id}/queue`, { method: "POST", body: "{}" }, 201);
  const queue = await request("/queue");
  assert.ok(queue.some((entry) => entry.stage === "script"));
}

const state = {
  api,
  project_id: project.id,
  channel_id: channel.id,
  batch_id: batch.id,
  first_item_id: batch.items[0].id,
  imported_items: batch.items.length,
  idempotent_replay: true,
  conflict_rejected: true,
  undersized_batch_rejected: true,
  queued_item: queuedItem
};
await writeFile(statePath, JSON.stringify(state, null, 2));
console.log(JSON.stringify(state, null, 2));
