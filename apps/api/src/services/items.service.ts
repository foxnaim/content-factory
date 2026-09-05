import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@content-factory/database";
import { assertTransition, deriveBatchStatus, parseDeterministicJobId, QUEUE_NAMES, type ContentStatus, type PipelineJob, type PipelineStage } from "@content-factory/shared";
import { QueueService } from "./queue.service.js";
import { StorageService } from "./storage.service.js";

@Injectable()
export class ItemsService {
  constructor(private readonly queue: QueueService, private readonly storage: StorageService) {}

  async get(id: string) {
    const item = await prisma.contentItem.findUnique({
      where: { id },
      include: {
        scriptVersions: { orderBy: { version: "desc" } },
        assets: true,
        attempts: { orderBy: { startedAt: "desc" } },
        logs: { orderBy: { createdAt: "desc" } },
        reviewDecisions: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!item) throw new NotFoundException("Content item not found");
    return item;
  }

  async approve(id: string, reviewer: string, reason?: string) {
    return this.review(id, "approved", reviewer, reason);
  }

  async reject(id: string, reviewer: string, reason?: string) {
    return this.review(id, "rejected", reviewer, reason);
  }

  private async review(id: string, target: "approved" | "rejected", reviewer: string, reason?: string) {
    const item = await this.get(id);
    try { assertTransition(item.status as ContentStatus, target); }
    catch (error) { throw new BadRequestException((error as Error).message); }
    const reviewed = await prisma.$transaction(async (tx) => {
      await tx.reviewDecision.create({ data: { contentItemId: id, decision: target, reviewer, reason } });
      return tx.contentItem.update({ where: { id }, data: { status: target } });
    });
    await this.refreshBatchStatus(item.batchId);
    return reviewed;
  }

  async queueDraft(id: string) {
    const item = await this.get(id);
    if (item.status !== "draft") throw new BadRequestException("Only a draft item can be queued directly");
    await prisma.contentItem.update({ where: { id }, data: { status: "queued", failureCode: null, failureMessage: null } });
    await this.refreshBatchStatus(item.batchId);
    const job: PipelineJob = {
      content_item_id: item.id,
      batch_id: item.batchId,
      stage: "script",
      input_hash: item.inputHash,
      requested_at: new Date().toISOString()
    };
    await this.queue.enqueue(job);
    return { content_item_id: id, status: "queued" };
  }

  async retry(id: string) {
    const item = await this.get(id);
    const failedAttempt = item.attempts.find((attempt) => attempt.outcome === "failed");
    const parsedJobId = failedAttempt ? parseDeterministicJobId(failedAttempt.bullJobId) : null;
    if (!failedAttempt || !parsedJobId || parsedJobId.content_item_id !== item.id || QUEUE_NAMES[parsedJobId.stage] !== failedAttempt.queueName) {
      throw new BadRequestException("Failed stage metadata is missing or inconsistent; the item cannot be resumed safely");
    }
    const { stage, input_hash: inputHash } = parsedJobId;
    const retryStatus: Record<PipelineStage, ContentStatus> = {
      script: "queued",
      assets: "assets_generating",
      voice: "voice_generating",
      render: "rendering",
      notify: "ready_for_review"
    };
    try { assertTransition(item.status as ContentStatus, retryStatus[stage]); }
    catch (error) { throw new BadRequestException((error as Error).message); }
    await prisma.$transaction([
      prisma.contentItem.update({ where: { id }, data: { status: retryStatus[stage], failureCode: null, failureMessage: null } }),
      prisma.itemLog.create({ data: { contentItemId: id, level: "info", event: "manual_retry", message: `Retrying failed ${stage} stage`, details: { stage, bull_job_id: failedAttempt.bullJobId } } })
    ]);
    await this.refreshBatchStatus(item.batchId);
    const job: PipelineJob = {
      content_item_id: item.id,
      batch_id: item.batchId,
      stage,
      input_hash: inputHash,
      requested_at: new Date().toISOString()
    };
    await this.queue.enqueue(job);
    return { content_item_id: id, status: retryStatus[stage], resumed_stage: stage };
  }

  async continueAfterFactCheck(id: string, reviewer: string, reason?: string) {
    const item = await this.get(id);
    if (item.status !== "qa_pending") throw new BadRequestException("Item is not waiting for a quality decision");
    const script = item.scriptVersions[0];
    if (!script) throw new BadRequestException("Validated script is missing");
    await prisma.$transaction([
      prisma.reviewDecision.create({ data: { contentItemId: id, decision: "fact_check_approved", reviewer, reason } }),
      prisma.contentItem.update({ where: { id }, data: { status: "assets_generating" } })
    ]);
    await this.refreshBatchStatus(item.batchId);
    const job: PipelineJob = {
      content_item_id: item.id,
      batch_id: item.batchId,
      stage: "assets",
      input_hash: script.contentHash,
      requested_at: new Date().toISOString()
    };
    await this.queue.enqueue(job);
    return { content_item_id: id, status: "assets_generating" };
  }

  async download(id: string) {
    const item = await this.get(id);
    if (item.status !== "approved" && item.status !== "ready_for_review") {
      throw new BadRequestException("Download is available only for reviewed drafts");
    }
    const video = item.assets.find((asset) => asset.kind === "video");
    if (!video) throw new NotFoundException("Rendered video not found");
    return { url: await this.storage.presignedDownload(video.bucket, video.objectKey), expires_in_sec: 900 };
  }

  private async refreshBatchStatus(batchId: string): Promise<void> {
    const counts = await prisma.contentItem.groupBy({ by: ["status"], where: { batchId }, _count: true });
    const total = counts.reduce((sum, row) => sum + row._count, 0);
    const byStatus = Object.fromEntries(counts.map((row) => [row.status, row._count]));
    const status = deriveBatchStatus(byStatus, total);
    await prisma.batch.update({ where: { id: batchId }, data: { status } });
  }
}
