import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { ProjectsController } from "./projects.controller.js";
import { BatchesController } from "./batches.controller.js";
import { ItemsController } from "./items.controller.js";
import { QueueController } from "./queue.controller.js";
import { BatchesService } from "./services/batches.service.js";
import { ItemsService } from "./services/items.service.js";
import { QueueService } from "./services/queue.service.js";
import { StorageService } from "./services/storage.service.js";

@Module({
  controllers: [HealthController, ProjectsController, BatchesController, ItemsController, QueueController],
  providers: [BatchesService, ItemsService, QueueService, StorageService]
})
export class AppModule {}
