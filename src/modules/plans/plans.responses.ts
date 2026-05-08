import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const planSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  priceCents: z.number().int(),
  currency: z.string(),
  messageLimit: z.number().int().nullable(),
  storageDays: z.number().int().nullable(),
  creditCents: z.number().int(),
  sortOrder: z.number().int(),
});

export const plansListSchema = z.object({
  plans: z.array(planSchema),
});

export class PlansListDto extends createZodDto(plansListSchema) {}
