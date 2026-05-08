import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const festivalDays = pgTable(
  'festival_days',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    date: date('date').notNull().unique(),
    label: text('label'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_festival_days_date').on(table.date)],
);

export type FestivalDay = typeof festivalDays.$inferSelect;
export type NewFestivalDay = typeof festivalDays.$inferInsert;
