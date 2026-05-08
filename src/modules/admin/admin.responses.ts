import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { OrderDto } from '../orders/orders.responses.js';

export class AdminOrderWrapperDto {
  @ApiProperty({ type: OrderDto })
  order!: OrderDto;
}

const webhookLogSchema = z.object({
  id: z.string().uuid(),
  provider: z.string(),
  eventType: z.string(),
  status: z.string(),
  receivedAt: z.string().datetime({ offset: true }),
});

export class WebhookLogDto extends createZodDto(webhookLogSchema) {}
