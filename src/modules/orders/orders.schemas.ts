import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const listOrdersQuerySchema = z
  .object({
    eventId: z.string().uuid().optional(),
    orderType: z.enum(['plan', 'keepsake']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export class ListOrdersQueryDto extends createZodDto(listOrdersQuerySchema) {}

export const refundSchema = z
  .object({
    amountCents: z.number().int().min(0).nullable().optional(),
    reason: z.string().max(500).optional(),
  })
  .strict();

export class RefundDto extends createZodDto(refundSchema) {}
