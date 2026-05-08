import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const promotions = pgTable(
  'promotions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: text('code'),
    name: text('name').notNull(),
    type: text('type').notNull(),
    value: integer('value').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    maxRedemptions: integer('max_redemptions'),
    redemptionsCount: integer('redemptions_count').notNull().default(0),
    conditionsJson: jsonb('conditions_json').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_promotions_code')
      .on(table.code)
      .where(sql`code IS NOT NULL`),
    index('idx_promotions_active_window').on(
      table.isActive,
      table.startsAt,
      table.endsAt,
    ),
    check(
      'promotions_type_chk',
      sql`type IN ('percentage','fixed_amount','free_shipping','bundle')`,
    ),
  ],
);
