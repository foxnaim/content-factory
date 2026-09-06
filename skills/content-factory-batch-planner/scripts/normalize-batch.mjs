#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("Use --input FILE --out-dir DIR [--channel NAME] [--language en]");
    }
    result[key.slice(2)] = value;
  }
  if (!result.input || !result["out-dir"]) {
    throw new Error("Both --input and --out-dir are required");
  }
  return result;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'; index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (char !== "\r") field += char;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (field || row.length) { row.push(field); rows.push(row); }
  if (rows.length < 2) throw new Error("CSV must include a header and rows");
  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function canonicalTopic(topic) {
  return topic.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function stableId(topic, language) {
  return `item-${createHash("sha256").update(`${language}\0${canonicalTopic(topic)}`).digest("hex").slice(0, 12)}`;
}

async function loadItems(file) {
  const content = await readFile(file, "utf8");
  if (extname(file).toLowerCase() === ".json") {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.items;
  }
  return parseCsv(content);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputFile = resolve(args.input);
  const outputDir = resolve(args["out-dir"]);
  const sourceItems = await loadItems(inputFile);
  if (!Array.isArray(sourceItems) || sourceItems.length < 10 || sourceItems.length > 1000) {
    throw new Error("Batch must contain 10–1000 items");
  }

  const seen = new Map();
  const items = sourceItems.map((source, index) => {
    const topic = String(source.topic ?? "").trim().replace(/\s+/g, " ");
    if (!topic) throw new Error(`Row ${index + 1}: topic is required`);
    const language = String(source.language || args.language || "en").trim();
    const canonical = canonicalTopic(topic);
    if (seen.has(canonical)) {
      throw new Error(`DUPLICATE_TOPIC rows ${seen.get(canonical) + 1} and ${index + 1}: ${topic}`);
    }
    seen.set(canonical, index);
    const duration = Number(source.target_duration_sec || 35);
    if (!Number.isFinite(duration) || duration < 20 || duration > 60) {
      throw new Error(`Row ${index + 1}: target_duration_sec must be 20–60`);
    }
    return {
      topic,
      external_id: String(source.external_id || stableId(topic, language)),
      language,
      target_duration_sec: duration,
      notes: String(source.notes || ""),
      format: String(source.format || args.format || "shorts"),
      series: String(source.series || "unsorted"),
      priority: String(source.priority || "normal"),
      editorial_status: "idea",
      fact_check_required: source.fact_check_required === true,
    };
  });

  if (new Set(items.map((item) => item.external_id)).size !== items.length) {
    throw new Error("external_id values must be unique");
  }

  const firstBySeries = new Map();
  for (const item of items) if (!firstBySeries.has(item.series)) firstBySeries.set(item.series, item.external_id);
  const qaSample = [...new Set([
    ...firstBySeries.values(),
    ...items.filter((item) => item.priority === "high" || item.fact_check_required).map((item) => item.external_id),
  ])];

  const manifest = {
    version: 1,
    channel: args.channel || "[ДОБАВИТЬ МОИ ДАННЫЕ]",
    language: args.language || null,
    publication_mode: "manual_only",
    max_videos_per_day: args["max-per-day"] ? Number(args["max-per-day"]) : null,
    items,
    duplicate_groups: [],
    qa_sample: qaSample,
  };

  await mkdir(outputDir, { recursive: true });
  const csvHeaders = ["topic", "external_id", "language", "target_duration_sec", "notes"];
  const csv = [csvHeaders.join(","), ...items.map((item) => csvHeaders.map((key) => csvCell(item[key])).join(","))].join("\n") + "\n";
  await Promise.all([
    writeFile(resolve(outputDir, "normalized.csv"), csv),
    writeFile(resolve(outputDir, "batch-manifest.json"), JSON.stringify(manifest, null, 2) + "\n"),
  ]);
  console.log(JSON.stringify({ items: items.length, qa_sample: qaSample.length, output_dir: outputDir }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
