import { describe, expect, it } from "vitest";
import { deterministicJobId, parseDeterministicJobId, PipelineJobSchema } from "../src/index.js";

const job = {
  content_item_id: "123e4567-e89b-12d3-a456-426614174000",
  batch_id: "123e4567-e89b-12d3-a456-426614174001",
  stage: "script",
  input_hash: "a".repeat(64),
  requested_at: "2026-09-05T12:00:00.000Z"
} as const;

describe("pipeline jobs", () => {
  it("builds a deterministic BullMQ-safe id", () => {
    const parsed = PipelineJobSchema.parse(job);
    expect(deterministicJobId(parsed)).toBe(deterministicJobId(parsed));
    expect(deterministicJobId(parsed)).not.toContain(":");
  });

  it("rejects non-hash idempotency input", () => {
    expect(PipelineJobSchema.safeParse({ ...job, input_hash: "not-a-hash" }).success).toBe(false);
  });

  it("round-trips a deterministic job id for stage-aware retry", () => {
    expect(parseDeterministicJobId(deterministicJobId(job))).toEqual({
      stage: job.stage,
      content_item_id: job.content_item_id,
      input_hash: job.input_hash
    });
    expect(parseDeterministicJobId("broken-id")).toBeNull();
  });
});
