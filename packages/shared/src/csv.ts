import { parse } from "csv-parse/sync";
import { BatchItemsSchema, ContentImportItemSchema, type ContentImportItem } from "./schemas/import.schema.js";

export type ImportRowError = { row: number; message: string };
export type ImportParseResult = { items: ContentImportItem[]; errors: ImportRowError[] };

export function parseCsvImport(input: string): ImportParseResult {
  const records = parse(input, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false
  }) as Record<string, unknown>[];

  const errors: ImportRowError[] = [];
  const items: ContentImportItem[] = [];

  records.forEach((record, index) => {
    const result = ContentImportItemSchema.safeParse({
      topic: record.topic,
      external_id: emptyToUndefined(record.external_id),
      language: emptyToUndefined(record.language) ?? "en",
      target_duration_sec: emptyToUndefined(record.target_duration_sec) ?? 45,
      notes: emptyToUndefined(record.notes)
    });
    if (result.success) items.push(result.data);
    else errors.push({ row: index + 2, message: result.error.issues.map((issue) => issue.message).join("; ") });
  });

  const size = BatchItemsSchema.safeParse(items);
  if (!size.success) errors.push({ row: 0, message: size.error.issues.map((issue) => issue.message).join("; ") });
  return { items, errors };
}

export function parseJsonImport(input: unknown): ImportParseResult {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return { items: [], errors: [{ row: 0, message: "Invalid JSON" }] };
    }
  }
  if (!Array.isArray(value)) return { items: [], errors: [{ row: 0, message: "JSON import must be an array" }] };

  const items: ContentImportItem[] = [];
  const errors: ImportRowError[] = [];
  value.forEach((row, index) => {
    const result = ContentImportItemSchema.safeParse(row);
    if (result.success) items.push(result.data);
    else errors.push({ row: index + 1, message: result.error.issues.map((issue) => issue.message).join("; ") });
  });
  const size = BatchItemsSchema.safeParse(items);
  if (!size.success) errors.push({ row: 0, message: size.error.issues.map((issue) => issue.message).join("; ") });
  return { items, errors };
}

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}
