import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const markShippedSchema = z
  .object({
    carrier: z.string().min(1),
    trackingNumber: z.string().min(1),
    trackingUrl: z.string().url().optional(),
  })
  .strict();

export class MarkShippedDto extends createZodDto(markShippedSchema) {}

export const paginationSchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export class PaginationDto extends createZodDto(paginationSchema) {}
