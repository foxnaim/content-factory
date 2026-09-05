import { describe, expect, it } from "vitest";
import { VideoScriptSchema } from "../src/index.js";

const validScript = {
  title: "Why one button delayed our MVP",
  description: "A concrete product teardown based on an original implementation test.",
  hook: "One button cost this MVP three days.",
  language: "en",
  target_duration_sec: 30,
  fact_check_required: false,
  scenes: [
    {
      index: 0,
      duration_sec: 10,
      voiceover: "One button cost this MVP three days.",
      subtitle: "ONE BUTTON. THREE DAYS.",
      visual_type: "screen_recording",
      visual_prompt: "Original screen recording of the prototype flow.",
      stock_query: null,
      transition: "cut"
    },
    {
      index: 1,
      duration_sec: 10,
      voiceover: "We removed it and measured the shorter path.",
      subtitle: "REMOVE THE DETOUR",
      visual_type: "motion_graphic",
      visual_prompt: "Owned diagram comparing the two product paths.",
      stock_query: null,
      transition: "crossfade"
    },
    {
      index: 2,
      duration_sec: 10,
      voiceover: "The lesson is to test the shortest useful path first.",
      subtitle: "TEST THE USEFUL PATH",
      visual_type: "text_card",
      visual_prompt: "Original final lesson card.",
      stock_query: null,
      transition: "fade"
    }
  ],
  cta: "Follow the public build log.",
  source_notes: [
    { claim: "This is an original product experiment.", verification_status: "not_applicable" }
  ]
} as const;

describe("VideoScriptSchema", () => {
  it("accepts a complete, internally consistent script", () => {
    expect(VideoScriptSchema.parse(validScript).scenes).toHaveLength(3);
  });

  it("rejects unknown keys and non-contiguous scene indexes", () => {
    const candidate = {
      ...validScript,
      guaranteed_views: 1_000_000,
      scenes: validScript.scenes.map((scene, index) => ({ ...scene, index: index * 2 }))
    };
    expect(VideoScriptSchema.safeParse(candidate).success).toBe(false);
  });

  it("requires fact checking when a source is unresolved", () => {
    const candidate = {
      ...validScript,
      fact_check_required: false,
      source_notes: [{ claim: "A disputed claim", verification_status: "needs_review" }]
    };
    expect(VideoScriptSchema.safeParse(candidate).success).toBe(false);
  });

  it("rejects scene durations that do not match the target", () => {
    const candidate = { ...validScript, target_duration_sec: 60 };
    expect(VideoScriptSchema.safeParse(candidate).success).toBe(false);
  });
});
