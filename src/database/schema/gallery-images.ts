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

export const galleryImages = pgTable(
  'gallery_images',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    url: text('url').notNull(),
    alt: text('alt').notNull(),
    title: text('title'),
    caption: text('caption'),
    section: text('section').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    showOnLanding: boolean('show_on_landing').notNull().default(false),
    year: integer('year').notNull().default(2026),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_gallery_images_section').on(table.section),
    index('idx_gallery_images_sort').on(table.sortOrder),
    index('idx_gallery_images_show_on_landing').on(table.showOnLanding),
    index('idx_gallery_images_year').on(table.year),
  ],
);

export type GalleryImage = typeof galleryImages.$inferSelect;
export type NewGalleryImage = typeof galleryImages.$inferInsert;
