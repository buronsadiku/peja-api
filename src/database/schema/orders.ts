import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { events } from './events.js';
import { users } from './users.js';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    orderType: text('order_type').notNull(),
    status: text('status').notNull().default('pending'),
    currency: text('currency').notNull().default('EUR'),
    subtotalCents: integer('subtotal_cents').notNull(),
    taxCents: integer('tax_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    paymentProvider: text('payment_provider'),
    paymentProviderId: text('payment_provider_id'),
    paymentCompletedAt: timestamp('payment_completed_at', {
      withTimezone: true,
    }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    refundAmountCents: integer('refund_amount_cents'),
    refundReason: text('refund_reason'),
    shippingName: text('shipping_name'),
    shippingAddressLine1: text('shipping_address_line1'),
    shippingAddressLine2: text('shipping_address_line2'),
    shippingCity: text('shipping_city'),
    shippingPostalCode: text('shipping_postal_code'),
    shippingCountry: text('shipping_country'),
    shippingPhone: text('shipping_phone'),
    trackingCarrier: text('tracking_carrier'),
    trackingNumber: text('tracking_number'),
    trackingUrl: text('tracking_url'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_orders_event_id').on(table.eventId),
    index('idx_orders_user_id').on(table.userId),
    index('idx_orders_status').on(table.status),
    index('idx_orders_payment_provider_id').on(table.paymentProviderId),
    index('idx_orders_created_at').on(table.createdAt),
  ],
);
