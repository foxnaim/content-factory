import type { ContentStatus } from "./lifecycle.js";

export type BatchStatus = "draft" | "queued" | "processing" | "review" | "completed" | "failed";

export function deriveBatchStatus(counts: Partial<Record<ContentStatus, number>>, total: number): BatchStatus {
  const value = (status: ContentStatus) => counts[status] ?? 0;
  const terminal = value("approved") + value("rejected") + value("failed");
  const review = value("qa_pending") + value("ready_for_review");
  const queued = value("queued");
  const active = total - value("draft") - terminal - review - queued;

  if (total > 0 && terminal === total) return value("failed") > 0 ? "failed" : "completed";
  if (active > 0) return "processing";
  if (review > 0) return "review";
  if (queued > 0) return "queued";
  return "draft";
}
