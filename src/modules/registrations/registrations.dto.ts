import { z } from 'zod';

export const createRegistrationSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  phone: z.string().min(3).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  occurrenceIds: z.array(z.string().uuid()).min(1, 'select at least one activity'),
  responsibilityAccepted: z.literal(true, {
    message: 'must accept responsibility',
  }),
  notifyIfAbsent: z.boolean().default(false),
});

export type CreateRegistrationDto = z.infer<typeof createRegistrationSchema>;
