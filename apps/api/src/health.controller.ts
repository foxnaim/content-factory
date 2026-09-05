import { Controller, Get } from "@nestjs/common";
import { prisma } from "@content-factory/database";
import { QueueService } from "./services/queue.service.js";
import { StorageService } from "./services/storage.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly queueService: QueueService,
    private readonly storageService: StorageService
  ) {}

  @Get("live")
  live(): { status: string } {
    return { status: "ok" };
  }

  @Get("ready")
  async ready(): Promise<{ status: string; database: string; redis: string; objectStorage: string }> {
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      this.queueService.ready(),
      this.storageService.ready()
    ]);
    return {
      status: "ok",
      database: "reachable",
      redis: "reachable",
      objectStorage: "reachable"
    };
  }
}
