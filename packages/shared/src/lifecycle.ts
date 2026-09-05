import { z } from "zod";

export const ContentStatusSchema = z.enum([
  "draft",
  "queued",
  "scripting",
  "script_ready",
  "assets_generating",
  "voice_generating",
  "rendering",
  "qa_pending",
  "ready_for_review",
  "approved",
  "rejected",
  "failed"
]);

export type ContentStatus = z.infer<typeof ContentStatusSchema>;

const transitions: Record<ContentStatus, readonly ContentStatus[]> = {
  draft: ["queued"],
  queued: ["scripting", "failed"],
  scripting: ["script_ready", "qa_pending", "rejected", "failed"],
  script_ready: ["assets_generating", "qa_pending", "rejected", "failed"],
  assets_generating: ["voice_generating", "qa_pending", "failed"],
  voice_generating: ["rendering", "qa_pending", "failed"],
  rendering: ["qa_pending", "failed"],
  qa_pending: ["assets_generating", "ready_for_review", "rejected", "draft"],
  ready_for_review: ["approved", "rejected"],
  approved: [],
  rejected: ["draft"],
  failed: ["queued", "assets_generating", "voice_generating", "rendering", "ready_for_review"]
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: ContentStatus, to: ContentStatus): void {
  if (!canTransition(from, to)) throw new Error(`Illegal content status transition: ${from} -> ${to}`);
}

export function allowedTransitions(from: ContentStatus): readonly ContentStatus[] {
  return transitions[from];
}
