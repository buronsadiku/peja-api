import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const sponsorTierEnum = pgEnum('sponsor_tier', [
  'gold',
  'silver',
  'bronze',
]);

export const sponsors = pgTable(
  'sponsors',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    logoUrl: text('logo_url').notNull(),
    url: text('url'),
    tier: sponsorTierEnum('tier').notNull().default('bronze'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_sponsors_tier').on(table.tier),
    index('idx_sponsors_sort').on(table.sortOrder),
  ],
);

export type Sponsor = typeof sponsors.$inferSelect;
export type NewSponsor = typeof sponsors.$inferInsert;
