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
import { orders } from './orders.js';
import { products } from './products.js';
import { productVariants } from './product-variants.js';
import { vendors } from './vendors.js';

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'restrict',
    }),
    productVariantId: uuid('product_variant_id').references(
      () => productVariants.id,
      { onDelete: 'restrict' },
    ),
    productSku: text('product_sku').notNull(),
    productName: text('product_name').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPriceCents: integer('unit_price_cents').notNull(),
    customization: jsonb('customization').notNull().default({}),
    fulfillmentStatus: text('fulfillment_status').notNull().default('pending'),
    vendorId: uuid('vendor_id').references(() => vendors.id, {
      onDelete: 'set null',
    }),
    vendorOrderRef: text('vendor_order_ref'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_order_items_order_id').on(table.orderId),
    index('idx_order_items_product_id').on(table.productId),
    index('idx_order_items_vendor_id').on(table.vendorId),
  ],
);
