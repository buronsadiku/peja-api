import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { festivalDays } from './festival-days.js';

export const musicians = pgTable(
  'musicians',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    festivalDayId: uuid('festival_day_id')
      .notNull()
      .references(() => festivalDays.id, { onDelete: 'restrict' }),
    nameEn: text('name_en').notNull(),
    nameSq: text('name_sq'),
    descriptionEn: text('description_en'),
    descriptionSq: text('description_sq'),
    photoUrl: text('photo_url').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_musicians_day').on(table.festivalDayId),
    index('idx_musicians_sort').on(table.sortOrder),
    index('idx_musicians_published').on(table.isPublished),
  ],
);

export type Musician = typeof musicians.$inferSelect;
export type NewMusician = typeof musicians.$inferInsert;
