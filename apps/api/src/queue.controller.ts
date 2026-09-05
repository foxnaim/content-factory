import { Controller, Get } from "@nestjs/common";
import { QueueService } from "./services/queue.service.js";

@Controller("queue")
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Get()
  counts() { return this.queue.counts(); }
}
