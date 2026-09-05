import { z } from "zod";

export const PipelineStageSchema = z.enum(["script", "assets", "voice", "render", "notify"]);
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const PipelineJobSchema = z.object({
  content_item_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  stage: PipelineStageSchema,
  input_hash: z.string().regex(/^[a-f0-9]{64}$/),
  requested_at: z.string().datetime()
}).strict();

export type PipelineJob = z.infer<typeof PipelineJobSchema>;

export const QUEUE_NAMES: Record<PipelineStage, string> = {
  script: "content-script",
  assets: "content-assets",
  voice: "content-voice",
  render: "content-render",
  notify: "content-notify"
};

export function deterministicJobId(job: PipelineJob): string {
  return `${job.stage}-${job.content_item_id}-${job.input_hash}`;
}

export function parseDeterministicJobId(value: string): Pick<PipelineJob, "stage" | "content_item_id" | "input_hash"> | null {
  const match = value.match(/^(script|assets|voice|render|notify)-([0-9a-f-]{36})-([a-f0-9]{64})$/);
  if (!match) return null;
  const parsed = z.object({
    stage: PipelineStageSchema,
    content_item_id: z.string().uuid(),
    input_hash: z.string().regex(/^[a-f0-9]{64}$/)
  }).safeParse({ stage: match[1], content_item_id: match[2], input_hash: match[3] });
  return parsed.success ? parsed.data : null;
}
