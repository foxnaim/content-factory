import { prisma } from "@content-factory/database";
import { closeQueues, startWorkers } from "./pipeline.worker.js";

const workers = await startWorkers();
console.log(`Content Factory worker started (${workers.length} queues: ${process.env.WORKER_STAGES ?? "all"}). Automatic publishing is disabled.`);

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}; shutting down workers.`);
  await Promise.all(workers.map((worker) => worker.close()));
  await closeQueues();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
