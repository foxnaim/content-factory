import { describe, expect, it } from "vitest";
import type { VideoScript } from "@content-factory/shared";
import { LexicalDuplicateDetector } from "../src/duplicate-detector.js";
import { runQualityGate } from "../src/quality-gate.js";

const script: VideoScript = {
  title: "How a release gate catches hidden risk",
  description: "An original walkthrough of a release checklist for a small product team.",
  hook: "One unchecked permission can expose every customer record.",
  language: "en",
  target_duration_sec: 20,
  fact_check_required: true,
  scenes: [
    { index: 0, duration_sec: 10, voiceover: "We start with the permission boundary.", subtitle: "CHECK THE BOUNDARY", visual_type: "motion_graphic", visual_prompt: "Owned role diagram", stock_query: null, transition: "cut" },
    { index: 1, duration_sec: 10, voiceover: "Then a human reviews the release evidence.", subtitle: "HUMAN REVIEW", visual_type: "text_card", visual_prompt: "Original review card", stock_query: null, transition: "fade" }
  ],
  cta: "Use the checklist before release.",
  source_notes: [{ claim: "Permission scope claim", source_url: null, source_title: null, verification_status: "needs_review", note: "Verify against the product" }]
};

describe("content quality gate", () => {
  it("holds factual content for human review", () => {
    const result = runQualityGate(script, []);
    expect(result.passed).toBe(true);
    expect(result.needsHumanFactCheck).toBe(true);
  });

  it("blocks near-duplicate scripts", async () => {
    const signals = await new LexicalDuplicateDetector().compare("release gate risk", script, [{ id: "other", topic: "release gate risk", script }]);
    expect(runQualityGate(script, signals).passed).toBe(false);
  });

  it("blocks guaranteed-income language", () => {
    expect(runQualityGate({ ...script, title: "Guaranteed income from AI videos" }, []).passed).toBe(false);
  });

  it("blocks URLs invented inside model output", () => {
    const withUrl: VideoScript = {
      ...script,
      source_notes: [{ ...script.source_notes[0], source_url: "https://example.com/claim" }]
    };
    expect(runQualityGate(withUrl, []).blockers).toContain(
      "Model-generated source URLs are not accepted without a verified research input adapter"
    );
  });

  it("does not let a script provider verify its own source", () => {
    const selfVerified: VideoScript = {
      ...script,
      source_notes: [{ ...script.source_notes[0], verification_status: "verified" }]
    };
    expect(runQualityGate(selfVerified, []).blockers).toContain(
      "A script provider cannot mark its own source notes as verified"
    );
  });
});
