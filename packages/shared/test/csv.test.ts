import { describe, expect, it } from "vitest";
import { parseCsvImport, parseJsonImport } from "../src/index.js";

const rows = Array.from({ length: 10 }, (_, index) =>
  `topic ${index + 1},item-${index + 1},en,45,original angle ${index + 1}`
).join("\n");

describe("batch import", () => {
  it("parses a valid 10-row CSV batch", () => {
    const result = parseCsvImport(`topic,external_id,language,target_duration_sec,notes\n${rows}`);
    expect(result.errors).toEqual([]);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]?.external_id).toBe("item-1");
  });

  it("reports invalid CSV rows instead of inventing values", () => {
    const input = `topic,external_id,language,target_duration_sec,notes\nno,bad-item,en,45,too short\n${rows}`;
    const result = parseCsvImport(input);
    expect(result.errors.some((error) => error.row === 2)).toBe(true);
  });

  it("rejects a JSON batch below the minimum size", () => {
    const result = parseJsonImport([{ topic: "Only one idea", language: "en", target_duration_sec: 30 }]);
    expect(result.errors.some((error) => error.row === 0)).toBe(true);
  });

  it("rejects malformed JSON", () => {
    expect(parseJsonImport("{").errors[0]?.message).toBe("Invalid JSON");
  });
});
