import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const products = pgTable(
  'products',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sku: text('sku').notNull().unique(),
    slug: text('slug').notNull().unique(),
    productType: text('product_type').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    basePriceCents: integer('base_price_cents').notNull(),
    currency: text('currency').notNull().default('EUR'),
    category: text('category').notNull(),
    heroImageUrl: text('hero_image_url'),
    stripePriceId: text('stripe_price_id'),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    leadTimeMinDays: integer('lead_time_min_days'),
    leadTimeMaxDays: integer('lead_time_max_days'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_products_active_sort').on(table.isActive, table.sortOrder),
    index('idx_products_category').on(table.category),
    index('idx_products_type').on(table.productType),
    check(
      'products_type_chk',
      sql`product_type IN ('gold_book','video_montage','digital_album','audio_vinyl','thank_you_cards','canvas_print')`,
    ),
    check(
      'products_category_chk',
      sql`category IN ('printed','digital','physical','gift')`,
    ),
  ],
);
