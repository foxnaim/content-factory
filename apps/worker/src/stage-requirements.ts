import type { PipelineStage } from "@content-factory/shared";

const OBJECT_STORAGE_STAGES = new Set<PipelineStage>(["assets", "voice", "render"]);

export function requiresObjectStorage(stages: PipelineStage[]): boolean {
  return stages.some((stage) => OBJECT_STORAGE_STAGES.has(stage));
}
