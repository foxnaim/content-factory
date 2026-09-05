import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { prisma } from "@content-factory/database";
import {
  BatchImportRequestSchema,
  parseCsvImport,
  parseJsonImport,
  type ContentImportItem,
  type PipelineJob
} from "@content-factory/shared";
import { QueueService } from "./queue.service.js";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableItemHash(item: ContentImportItem): string {
  return hash(JSON.stringify({
    topic: item.topic.trim().toLowerCase(),
    language: item.language,
    target_duration_sec: item.target_duration_sec,
    notes: item.notes ?? ""
  }));
}

@Injectable()
export class BatchesService {
  constructor(private readonly queueService: QueueService) {}

  list() {
    return prisma.batch.findMany({
      include: { _count: { select: { items: true } }, channel: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async get(id: string) {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { channel: true, items: { orderBy: { createdAt: "asc" } } }
    });
    if (!batch) throw new NotFoundException("Batch not found");
    return batch;
  }

  async import(channelId: string, body: unknown) {
    const request = BatchImportRequestSchema.safeParse(body);
    if (!request.success) throw new BadRequestException(request.error.flatten());

    const parsed = request.data.format === "csv"
      ? parseCsvImport(String(request.data.data))
      : parseJsonImport(request.data.data);
    if (parsed.errors.length) throw new BadRequestException({ message: "Import validation failed", errors: parsed.errors });

    const normalized = parsed.items.map((item) => ({ item, inputHash: stableItemHash(item) }));
    if (new Set(normalized.map(({ inputHash }) => inputHash)).size !== normalized.length) {
      throw new BadRequestException("The import contains duplicate topics with identical settings");
    }

    const importHash = hash(JSON.stringify(normalized.map(({ inputHash }) => inputHash)));
    const existing = await prisma.batch.findUnique({
      where: { channelId_idempotencyKey: { channelId, idempotencyKey: request.data.idempotency_key } },
      include: { items: true }
    });
    if (existing) {
      if (existing.importHash !== importHash) throw new ConflictException("Idempotency key already used with different data");
      return existing;
    }

    return prisma.batch.create({
      data: {
        channelId,
        name: request.data.name,
        idempotencyKey: request.data.idempotency_key,
        importHash,
        totalItems: parsed.items.length,
        items: {
          create: normalized.map(({ item, inputHash }) => ({
            externalId: item.external_id,
            topic: item.topic,
            topicHash: hash(item.topic.trim().toLowerCase()),
            inputHash,
            language: item.language,
            targetDurationSec: item.target_duration_sec,
            notes: item.notes
          }))
        }
      },
      include: { items: true }
    });
  }

  async queue(id: string) {
    const batch = await this.get(id);
    const candidates = batch.items.filter((item) => item.status === "draft" || item.status === "failed");
    if (!candidates.length) throw new BadRequestException("Batch has no draft or failed items to queue");

    await prisma.$transaction([
      prisma.contentItem.updateMany({
        where: { id: { in: candidates.map((item) => item.id) } },
        data: { status: "queued", failureCode: null, failureMessage: null }
      }),
      prisma.batch.update({ where: { id }, data: { status: "queued" } })
    ]);

    for (let offset = 0; offset < candidates.length; offset += 50) {
      const chunk = candidates.slice(offset, offset + 50);
      await Promise.all(chunk.map((item) => {
        const job: PipelineJob = {
          content_item_id: item.id,
          batch_id: batch.id,
          stage: "script",
          input_hash: item.inputHash,
          requested_at: new Date().toISOString()
        };
        return this.queueService.enqueue(job);
      }));
    }
    return { batch_id: id, queued: candidates.length };
  }
}
