import { z } from "zod";

export const VisualTypeSchema = z.enum([
  "generated_image",
  "owned_footage",
  "licensed_stock",
  "screen_recording",
  "motion_graphic",
  "text_card"
]);

export const TransitionSchema = z.enum([
  "cut",
  "fade",
  "crossfade",
  "slide",
  "zoom"
]);

export const SourceNoteSchema = z.object({
  claim: z.string().trim().min(1).max(500),
  source_url: z.url().nullable().optional(),
  source_title: z.string().trim().min(1).max(300).nullable().optional(),
  verification_status: z.enum(["verified", "needs_review", "not_applicable"]),
  note: z.string().trim().max(1000).nullable().optional()
}).strict();

export const VideoSceneSchema = z.object({
  index: z.number().int().min(0).max(59),
  duration_sec: z.number().min(0.5).max(30),
  voiceover: z.string().trim().min(1).max(1200),
  subtitle: z.string().trim().min(1).max(240),
  visual_type: VisualTypeSchema,
  visual_prompt: z.string().trim().min(1).max(2000),
  stock_query: z.string().trim().max(300).nullable(),
  transition: TransitionSchema
}).strict();

export const VideoScriptSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(5000),
  hook: z.string().trim().min(3).max(300),
  language: z.string().trim().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/, "Use a BCP-47 language tag such as en or en-US"),
  target_duration_sec: z.number().int().min(10).max(180),
  fact_check_required: z.boolean(),
  scenes: z.array(VideoSceneSchema).min(1).max(60),
  cta: z.string().trim().min(1).max(300),
  source_notes: z.array(SourceNoteSchema).max(100)
}).strict().superRefine((script, context) => {
  const indexes = script.scenes.map((scene) => scene.index);
  if (new Set(indexes).size !== indexes.length) {
    context.addIssue({ code: "custom", path: ["scenes"], message: "Scene indexes must be unique" });
  }
  const expected = script.scenes.map((_, index) => index);
  if (!indexes.every((value, index) => value === expected[index])) {
    context.addIssue({ code: "custom", path: ["scenes"], message: "Scene indexes must be contiguous and start at 0" });
  }
  const totalDuration = script.scenes.reduce((sum, scene) => sum + scene.duration_sec, 0);
  const tolerance = Math.max(2, script.target_duration_sec * 0.1);
  if (Math.abs(totalDuration - script.target_duration_sec) > tolerance) {
    context.addIssue({
      code: "custom",
      path: ["scenes"],
      message: `Scene duration total ${totalDuration}s differs from target by more than ${tolerance}s`
    });
  }
  const unresolvedSources = script.source_notes.some((source) => source.verification_status === "needs_review");
  if (unresolvedSources && !script.fact_check_required) {
    context.addIssue({
      code: "custom",
      path: ["fact_check_required"],
      message: "fact_check_required must be true while any source needs review"
    });
  }
});

export type VideoScript = z.infer<typeof VideoScriptSchema>;
export type VideoScene = z.infer<typeof VideoSceneSchema>;
export type SourceNote = z.infer<typeof SourceNoteSchema>;
