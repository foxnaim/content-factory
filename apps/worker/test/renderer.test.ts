import { describe, expect, it } from "vitest";
import { displayLabel, limitLines, wrapSubtitle } from "../src/renderer/ffmpeg.js";

describe("subtitle wrapping", () => {
  it("keeps every generated line inside the configured text width", () => {
    const wrapped = wrapSubtitle("ONE TAP → SAVE + CONTINUE WITHOUT LOSING THE USER", 20);
    expect(wrapped.split("\n").every((line) => line.length <= 20)).toBe(true);
    expect(wrapped.split("\n").length).toBeGreaterThan(1);
  });

  it("splits a single oversized token", () => {
    expect(wrapSubtitle("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10)).toBe("ABCDEFGHIJ\nKLMNOPQRST\nUVWXYZ");
  });

  it("caps supporting copy without overflowing the card", () => {
    expect(limitLines("one\ntwo\nthree\nfour", 3)).toBe("one\ntwo\nthree…");
  });

  it("turns contract identifiers into human-readable labels", () => {
    expect(displayLabel("motion_graphic")).toBe("MOTION GRAPHIC");
  });
});
