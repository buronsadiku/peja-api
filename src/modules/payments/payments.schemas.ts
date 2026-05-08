import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const checkoutSessionSchema = z
  .object({
    eventId: z.string().uuid(),
    orderType: z.enum(['plan', 'keepsake']),
    planTier: z.enum(['essentials', 'premium', 'bundle']).optional(),
    items: z
      .array(
        z.object({
          productSku: z.string(),
          productVariantId: z.string().uuid().optional(),
          quantity: z.number().int().min(1),
          customization: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .nullable()
      .optional(),
    shippingAddress: z
      .object({
        name: z.string(),
        line1: z.string(),
        city: z.string(),
        country: z.string(),
        postalCode: z.string(),
      })
      .optional(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
    promoCode: z.string().min(1).max(64).optional(),
  })
  .strict();

export class CheckoutSessionDto extends createZodDto(checkoutSessionSchema) {}
