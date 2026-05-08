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

export const gallerySectionEnum = pgEnum('gallery_section', [
  'live',
  'workshops',
  'adventures',
  'food',
]);

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
    section: gallerySectionEnum('section').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
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
  ],
);

export type GalleryImage = typeof galleryImages.$inferSelect;
export type NewGalleryImage = typeof galleryImages.$inferInsert;
