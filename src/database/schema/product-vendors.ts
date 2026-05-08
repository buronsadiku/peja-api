import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products.js';
import { vendors } from './vendors.js';

export const productVendors = pgTable(
  'product_vendors',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'restrict' }),
    region: text('region').notNull(),
    vendorSku: text('vendor_sku').notNull(),
    costCents: integer('cost_cents').notNull(),
    leadTimeDays: integer('lead_time_days'),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_product_vendor_region').on(
      table.productId,
      table.vendorId,
      table.region,
    ),
    uniqueIndex('uq_product_vendor_primary')
      .on(table.productId, table.region)
      .where(sql`is_primary = true`),
  ],
);
