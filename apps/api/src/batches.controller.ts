import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { BatchesService } from "./services/batches.service.js";

@Controller()
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Get("batches")
  list() { return this.batches.list(); }

  @Get("batches/:id")
  get(@Param("id") id: string) { return this.batches.get(id); }

  @Post("channels/:channelId/batches/import")
  import(@Param("channelId") channelId: string, @Body() body: unknown) {
    return this.batches.import(channelId, body);
  }

  @Post("batches/:id/queue")
  queue(@Param("id") id: string) { return this.batches.queue(id); }
}
