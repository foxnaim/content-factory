import { createHash } from "node:crypto";
import { rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Job, Queue, UnrecoverableError, Worker } from "bullmq";
import { prisma, type Prisma } from "@content-factory/database";
import {
  PipelineJobSchema,
  PipelineStageSchema,
  QUEUE_NAMES,
  VideoScriptSchema,
  deterministicJobId,
  deriveBatchStatus,
  type ContentStatus,
  type PipelineJob,
  type PipelineStage,
  type VideoScript
} from "@content-factory/shared";
import { LexicalDuplicateDetector, type DuplicateCandidate } from "./duplicate-detector.js";
import { runQualityGate } from "./quality-gate.js";
import { OllamaScriptProvider } from "./providers/ollama.js";
import { CodexCliScriptProvider } from "./providers/codex-cli.js";
import { createVoiceProvider } from "./providers/voice.js";
import { FfmpegRenderer } from "./renderer/ffmpeg.js";
import { ObjectStorage } from "./storage.js";
import { TelegramReviewNotifier } from "./notifier/telegram.js";

function redisConnection() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    tls: url.protocol === "rediss:" ? {} : undefined
  };
}

const storage = new ObjectStorage();
const scriptProvider = process.env.LLM_PROVIDER === "codex-cli" ? new CodexCliScriptProvider() : new OllamaScriptProvider();
const voiceProvider = createVoiceProvider();
const duplicateDetector = new LexicalDuplicateDetector();
const renderer = new FfmpegRenderer();
const notifier = new TelegramReviewNotifier();
const queues = new Map<PipelineStage, Queue<PipelineJob>>();

for (const stage of Object.keys(QUEUE_NAMES) as PipelineStage[]) {
  queues.set(stage, new Queue(QUEUE_NAMES[stage], { connection: redisConnection() }));
}

export async function startWorkers(): Promise<Worker<PipelineJob>[]> {
  await storage.ensureBuckets();
  const stages = enabledStages();
  return stages.map((stage) => new Worker<PipelineJob>(
    QUEUE_NAMES[stage],
    (job) => processJob(stage, job),
    { connection: redisConnection(), concurrency: concurrency(stage) }
  ));
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
}

async function processJob(expectedStage: PipelineStage, bullJob: Job<PipelineJob>): Promise<void> {
  const parsed = PipelineJobSchema.safeParse(bullJob.data);
  if (!parsed.success || parsed.data.stage !== expectedStage) throw new UnrecoverableError("Invalid pipeline job contract");
  const job = parsed.data;
  const attemptNumber = bullJob.attemptsMade + 1;
  const attempt = await prisma.jobAttempt.upsert({
    where: { bullJobId_attempt: { bullJobId: String(bullJob.id), attempt: attemptNumber } },
    update: { startedAt: new Date(), outcome: null, errorCode: null, errorMessage: null },
    create: {
      contentItemId: job.content_item_id,
      queueName: QUEUE_NAMES[expectedStage],
      bullJobId: String(bullJob.id),
      attempt: attemptNumber
    }
  });
  try {
    if (expectedStage === "script") await processScript(job);
    if (expectedStage === "assets") await processAssets(job);
    if (expectedStage === "voice") await processVoice(job);
    if (expectedStage === "render") await processRender(job);
    if (expectedStage === "notify") await processNotification(job);
    await prisma.jobAttempt.update({ where: { id: attempt.id }, data: { finishedAt: new Date(), outcome: "completed" } });
  } catch (error) {
    const retryable = isRetryable(error);
    const message = sanitizeError(error);
    await prisma.jobAttempt.update({
      where: { id: attempt.id },
      data: { finishedAt: new Date(), outcome: "failed", errorCode: retryable ? "TEMPORARY" : "PERMANENT", errorMessage: message, retryable }
    });
    const maxAttempts = Number(bullJob.opts.attempts ?? 1);
    if (!retryable || attemptNumber >= maxAttempts) {
      const failed = await prisma.contentItem.update({ where: { id: job.content_item_id }, data: { status: "failed", failureCode: retryable ? "ATTEMPTS_EXHAUSTED" : "NON_RETRYABLE", failureMessage: message } });
      await refreshBatchStatus(failed.batchId);
    }
    if (!retryable) throw new UnrecoverableError(message);
    throw error;
  }
}

async function processScript(job: PipelineJob): Promise<void> {
  const item = await requiredItem(job.content_item_id);
  if (!(["queued", "scripting"] as ContentStatus[]).includes(item.status as ContentStatus)) return;
  if (item.status === "queued") await setStatus(item.id, "scripting", "Script generation started");

  const script = await scriptProvider.generate({
    topic: item.topic,
    language: item.language,
    targetDurationSec: item.targetDurationSec,
    notes: item.notes
  });

  const siblingVersions = await prisma.scriptVersion.findMany({
    where: { contentItem: { batchId: item.batchId, id: { not: item.id } } },
    orderBy: { createdAt: "desc" },
    include: { contentItem: { select: { topic: true } } }
  });
  const seenItems = new Set<string>();
  const candidates: DuplicateCandidate[] = siblingVersions.flatMap((version) => {
    if (seenItems.has(version.contentItemId)) return [];
    seenItems.add(version.contentItemId);
    const parsed = VideoScriptSchema.safeParse(version.payload);
    return parsed.success ? [{ id: version.contentItemId, topic: version.contentItem.topic, script: parsed.data }] : [];
  });
  const duplicateSignals = await duplicateDetector.compare(item.topic, script, candidates);
  const gate = runQualityGate(script, duplicateSignals);
  const contentHash = sha(JSON.stringify(script));
  const version = (await prisma.scriptVersion.count({ where: { contentItemId: item.id } })) + 1;
  await prisma.scriptVersion.upsert({
    where: { contentItemId_contentHash: { contentItemId: item.id, contentHash } },
    update: {},
    create: {
      contentItemId: item.id,
      version,
      contentHash,
      provider: scriptProvider.name,
      model: scriptProvider.model,
      payload: script as unknown as Prisma.InputJsonValue
    }
  });
  await log(item.id, gate.passed ? "info" : "warn", "quality_gate", gate.passed ? "Script passed structural quality checks" : gate.blockers.join("; "), { gate, duplicateSignals });

  if (!gate.passed) {
    await setStatus(item.id, "rejected", "Script rejected by quality gate");
    return;
  }
  if (gate.needsHumanFactCheck) {
    await setStatus(item.id, "qa_pending", "Script needs human fact checking before assets");
    return;
  }
  await setStatus(item.id, "script_ready", "Validated script saved");
  await enqueueNext(job, "assets", contentHash);
}

async function processAssets(job: PipelineJob): Promise<void> {
  const item = await requiredItem(job.content_item_id);
  if (!(["script_ready", "assets_generating"] as ContentStatus[]).includes(item.status as ContentStatus)) return;
  if (item.status === "script_ready") await setStatus(item.id, "assets_generating", "Asset manifest generation started");
  const script = await latestScript(item.id);

  const manifest = {
    version: 1,
    content_item_id: item.id,
    mode: "original-cartoon-motion-draft",
    note: "MVP renderer creates original block-character motion graphics with timed burned-in captions. Requested external visuals remain prompts until a licensed provider or owned upload is supplied.",
    scenes: script.scenes.map((scene) => ({
      index: scene.index,
      requested_visual_type: scene.visual_type,
      actual_visual_type: "motion_graphic",
      prompt: scene.visual_prompt,
      source_type: "generated",
      source_url: null,
      license_id: "project-owned-generated-output"
    }))
  };
  const objectKey = `${item.batchId}/${item.id}/${job.input_hash}/asset-manifest.json`;
  const stored = await storage.putBuffer(storage.workBucket, objectKey, Buffer.from(JSON.stringify(manifest, null, 2)), "application/json");
  await upsertAsset(item.id, "manifest", stored, { stage: "assets" });
  await setStatus(item.id, "voice_generating", "Asset manifest stored; voice stage queued");
  await enqueueNext(job, "voice", stored.sha256);
}

async function processVoice(job: PipelineJob): Promise<void> {
  const item = await requiredItem(job.content_item_id);
  if (item.status !== "voice_generating") return;
  const script = await latestScript(item.id);
  const audio = await voiceProvider.synthesize(script.scenes.map((scene) => scene.voiceover).join("\n\n"), script.language);
  let nextHash = job.input_hash;
  if (audio) {
    const objectKey = `${item.batchId}/${item.id}/${job.input_hash}/voice.wav`;
    const stored = await storage.putBuffer(storage.workBucket, objectKey, audio, "audio/wav");
    await upsertAsset(item.id, "audio", stored, { provider: voiceProvider.name });
    nextHash = stored.sha256;
  } else {
    await log(item.id, "warn", "voice_skipped", "No TTS provider configured; draft will be rendered without audio", {});
  }
  await enqueueNext(job, "render", nextHash);
}

async function processRender(job: PipelineJob): Promise<void> {
  const item = await requiredItem(job.content_item_id);
  if (!(["voice_generating", "rendering"] as ContentStatus[]).includes(item.status as ContentStatus)) return;
  if (item.status === "voice_generating") await setStatus(item.id, "rendering", "FFmpeg render started");
  const script = await latestScript(item.id);
  const audio = await prisma.asset.findFirst({ where: { contentItemId: item.id, kind: "audio" }, orderBy: { createdAt: "desc" } });
  const audioPath = audio ? join(tmpdir(), `content-factory-${item.id}-voice.wav`) : undefined;
  if (audio && audioPath) await storage.getFile(audio.bucket, audio.objectKey, audioPath);

  const result = await renderer.render(script, audioPath);
  try {
    const size = (await stat(result.videoPath)).size;
    if (size < 10_000) throw new Error("Rendered file is unexpectedly small");
    const prefix = `${item.batchId}/${item.id}/${job.input_hash}`;
    const video = await storage.putFile(storage.outputBucket, `${prefix}/draft.mp4`, result.videoPath, "video/mp4");
    const metadata = await storage.putFile(storage.outputBucket, `${prefix}/metadata.json`, result.metadataPath, "application/json");
    await upsertAsset(item.id, "video", video, { renderer: "ffmpeg", approval: "required" });
    await upsertAsset(item.id, "metadata", metadata, { publishing: "manual-only" });
    await setStatus(item.id, "qa_pending", "Render completed; automated file checks passed");
    await setStatus(item.id, "ready_for_review", "Draft is ready for human review");
    await enqueueNext(job, "notify", video.sha256);
  } finally {
    await result.cleanup();
    if (audioPath) await rm(audioPath, { force: true });
  }
}

async function processNotification(job: PipelineJob): Promise<void> {
  const item = await requiredItem(job.content_item_id);
  if (item.status !== "ready_for_review") return;
  const key = `telegram-ready-${item.id}-${job.input_hash}`;
  const outbox = await prisma.notificationOutbox.upsert({
    where: { deduplicationKey: key },
    update: {},
    create: {
      deduplicationKey: key,
      channel: "telegram",
      payload: { content_item_id: item.id, batch_id: item.batchId, topic: item.topic, event: "ready_for_review" }
    }
  });
  if (outbox.sentAt) return;
  const outcome = await notifier.notify(`Content Factory: draft ready for review\n\n${item.topic}\nItem: ${item.id}\n\nNo content was published automatically.`);
  if (outcome === "sent") await prisma.notificationOutbox.update({ where: { id: outbox.id }, data: { sentAt: new Date(), errorMessage: null } });
}

async function enqueueNext(current: PipelineJob, stage: PipelineStage, inputHash: string): Promise<void> {
  const next: PipelineJob = { ...current, stage, input_hash: inputHash, requested_at: new Date().toISOString() };
  const queue = queues.get(stage)!;
  const id = deterministicJobId(next);
  const existing = await queue.getJob(id);
  if (existing) return;
  await queue.add(stage, next, {
    jobId: id,
    attempts: Number(process.env.JOB_ATTEMPTS ?? 4),
    backoff: { type: "exponential", delay: Number(process.env.JOB_BACKOFF_MS ?? 2000) },
    removeOnComplete: 1000,
    removeOnFail: 5000
  });
}

async function requiredItem(id: string) {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) throw new UnrecoverableError(`Content item ${id} not found`);
  return item;
}

async function latestScript(contentItemId: string): Promise<VideoScript> {
  const version = await prisma.scriptVersion.findFirst({ where: { contentItemId }, orderBy: { version: "desc" } });
  if (!version) throw new UnrecoverableError("Validated script is missing");
  return VideoScriptSchema.parse(version.payload);
}

async function setStatus(contentItemId: string, status: ContentStatus, message: string): Promise<void> {
  const [item] = await prisma.$transaction([
    prisma.contentItem.update({ where: { id: contentItemId }, data: { status } }),
    prisma.itemLog.create({ data: { contentItemId, level: "info", event: "status_changed", message, details: { status } } })
  ]);
  await refreshBatchStatus(item.batchId);
}

async function refreshBatchStatus(batchId: string): Promise<void> {
  const counts = await prisma.contentItem.groupBy({ by: ["status"], where: { batchId }, _count: true });
  const total = counts.reduce((sum, row) => sum + row._count, 0);
  const byStatus = Object.fromEntries(counts.map((row) => [row.status, row._count]));
  const status = deriveBatchStatus(byStatus, total);
  await prisma.batch.update({ where: { id: batchId }, data: { status } });
}

async function log(contentItemId: string, level: string, event: string, message: string, details: Prisma.InputJsonValue): Promise<void> {
  await prisma.itemLog.create({ data: { contentItemId, level, event, message, details } });
}

async function upsertAsset(contentItemId: string, kind: "audio" | "video" | "metadata" | "manifest", stored: { bucket: string; objectKey: string; sha256: string; mediaType: string; byteLength: number }, metadata: Prisma.InputJsonValue): Promise<void> {
  await prisma.asset.upsert({
    where: { bucket_objectKey: { bucket: stored.bucket, objectKey: stored.objectKey } },
    update: {},
    create: {
      contentItemId,
      kind,
      bucket: stored.bucket,
      objectKey: stored.objectKey,
      sha256: stored.sha256,
      mediaType: stored.mediaType,
      byteLength: BigInt(stored.byteLength),
      sourceType: "generated",
      licenseId: "project-owned-generated-output",
      metadata
    }
  });
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRetryable(error: unknown): boolean {
  if (error instanceof UnrecoverableError) return false;
  const message = sanitizeError(error).toLowerCase();
  if (/zod|validation|malformed json|invalid pipeline|not found|prohibited/.test(message)) return false;
  return /timeout|timed out|econn|http 408|http 425|http 429|http 5\d\d|temporar|rate limit|ffmpeg/.test(message);
}

function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/bot\d+:[A-Za-z0-9_-]+/gi, "bot[REDACTED]")
    .slice(0, 4000);
}

function concurrency(stage: PipelineStage): number {
  const names: Record<PipelineStage, string> = {
    script: "SCRIPT_CONCURRENCY",
    assets: "ASSET_CONCURRENCY",
    voice: "VOICE_CONCURRENCY",
    render: "RENDER_CONCURRENCY",
    notify: "NOTIFY_CONCURRENCY"
  };
  return Math.max(1, Number(process.env[names[stage]] ?? (stage === "render" ? 1 : 2)));
}

function enabledStages(): PipelineStage[] {
  const configured = process.env.WORKER_STAGES?.split(",").map((stage) => stage.trim()).filter(Boolean);
  const candidates = configured?.length ? configured : Object.keys(QUEUE_NAMES);
  const stages = candidates.map((candidate) => PipelineStageSchema.parse(candidate));
  return [...new Set(stages)];
}
