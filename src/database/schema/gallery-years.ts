import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const galleryYears = pgTable('gallery_years', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  year: integer('year').notNull().unique(),
  label: text('label'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GalleryYear = typeof galleryYears.$inferSelect;
export type NewGalleryYear = typeof galleryYears.$inferInsert;
