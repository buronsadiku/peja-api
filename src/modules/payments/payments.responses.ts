import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const checkoutResultSchema = z.object({
  orderId: z.string().uuid(),
  checkoutUrl: z.string().url(),
  providerSessionId: z.string(),
});

export class CheckoutResultDto extends createZodDto(checkoutResultSchema) {}
