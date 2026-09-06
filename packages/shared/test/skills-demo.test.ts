import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ContentImportItemSchema, VideoScriptSchema } from "../src/index.js";

const demo = (...parts: string[]) => resolve(process.cwd(), "examples", "demo-outputs", ...parts);

describe("Agent Skills demo chain", () => {
  it("produces a script accepted by the runtime Zod contract", async () => {
    for (const filename of ["video-script.json", "forward-test-video-script.json"]) {
      const candidate = JSON.parse(await readFile(demo(filename), "utf8"));
      const parsed = VideoScriptSchema.parse(candidate);
      expect(parsed.scenes.reduce((sum, scene) => sum + scene.duration_sec, 0)).toBe(35);
      expect(parsed.language).toBe("en");
    }
  });

  it("produces a manual-only batch accepted by the import item contract", async () => {
    const manifest = JSON.parse(await readFile(demo("batch", "batch-manifest.json"), "utf8"));
    expect(manifest.publication_mode).toBe("manual_only");
    expect(manifest.items).toHaveLength(10);
    const imported = manifest.items.map((item: Record<string, unknown>) => ContentImportItemSchema.parse({
      topic: item.topic,
      external_id: item.external_id,
      language: item.language,
      target_duration_sec: item.target_duration_sec,
      notes: item.notes,
    }));
    expect(new Set(imported.map((item) => item.external_id)).size).toBe(10);
  });

  it("keeps unresolved asset rights visible and blocks the demo before production", async () => {
    const storyboard = JSON.parse(await readFile(demo("storyboard.json"), "utf8"));
    expect(storyboard.assets.some((asset: { verification_status: string }) => asset.verification_status === "needs_verification")).toBe(true);
    const qa = await readFile(demo("originality-qa.md"), "utf8");
    expect(qa).toContain("**Решение: revise.**");
  });

  it("keeps the main Telegram post within the declared 1000–2000 character range", async () => {
    const telegram = await readFile(demo("telegram-package.md"), "utf8");
    const mainPost = telegram.split("## Основной пост\n\n")[1]?.split("\n\n## Короткая заметка")[0] ?? "";
    expect(mainPost.length).toBeGreaterThanOrEqual(1000);
    expect(mainPost.length).toBeLessThanOrEqual(2000);
  });
});
