import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const activityTemplates = pgTable(
  'activity_templates',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    nameEn: text('name_en').notNull(),
    nameSq: text('name_sq'),
    slug: text('slug').notNull().unique(),
    descriptionEn: text('description_en'),
    descriptionSq: text('description_sq'),
    contactPhone1: text('contact_phone_1'),
    contactPhone2: text('contact_phone_2'),
    category: text('category').notNull().default('workshop'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_activity_templates_slug').on(table.slug)],
);

export type ActivityTemplate = typeof activityTemplates.$inferSelect;
export type NewActivityTemplate = typeof activityTemplates.$inferInsert;
