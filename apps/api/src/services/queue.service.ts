import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import {
  QUEUE_NAMES,
  deterministicJobId,
  type PipelineJob,
  type PipelineStage
} from "@content-factory/shared";

function connectionOptions() {
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

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues = new Map<PipelineStage, Queue<PipelineJob>>();

  constructor() {
    for (const stage of Object.keys(QUEUE_NAMES) as PipelineStage[]) {
      this.queues.set(stage, new Queue<PipelineJob>(QUEUE_NAMES[stage], { connection: connectionOptions() }));
    }
  }

  async enqueue(job: PipelineJob): Promise<void> {
    const queue = this.queues.get(job.stage)!;
    const jobId = deterministicJobId(job);
    const existing = await queue.getJob(jobId);
    if (existing) {
      if ((await existing.getState()) === "failed") await existing.retry();
      return;
    }
    await queue.add(job.stage, job, {
      jobId,
      attempts: Number(process.env.JOB_ATTEMPTS ?? 4),
      backoff: { type: "exponential", delay: Number(process.env.JOB_BACKOFF_MS ?? 2000) },
      removeOnComplete: 1000,
      removeOnFail: 5000
    });
  }

  async counts() {
    return Promise.all([...this.queues.entries()].map(async ([stage, queue]) => ({
      stage,
      queue: QUEUE_NAMES[stage],
      counts: await queue.getJobCounts("waiting", "active", "delayed", "failed", "completed")
    })));
  }

  async ready(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.getJobCounts("waiting")));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}
