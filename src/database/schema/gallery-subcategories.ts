import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const gallerySubcategories = pgTable(
  'gallery_subcategories',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    value: text('value').notNull().unique(),
    labelEn: text('label_en').notNull(),
    labelSq: text('label_sq'),
    categoryValue: text('category_value').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_gallery_subcategories_category').on(table.categoryValue),
  ],
);

export type GallerySubcategory = typeof gallerySubcategories.$inferSelect;
export type NewGallerySubcategory = typeof gallerySubcategories.$inferInsert;
