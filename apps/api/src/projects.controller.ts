import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { prisma } from "@content-factory/database";
import { z } from "zod";

const ProjectInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional()
}).strict();

const ChannelInput = z.object({
  name: z.string().trim().min(1).max(120),
  language: z.string().trim().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default("en")
}).strict();

@Controller("projects")
export class ProjectsController {
  @Get()
  listProjects() {
    return prisma.project.findMany({ include: { channels: true }, orderBy: { createdAt: "desc" } });
  }

  @Post()
  createProject(@Body() body: unknown) {
    const parsed = ProjectInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return prisma.project.create({ data: parsed.data });
  }

  @Get(":projectId/channels")
  listChannels(@Param("projectId") projectId: string) {
    return prisma.channel.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
  }

  @Post(":projectId/channels")
  createChannel(@Param("projectId") projectId: string, @Body() body: unknown) {
    const parsed = ChannelInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return prisma.channel.create({ data: { ...parsed.data, projectId } });
  }
}
