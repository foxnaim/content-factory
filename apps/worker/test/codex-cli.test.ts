import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { resolveSchemaPath } from "../src/providers/codex-cli.js";

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
});
