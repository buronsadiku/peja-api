import { z } from 'zod';

export const createRegistrationSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  phone: z.string().min(3).max(50),
  festivalDayId: z.string().uuid(),
  occurrenceIds: z.array(z.string().uuid()).min(1, 'select at least one activity'),
  responsibilityAccepted: z.literal(true, {
    message: 'must accept responsibility',
  }),
  notifyIfAbsent: z.boolean().default(false),
});

export type CreateRegistrationDto = z.infer<typeof createRegistrationSchema>;

export const createRegistrationBatchSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  phone: z.string().min(3).max(50),
  days: z
    .array(
      z.object({
        festivalDayId: z.string().uuid(),
        occurrenceIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .min(1, 'select at least one day'),
  responsibilityAccepted: z.literal(true, {
    message: 'must accept responsibility',
  }),
  notifyIfAbsent: z.boolean().default(false),
});

export type CreateRegistrationBatchDto = z.infer<
  typeof createRegistrationBatchSchema
>;
