import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const subscriptionSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  planId: z.string().uuid(),
  planCode: z.string(),
  planName: z.string(),
  status: z.string(),
  creditCentsRemaining: z.number().int(),
  activatedAt: z.string(),
  expiresAt: z.string().nullable(),
});

const subscriptionWrapperSchema = z.object({
  subscription: subscriptionSchema.nullable(),
});

export class SubscriptionWrapperDto extends createZodDto(
  subscriptionWrapperSchema,
) {}
