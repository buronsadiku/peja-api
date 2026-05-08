import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const orderSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  orderType: z.string(),
  status: z.string(),
  currency: z.string(),
  subtotalCents: z.number(),
  totalCents: z.number(),
  paymentProvider: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export class OrderDto extends createZodDto(orderSchema) {}

const orderItemSchema = z.object({
  id: z.string().uuid(),
  productSku: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPriceCents: z.number(),
});

export class OrderItemDto extends createZodDto(orderItemSchema) {}

const orderDetailSchema = z.object({
  order: z.object({
    id: z.string().uuid(),
    orderType: z.string(),
    status: z.string(),
    totalCents: z.number(),
    items: z.array(orderItemSchema),
    tracking: z
      .object({
        carrier: z.string().nullable(),
        number: z.string().nullable(),
        url: z.string().nullable(),
      })
      .nullable(),
    createdAt: z.string().datetime({ offset: true }),
  }),
});

export class OrderDetailDto extends createZodDto(orderDetailSchema) {}

export class OrderWrapperDto {
  @ApiProperty({ type: OrderDto })
  order!: OrderDto;
}
