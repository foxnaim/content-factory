import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ItemsService } from "./services/items.service.js";

const ReviewInput = z.object({
  reviewer: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(1000).optional()
}).strict();

@Controller("items")
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get(":id")
  get(@Param("id") id: string) { return this.items.get(id); }

  @Get(":id/logs")
  async logs(@Param("id") id: string) { return (await this.items.get(id)).logs; }

  @Get(":id/download")
  download(@Param("id") id: string) { return this.items.download(id); }

  @Post(":id/retry")
  retry(@Param("id") id: string) { return this.items.retry(id); }

  @Post(":id/queue")
  queueDraft(@Param("id") id: string) { return this.items.queueDraft(id); }

  @Post(":id/approve")
  approve(@Param("id") id: string, @Body() body: unknown) {
    const parsed = ReviewInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.items.approve(id, parsed.data.reviewer, parsed.data.reason);
  }

  @Post(":id/reject")
  reject(@Param("id") id: string, @Body() body: unknown) {
    const parsed = ReviewInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.items.reject(id, parsed.data.reviewer, parsed.data.reason);
  }

  @Post(":id/continue")
  continueAfterFactCheck(@Param("id") id: string, @Body() body: unknown) {
    const parsed = ReviewInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.items.continueAfterFactCheck(id, parsed.data.reviewer, parsed.data.reason);
  }
}
