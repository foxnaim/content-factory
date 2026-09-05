import { z } from "zod";

export const ContentImportItemSchema = z.object({
  topic: z.string().trim().min(3).max(500),
  external_id: z.string().trim().min(1).max(200).optional(),
  language: z.string().trim().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default("en"),
  target_duration_sec: z.coerce.number().int().min(10).max(180).default(45),
  notes: z.string().trim().max(2000).optional()
}).strict();

export const BatchItemsSchema = z.array(ContentImportItemSchema).min(10).max(1000);

export const BatchImportRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  format: z.enum(["csv", "json"]),
  data: z.union([z.string(), z.array(z.unknown())]),
  idempotency_key: z.string().trim().min(8).max(200)
}).strict();

export type ContentImportItem = z.infer<typeof ContentImportItemSchema>;
export type BatchImportRequest = z.infer<typeof BatchImportRequestSchema>;
