import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../src/index.js";

describe("content lifecycle", () => {
  it("supports the happy path with a mandatory review gate", () => {
    const path = [
      "draft", "queued", "scripting", "script_ready", "assets_generating",
      "voice_generating", "rendering", "qa_pending", "ready_for_review", "approved"
    ] as const;
    for (let index = 0; index < path.length - 1; index += 1) {
      expect(canTransition(path[index]!, path[index + 1]!)).toBe(true);
    }
  });

  it("forbids automatic publication states and skipped review", () => {
    expect(canTransition("rendering", "approved")).toBe(false);
    expect(() => assertTransition("queued", "ready_for_review")).toThrow(/Illegal/);
  });

  it("allows explicit recovery paths", () => {
    expect(canTransition("failed", "queued")).toBe(true);
    expect(canTransition("failed", "rendering")).toBe(true);
    expect(canTransition("rejected", "draft")).toBe(true);
  });
});
