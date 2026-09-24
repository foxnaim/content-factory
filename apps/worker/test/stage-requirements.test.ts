import { describe, expect, it } from "vitest";
import { requiresObjectStorage } from "../src/stage-requirements.js";

describe("worker stage requirements", () => {
  it("allows a host-only Codex script worker without MinIO", () => {
    expect(requiresObjectStorage(["script"])).toBe(false);
  });

  it("requires object storage for asset, voice and render stages", () => {
    expect(requiresObjectStorage(["assets"])).toBe(true);
    expect(requiresObjectStorage(["voice"])).toBe(true);
    expect(requiresObjectStorage(["render"])).toBe(true);
  });

  it("does not require object storage for a notification-only worker", () => {
    expect(requiresObjectStorage(["notify"])).toBe(false);
  });
});
