import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizeOneBasedSceneIndexes, resolveSchemaPath } from "../src/providers/codex-cli.js";

describe("Codex CLI schema path", () => {
  it("finds the monorepo schema without depending on process.cwd()", async () => {
    const path = resolveSchemaPath();
    await expect(access(path)).resolves.toBeUndefined();
    expect(path).toMatch(/packages\/shared\/src\/schemas\/video-script\.schema\.json$/);
  });

  it("keeps an explicitly configured absolute path", () => {
    const path = "/tmp/content-factory-schema.json";
    expect(resolveSchemaPath(path)).toBe(path);
  });

  it("normalizes only an unambiguous one-based scene sequence", () => {
    const normalized = normalizeOneBasedSceneIndexes({ scenes: [{ index: 1 }, { index: 2 }] }) as { scenes: Array<{ index: number }> };
    expect(normalized.scenes.map((scene) => scene.index)).toEqual([0, 1]);
    const malformed = normalizeOneBasedSceneIndexes({ scenes: [{ index: 1 }, { index: 3 }] }) as { scenes: Array<{ index: number }> };
    expect(malformed.scenes.map((scene) => scene.index)).toEqual([1, 3]);
  });
});
